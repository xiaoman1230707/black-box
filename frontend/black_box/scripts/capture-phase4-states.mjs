import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(frontendRoot, '..', '..')
const outputRoot = path.join(repoRoot, 'docs', 'qa', 'phase4', 'screenshots', 'p6-states')
const baseUrl = 'http://127.0.0.1:5173'
const imageFixture = path.resolve(frontendRoot, '../../backend/backend/posts/src/scripts/fixtures/phase4-demo-images/black-myth-boss.jpg')

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'phase4-state-token',
    refreshToken: 'phase4-state-refresh',
    user: { id: 2, name: '爱睡觉的旅人', avatar: '' },
    isLogin: true,
  },
  version: 0,
})

const TAGS = [
  { id: 1, name: '资讯' },
  { id: 2, name: '攻略' },
  { id: 3, name: '求助' },
  { id: 4, name: '评测' },
  { id: 5, name: '活动' },
]
const GAMES = [
  { id: 1, name: '黑神话:悟空' },
  { id: 2, name: '原神' },
  { id: 3, name: '艾尔登法环' },
  { id: 4, name: '塞尔达传说' },
  { id: 5, name: '赛博朋克2077' },
]
const POST = {
  id: 1,
  title: '黑神话悟空：虎先锋招式拆解与稳健打法',
  brief: '从起手动作、闪避方向到棍势管理，整理一套适合首次挑战的稳定流程。',
  content: '# 虎先锋稳健打法\n普通单换行一\n普通单换行二\n\n- [x] 保持中距离\n- ~~不要贪刀~~\n\n| 阶段 | 建议 |\n| --- | --- |\n| 起手 | 观察爪击 |\n| 收招 | 安全反击 |\n\n```ts\nconst safe = true\n```',
  publishedAt: '2026-07-01T10:00:00.000Z',
  totalLikes: 128,
  totalComments: 2,
  viewCount: 968,
  likedByMe: false,
  tags: ['攻略'],
  thumbnail: '',
  pics: [],
  user: { id: 8, name: '星海攻略组', avatar: '' },
}
const COMMENTS = [{
  id: 11,
  content: '这是一条可删除的本人评论，用于检查 Dialog、焦点和移动底栏关系。',
  user: { id: 2, name: '爱睡觉的旅人', avatar: '' },
  replies: [],
}]

const STATES = [
  { key: 'home-loading', path: '/', auth: true, anchor: '[data-slot="home-loading"]' },
  { key: 'home-empty', path: '/', auth: true, anchor: '[data-testid="home-empty"]' },
  { key: 'search-loading', path: '/search?q=玛莲妮亚打法', auth: true, anchor: '[data-slot="search-state"][data-state="loading"]' },
  { key: 'search-empty', path: '/search?q=冷门关键词', auth: true, anchor: '[data-slot="search-state"][data-state="empty"]' },
  { key: 'search-error', path: '/search?q=服务失败', auth: true, anchor: '[data-slot="search-state"][data-state="error"]' },
  { key: 'post-long-markdown', path: '/post/1', auth: true, anchor: '[data-slot="post-body"]' },
  { key: 'post-delete-dialog', path: '/post/1', auth: true, anchor: '[role="alertdialog"]', prepare: 'delete-dialog' },
  { key: 'compose-preview', path: '/compose', auth: true, anchor: '[data-slot="markdown-editor"]', prepare: 'compose-preview' },
  { key: 'compose-uploading', path: '/compose', auth: true, anchor: '[data-testid="compose-page"]', prepare: 'compose-uploading' },
  { key: 'chat-typing', path: '/chat', auth: true, anchor: '[data-slot="chat-flow"]', prepare: 'chat-typing' },
  { key: 'chat-citations', path: '/chat', auth: true, anchor: '[data-testid="chat-citations"]', prepare: 'chat-citations' },
  { key: 'mine-drawer', path: '/mine', auth: true, anchor: '[role="dialog"]', prepare: 'mine-drawer' },
  { key: 'login-register', path: '/login', auth: false, anchor: '[data-testid="auth-confirm"]', prepare: 'login-register' },
  { key: 'login-error', path: '/login', auth: false, anchor: '[data-testid="auth-error"]', prepare: 'login-error' },
]
const VIEWPORTS = [
  { key: '1440x1000', width: 1440, height: 1000 },
  { key: '390x844', width: 390, height: 844 },
]

const chatBody = [
  `8:${JSON.stringify([{ id: 1, title: POST.title }])}`,
  `0:${JSON.stringify('可以先观察虎先锋的起手动作，再选择安全窗口反击。')}`,
  `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}`,
].join('\n') + '\n'

async function mockRoutes(page, state) {
  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const apiPath = url.pathname

    if (apiPath === '/api/posts/tags') return route.fulfill({ json: TAGS })
    if (apiPath === '/api/games') return route.fulfill({ json: GAMES })
    if (apiPath === '/api/posts') {
      if (state.key === 'home-loading') return new Promise(() => {})
      const items = state.key === 'home-empty' ? [] : [POST]
      return route.fulfill({ json: { items, total: items.length } })
    }
    if (apiPath === '/api/ai/search') {
      if (state.key === 'search-loading') return new Promise(() => {})
      if (state.key === 'search-error') return route.fulfill({ status: 503, json: { message: '暂时无法搜索' } })
      return route.fulfill({ json: { code: 0, data: [] } })
    }
    if (apiPath === '/api/ai/chat') {
      return route.fulfill({
        status: 200,
        headers: { 'x-vercel-ai-data-stream': 'v1' },
        contentType: 'text/plain; charset=utf-8',
        body: chatBody,
      })
    }
    if (apiPath === '/api/auth/login') return route.fulfill({ status: 401, json: { message: '用户名或密码错误' } })
    if (apiPath === '/api/upload/image' && state.key === 'compose-uploading') return new Promise(() => {})
    if (/^\/api\/posts\/\d+\/comments$/.test(apiPath)) return route.fulfill({ json: { items: COMMENTS } })
    if (/^\/api\/posts\/\d+$/.test(apiPath)) return route.fulfill({ json: POST })
    return route.fulfill({ status: 200, json: { items: [], data: [], total: 0 } })
  })
}

async function prepareState(page, state, viewport) {
  if (state.prepare === 'delete-dialog') {
    await page.getByTestId('delete-comment').click()
  } else if (state.prepare === 'compose-preview') {
    await page.getByTestId('compose-content').fill(POST.content)
    const preview = page.getByRole('button', { name: '预览' })
    if (await preview.isVisible()) await preview.click()
    await page.getByText('虎先锋稳健打法', { exact: true }).last().waitFor({ state: 'visible' })
  } else if (state.prepare === 'compose-uploading') {
    await page.getByTestId('compose-image-input').setInputFiles(imageFixture)
    await page.getByTestId('compose-submit').waitFor({ state: 'visible' })
  } else if (state.prepare === 'chat-typing') {
    await page.getByPlaceholder('Type your message...').fill('黑神话虎先锋应该怎么打？')
  } else if (state.prepare === 'chat-citations') {
    await page.getByPlaceholder('Type your message...').fill('黑神话有什么攻略？')
    await page.getByRole('button', { name: 'Send' }).click()
  } else if (state.prepare === 'mine-drawer') {
    await page.getByLabel('修改头像').click()
  } else if (state.prepare === 'login-register') {
    await page.getByTestId('seg-register').click()
    await page.getByTestId('auth-name').fill('长名字玩家用于移动端换行检查')
  } else if (state.prepare === 'login-error') {
    await page.getByTestId('seg-register').click()
    await page.getByTestId('auth-name').fill('错误态测试用户')
    await page.getByTestId('auth-password').fill('WrongPassword123')
    await page.getByTestId('auth-confirm').fill('DifferentPassword123')
    await page.getByTestId('auth-submit').click()
  }

  try {
    await page.locator(state.anchor).first().waitFor({ state: 'visible', timeout: 15_000 })
  } catch (error) {
    const bodyText = (await page.locator('body').innerText()).slice(0, 500)
    const diagnostics = await page.locator('[data-slot], [data-state]').evaluateAll((nodes) =>
      nodes.slice(0, 40).map((node) => ({
        slot: node.getAttribute('data-slot'),
        state: node.getAttribute('data-state'),
      })),
    )
    throw new Error(`${state.key} anchor missing at ${page.url()}; body=${JSON.stringify(bodyText)}; nodes=${JSON.stringify(diagnostics)}`, { cause: error })
  }
  await page.evaluate(async () => document.fonts.ready)
  console.log(`[state] ${viewport.key}/${state.key}`)
}

async function serverReady() {
  try {
    return (await fetch(baseUrl, { signal: AbortSignal.timeout(1500) })).ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await serverReady()) return null
  const viteBin = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: frontendRoot,
    env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:3000/api' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`))
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite 提前退出，exit=${child.exitCode}`)
    if (await serverReady()) return child
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('等待 Vite 超时')
}

async function capture() {
  const child = await ensureServer()
  const browser = await chromium.launch()
  let written = 0
  try {
    for (const viewport of VIEWPORTS) {
      for (const state of STATES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: 'reduce',
          colorScheme: 'light',
          locale: 'zh-CN',
        })
        const page = await context.newPage()
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.addInitScript(({ auth, authenticated }) => {
          localStorage.clear()
          sessionStorage.clear()
          if (authenticated) localStorage.setItem('user-store', auth)
        }, { auth: AUTH_STORE, authenticated: state.auth })
        await mockRoutes(page, state)
        await page.goto(`${baseUrl}${state.path}`, { waitUntil: 'domcontentloaded' })
        await prepareState(page, state, viewport)
        if (pageErrors.length) throw new Error(`${state.key}: ${pageErrors.join(' | ')}`)
        const targetDir = path.join(outputRoot, viewport.key)
        await mkdir(targetDir, { recursive: true })
        await page.screenshot({ path: path.join(targetDir, `${state.key}.png`), animations: 'disabled', fullPage: false })
        written += 1
        await context.close()
      }
    }
  } finally {
    await browser.close()
    if (child) child.kill()
  }
  if (written !== 28) throw new Error(`截图数量错误: ${written}/28`)
  console.log(`完成: ${written}/28`)
}

capture().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
