import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..', '..');
const manifestPath = path.join(repoRoot, 'docs', 'qa', 'phase4', 'screenshot-manifest.json');

function parseArgs(argv) {
  const values = { stage: 'current', baseUrl: 'http://127.0.0.1:5173' };
  for (const arg of argv) {
    if (arg.startsWith('--stage=')) values.stage = arg.slice('--stage='.length);
    else if (arg.startsWith('--base-url=')) values.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '');
    else throw new Error(`未知参数: ${arg}`);
  }
  if (!/^[a-z0-9-]+$/i.test(values.stage)) throw new Error(`非法 stage: ${values.stage}`);
  const parsed = new URL(values.baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('base URL 仅允许 http/https');
  return values;
}

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'phase4-baseline-token',
    refreshToken: 'phase4-baseline-refresh',
    user: { id: 2, name: '爱睡觉的旅人', avatar: '' },
    isLogin: true,
  },
  version: 0,
});

const SEARCH_STORE = JSON.stringify({
  state: { history: ['玛莲妮亚打法', '黑神话新手攻略', '原神抽卡规划'] },
  version: 0,
});

const TAGS = [
  { id: 1, name: '资讯' },
  { id: 2, name: '攻略' },
  { id: 3, name: '求助' },
  { id: 4, name: '评测' },
  { id: 5, name: '活动' },
];

const GAMES = [
  { id: 1, name: '黑神话:悟空' },
  { id: 2, name: '原神' },
  { id: 3, name: '艾尔登法环' },
  { id: 4, name: '塞尔达传说' },
  { id: 5, name: '赛博朋克2077' },
];

const cover = (label, from, to) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/><circle cx="760" cy="110" r="170" fill="white" opacity=".12"/><text x="64" y="450" fill="white" font-family="sans-serif" font-size="52" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const POSTS = [
  {
    id: 1,
    title: '黑神话悟空：虎先锋招式拆解与稳健打法',
    brief: '从起手动作、闪避方向到棍势管理，整理一套适合首次挑战的稳定流程。',
    content: '# 虎先锋稳健打法\n虎先锋的连续爪击有明确起手动作。\n保持中距离观察，第二段结束后再反击。\n\n## 处理顺序\n- [x] 保持中距离\n- [ ] 第二段后反击\n\n| 阶段 | 建议 |\n| --- | --- |\n| 起手 | 观察爪击 |\n| 收招 | 安全反击 |',
    publishedAt: '2026-07-01T10:00:00.000Z',
    totalLikes: 128,
    totalComments: 3,
    viewCount: 968,
    likedByMe: false,
    tags: ['攻略'],
    thumbnail: cover('黑神话:悟空', '#171717', '#e85d24'),
    pics: [],
    user: { id: 8, name: '星海攻略组', avatar: '' },
  },
  {
    id: 2,
    title: '原神新手抽卡：角色与武器池资源规划',
    brief: '按零氪和月卡两种预算，说明原石储备、保底继承与队伍补强优先级。',
    content: '先明确队伍缺口，再决定是否投入武器池。',
    publishedAt: '2026-06-28T08:30:00.000Z',
    totalLikes: 86,
    totalComments: 12,
    viewCount: 642,
    likedByMe: true,
    tags: ['攻略', '求助'],
    thumbnail: cover('原神', '#2b6cb0', '#68d391'),
    pics: [],
    user: { id: 9, name: '爱睡觉的旅人', avatar: '' },
  },
  {
    id: 3,
    title: '玛莲妮亚二阶段处理：水鸟乱舞站位笔记',
    brief: '记录近身和中距离两种水鸟乱舞处理方式，并标出二阶段常见贪刀点。',
    content: '水鸟乱舞前先拉开距离。\n二阶段落花后不要立刻贴身。',
    publishedAt: '2026-06-25T14:20:00.000Z',
    totalLikes: 203,
    totalComments: 18,
    viewCount: 1512,
    likedByMe: false,
    tags: ['攻略', '评测'],
    thumbnail: cover('艾尔登法环', '#312e81', '#be123c'),
    pics: [],
    user: { id: 8, name: '星海攻略组', avatar: '' },
  },
  {
    id: 4,
    title: '王国之泪究极手：三种实用载具搭建思路',
    brief: '从低耗材滑翔车到地面运输平台，整理容易复现的连接顺序。',
    content: '先确定重心，再处理操纵杆位置。',
    publishedAt: '2026-06-20T09:15:00.000Z',
    totalLikes: 74,
    totalComments: 6,
    viewCount: 534,
    likedByMe: false,
    tags: ['资讯'],
    thumbnail: cover('塞尔达传说', '#166534', '#ca8a04'),
    pics: [],
    user: { id: 9, name: '爱睡觉的旅人', avatar: '' },
  },
];

const COMMENTS = [
  {
    id: 11,
    content: '第二段结束再反击确实稳定，感谢整理。',
    user: { id: 3, name: '云端玩家', avatar: '' },
    replies: [
      { id: 12, content: '补充：石化结束后也有一个安全窗口。', user: { id: 4, name: '像素旅人', avatar: '' }, replies: [] },
    ],
  },
  { id: 13, content: '能否再补一版低等级装备思路？', user: { id: 5, name: '北境余火', avatar: '' }, replies: [] },
];

const stableImageSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#27272a"/><rect x="36" y="36" width="888" height="468" rx="20" fill="#ea580c" opacity=".72"/><text x="64" y="450" fill="white" font-family="sans-serif" font-size="48" font-weight="700">GAME COMMUNITY</text></svg>';

async function mockRoutes(page) {
  await page.route('https://images.unsplash.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: stableImageSvg,
  }));

  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const apiPath = url.pathname;

    if (apiPath === '/api/posts/tags') return route.fulfill({ json: TAGS });
    if (apiPath === '/api/games') return route.fulfill({ json: GAMES });
    if (apiPath === '/api/ai/search') return route.fulfill({ json: { code: 0, data: POSTS.slice(0, 3) } });
    if (/^\/api\/posts\/\d+\/comments$/.test(apiPath)) return route.fulfill({ json: { items: COMMENTS } });
    if (/^\/api\/posts\/\d+$/.test(apiPath)) {
      const id = Number(apiPath.split('/').pop());
      return route.fulfill({ json: POSTS.find((post) => post.id === id) ?? POSTS[0] });
    }
    if (apiPath === '/api/posts') {
      const pageNumber = Number(url.searchParams.get('page') ?? '1');
      const items = pageNumber === 1 ? POSTS : [];
      return route.fulfill({ json: { items, total: POSTS.length } });
    }
    return route.fulfill({ status: 200, json: { items: [], data: [], total: 0 } });
  });
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
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error(`远程 base URL 不可由脚本启动: ${baseUrl}`);
  }
  const viteBin = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteBin, '--host', parsed.hostname, '--port', parsed.port || '5173', '--strictPort'], {
    cwd: frontendRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  await waitForServer(baseUrl, child);
  return { child, reused: false };
}

function anchorLocator(page, anchor) {
  if (anchor.kind === 'testid') return page.getByTestId(anchor.value).first();
  if (anchor.kind === 'placeholder') return page.getByPlaceholder(anchor.value).first();
  throw new Error(`未知 anchor kind: ${anchor.kind}`);
}

async function waitForVisualStability(page, entry) {
  await anchorLocator(page, entry.anchor).waitFor({ state: 'visible', timeout: 15_000 });
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

async function capture() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const expected = manifest.viewports.length * manifest.pages.length;
  if (expected !== 28) throw new Error(`manifest 必须为 28 张，当前 ${expected}`);

  const server = await ensureServer(options.baseUrl);
  const browser = await chromium.launch();
  const outputRoot = path.join(repoRoot, manifest.outputRoot, options.stage);
  const written = new Set();

  try {
    for (const viewport of manifest.viewports) {
      for (const entry of manifest.pages) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: 'reduce',
          colorScheme: 'light',
          locale: 'zh-CN',
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await page.addInitScript(({ authStore, searchStore, authenticated }) => {
          localStorage.clear();
          sessionStorage.clear();
          if (authenticated) localStorage.setItem('user-store', authStore);
          localStorage.setItem('search-store', searchStore);
          const nativeSetTimeout = window.setTimeout.bind(window);
          window.setTimeout = ((handler, timeout = 0, ...args) => {
            if (timeout >= 2500) return 0;
            return nativeSetTimeout(handler, timeout, ...args);
          });
        }, { authStore: AUTH_STORE, searchStore: SEARCH_STORE, authenticated: entry.auth });

        await mockRoutes(page);
        await page.goto(`${options.baseUrl}${entry.path}`, { waitUntil: 'domcontentloaded' });
        await waitForVisualStability(page, entry);

        if (pageErrors.length > 0) throw new Error(`${entry.key} 页面错误: ${pageErrors.join(' | ')}`);
        if (entry.key === 'login' && await page.getByTestId('app-shell').count()) {
          throw new Error('Login 不应渲染 App Shell');
        }
        if (entry.key !== 'login' && !await page.getByTestId('app-shell').count()) {
          throw new Error(`${entry.key} 未渲染 App Shell`);
        }

        const targetDir = path.join(outputRoot, viewport.key);
        const target = path.join(targetDir, `${entry.key}.png`);
        if (written.has(target)) throw new Error(`重复输出: ${target}`);
        await mkdir(targetDir, { recursive: true });
        await page.screenshot({ path: target, animations: 'disabled', fullPage: false });
        written.add(target);
        console.log(`[${written.size}/${expected}] ${path.relative(repoRoot, target)}`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (server.child) server.child.kill();
  }

  if (written.size !== expected) throw new Error(`截图数量错误: ${written.size}/${expected}`);
  console.log(`完成: ${written.size}/${expected}，stage=${options.stage}，server=${server.reused ? 'reused' : 'started'}`);
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
