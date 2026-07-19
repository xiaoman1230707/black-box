import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const outputRoot = path.join(repoRoot, 'docs', 'qa', 'post-phase4-personal-content', 'screenshots');

const VIEWPORTS = [
  { key: '1440x1000', width: 1440, height: 1000 },
  { key: '900x1000', width: 900, height: 1000 },
  { key: '390x844', width: 390, height: 844 },
  { key: '320x740', width: 320, height: 740 },
];

const DEFAULT_PAGES = [
  { key: 'mine', path: '/mine', anchor: 'mine-posts-link' },
  { key: 'my-posts', path: '/mine/posts', anchor: 'personal-post-list' },
  { key: 'my-likes', path: '/mine/likes', anchor: 'personal-post-list' },
];

const SPECIAL_STATES = [
  { key: 'my-posts-empty', path: '/mine/posts', mode: 'mine-empty', anchor: 'personal-list-empty' },
  {
    key: 'my-likes-error',
    path: '/mine/likes',
    mode: 'liked-error',
    anchor: 'personal-list-error',
    allowExpectedHttpError: true,
  },
  {
    key: 'my-likes-load-more-error',
    path: '/mine/likes',
    mode: 'liked-load-more-error',
    anchor: 'personal-list-load-more-error',
    revealLoadMore: true,
    allowExpectedHttpError: true,
  },
];

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'o2-screenshot-access',
    refreshToken: 'o2-screenshot-refresh',
    user: { id: 7, name: '一位名字很长的验收玩家', avatar: '' },
    isLogin: true,
  },
  version: 0,
});

function cover(label, background) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="${background}"/><rect x="32" y="32" width="896" height="476" fill="none" stroke="white" stroke-width="8"/><text x="64" y="450" fill="white" font-family="sans-serif" font-size="52" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const POSTS = Array.from({ length: 12 }, (_, index) => {
  const id = 201 + index;
  const published = index % 2 === 0;
  return {
    id,
    title: index === 0
      ? '这是一篇用于验证窄屏长标题换行、卡片边界与详情跳转的完整攻略帖子'
      : `演示帖子 ${id}：${published ? '稳定打法与资源规划' : '社区收藏内容整理'}`,
    brief: index === 1
      ? '这段摘要包含较长的连续内容，用于确认移动端不会撑宽页面，并且仍然沿用唯一 PostItem。'
      : '复用现有帖子卡片、统计、作者与图片失败回退契约。',
    content: '# 演示正文\n\n用于稳定截图。',
    publishedAt: `2026-07-${String(18 - (index % 9)).padStart(2, '0')}T08:00:00.000Z`,
    totalLikes: 18 + index,
    totalComments: index % 5,
    viewCount: 320 + index * 17,
    likedByMe: !published,
    tags: published ? ['攻略'] : ['评测', '资讯'],
    thumbnail: index === 2 ? '' : cover(`POST ${id}`, index % 2 ? '#2563eb' : '#e85d24'),
    pics: [],
    user: {
      id: published ? 7 : 9,
      name: index === 1 ? '一位名字同样很长的社区内容作者' : published ? '验收玩家' : '星海攻略组',
      avatar: '',
    },
  };
});

function parseArgs(argv) {
  const options = { baseUrl: 'http://localhost:5173' };
  for (const arg of argv) {
    if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '');
    else throw new Error(`未知参数: ${arg}`);
  }
  const parsed = new URL(options.baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('base URL 仅允许 http/https');
  return options;
}

async function isServerReady(baseUrl) {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite 提前退出，exit=${child.exitCode}`);
    if (await isServerReady(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`等待 Vite 超时: ${baseUrl}`);
}

async function ensureServer(baseUrl) {
  if (await isServerReady(baseUrl)) return { child: null, reused: true };
  const parsed = new URL(baseUrl);
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error(`远程 base URL 不可由脚本启动: ${baseUrl}`);
  }

  const viteBin = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', parsed.hostname, '--port', parsed.port || '5173', '--strictPort'],
    {
      cwd: frontendRoot,
      env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:3000/api' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  await waitForServer(baseUrl, child);
  return { child, reused: false };
}

function responseFor(pathname, searchParams, mode) {
  if (pathname === '/api/posts/mine') {
    if (mode === 'mine-empty') return { status: 200, body: { items: [], total: 0 } };
    const page = Number(searchParams.get('page') ?? '1');
    const items = page === 1 ? POSTS.filter((post) => post.user.id === 7).slice(0, 4) : [];
    return { status: 200, body: { items, total: items.length } };
  }

  if (pathname === '/api/posts/liked') {
    if (mode === 'liked-error') return { status: 500, body: { message: '稳定首屏失败' } };
    const page = Number(searchParams.get('page') ?? '1');
    const firstPage = POSTS.slice(0, 4).map((post) => ({ ...post, likedByMe: true }));
    if (mode === 'liked-load-more-error') {
      if (page === 1) return { status: 200, body: { items: firstPage, total: 6 } };
      return { status: 500, body: { message: '稳定翻页失败' } };
    }
    return { status: 200, body: { items: firstPage, total: firstPage.length } };
  }

  if (/^\/api\/posts\/\d+$/.test(pathname)) {
    const id = Number(pathname.split('/').pop());
    return { status: 200, body: POSTS.find((post) => post.id === id) ?? POSTS[0] };
  }

  return { status: 200, body: { items: [], total: 0 } };
}

async function preparePage(context, mode) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.addInitScript((authStore) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user-store', authStore);
  }, AUTH_STORE);

  await page.route('http://localhost:3000/**', async (route) => {
    const url = new URL(route.request().url());
    const response = responseFor(url.pathname, url.searchParams, mode);
    await route.fulfill({ status: response.status, json: response.body });
  });

  return { page, errors };
}

async function waitForStableState(page, anchor, revealLoadMore) {
  if (revealLoadMore) {
    await page.getByTestId('personal-post-list').waitFor({ state: 'visible', timeout: 15_000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  }
  const anchorElement = page.getByTestId(anchor);
  await anchorElement.waitFor({ state: 'visible', timeout: 15_000 });
  if (revealLoadMore) {
    await anchorElement.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

async function captureEntry(browser, baseUrl, viewport, entry, group, metrics) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    colorScheme: 'light',
    locale: 'zh-CN',
  });
  const { page, errors } = await preparePage(context, entry.mode ?? 'default');

  try {
    await page.goto(`${baseUrl}${entry.path}`, { waitUntil: 'domcontentloaded' });
    await waitForStableState(page, entry.anchor, entry.revealLoadMore === true);
    const unexpectedErrors = errors.filter((message) => !(
      entry.allowExpectedHttpError
      && message.includes('Failed to load resource: the server responded with a status of 500')
    ));
    if (unexpectedErrors.length > 0) {
      throw new Error(`${entry.key} 页面错误: ${unexpectedErrors.join(' | ')}`);
    }

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    metrics.push({ group, viewport: viewport.key, page: entry.key, ...layout });

    const targetDir = path.join(outputRoot, group, viewport.key);
    await mkdir(targetDir, { recursive: true });
    const target = path.join(targetDir, `${entry.key}.png`);
    await page.screenshot({ path: target, animations: 'disabled', fullPage: false });
    console.log(`${group}/${viewport.key}/${entry.key}.png scroll=${layout.scrollWidth}/${layout.clientWidth}`);
  } finally {
    await context.close();
  }
}

async function capture() {
  const options = parseArgs(process.argv.slice(2));
  const server = await ensureServer(options.baseUrl);
  const browser = await chromium.launch();
  const metrics = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const entry of DEFAULT_PAGES) {
        await captureEntry(browser, options.baseUrl, viewport, entry, 'default', metrics);
      }
    }

    const mobileViewport = VIEWPORTS.find((viewport) => viewport.key === '390x844');
    for (const entry of SPECIAL_STATES) {
      await captureEntry(browser, options.baseUrl, mobileViewport, entry, 'states', metrics);
    }

    await writeFile(
      path.join(outputRoot, 'layout-metrics.json'),
      `${JSON.stringify(metrics, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await browser.close();
    if (server.child) server.child.kill();
  }

  console.log(`完成: default=12/12, states=3/3, server=${server.reused ? 'reused' : 'started'}`);
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
