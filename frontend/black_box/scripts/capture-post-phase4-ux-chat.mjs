import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(frontendRoot, '..', '..')

const VIEWPORTS = [
  { key: '1440x1000', width: 1440, height: 1000 },
  { key: '900x1000', width: 900, height: 1000 },
  { key: '390x844', width: 390, height: 844 },
  { key: '320x740', width: 320, height: 740 },
]

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'o1-qa-token',
    refreshToken: 'o1-qa-refresh',
    user: { id: 2, name: '爱睡觉的旅人', avatar: '' },
    isLogin: true,
  },
  version: 0,
})

const CITATION = { id: 102, title: '黑神话悟空：虎先锋招式拆解与稳健打法' }
const USER_SOURCE = '**用户原文** [链接](/post/1)'
const LONG_CODE = `const strategy = "${'保持距离观察招式再反击'.repeat(18)}"`
const LONG_TABLE_TOKEN = `StrategyToken_${'A'.repeat(160)}`
const MARKDOWN = [
  '# 黑神话攻略',
  '',
  '## 虎先锋处理顺序',
  '',
  '先观察 **起手动作**，再按下面的顺序处理。',
  '',
  '1. 保持中距离',
  '2. 第二段结束后反击',
  '',
  '> 宁可少打一下，也不要在连续爪击中贪刀。',
  '',
  '[站内详情](/post/102) · [外部资料](https://example.com)',
  '',
  '```ts',
  LONG_CODE,
  '```',
  '',
  '| 阶段 | 动作 | 风险 | 备注 |',
  '| --- | --- | --- | --- |',
  `| 起手 | ${LONG_TABLE_TOKEN} | 连续爪击 | 等待完整收招后再反击，避免提前出手 |`,
  '',
  '<script>window.__o1_xss = true</script>',
  '[危险链接](javascript:alert(1))',
].join('\n')

function parseArgs(argv) {
  const options = { baseUrl: 'http://localhost:5173' }
  for (const arg of argv) {
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '')
    } else {
      throw new Error(`未知参数: ${arg}`)
    }
  }
  const parsed = new URL(options.baseUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('base URL 仅允许 http/https')
  return options
}

async function isServerReady(baseUrl) {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) })
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(baseUrl, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Vite 提前退出: ${child.exitCode}`)
    if (await isServerReady(baseUrl)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`等待 Vite 超时: ${baseUrl}`)
}

async function ensureServer(baseUrl) {
  if (await isServerReady(baseUrl)) return { child: null, reused: true }
  const parsed = new URL(baseUrl)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error(`远程 base URL 不可由脚本启动: ${baseUrl}`)
  }
  const viteBin = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(
    process.execPath,
    [viteBin, '--host', parsed.hostname, '--port', parsed.port || '5173', '--strictPort'],
    { cwd: frontendRoot, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
  )
  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`))
  await waitForServer(baseUrl, child)
  return { child, reused: false }
}

function chatStreamBody() {
  const splitPoints = [
    '# 黑神',
    MARKDOWN.slice('# 黑神'.length, 48),
    MARKDOWN.slice(48, 132),
    MARKDOWN.slice(132),
  ]
  return [
    `8:${JSON.stringify([CITATION])}`,
    ...splitPoints.map((chunk) => `0:${JSON.stringify(chunk)}`),
    `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}`,
  ].join('\n') + '\n'
}

async function installMocks(page) {
  await page.route('http://localhost:3000/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], data: [], total: 0 }),
    })
  })
  await page.route('**/api/ai/chat', (route) => {
    return route.fulfill({
      status: 200,
      headers: { 'x-vercel-ai-data-stream': 'v1' },
      contentType: 'text/plain; charset=utf-8',
      body: chatStreamBody(),
    })
  })
}

async function inspectCompletedState(page, viewportKey) {
  const assistant = page.locator('[data-testid="chat-message"][data-role="assistant"]').last()
  const user = page.locator('[data-testid="chat-message"][data-role="user"]').last()
  const markdown = assistant.locator('[data-slot="markdown-renderer"][data-variant="chat"]')
  const citation = assistant.getByTestId('chat-citation-link').first()

  await markdown.locator('h1').waitFor()
  await markdown.locator('h2').waitFor()
  await citation.waitFor()
  await page.evaluate(async () => document.fonts.ready)

  const result = await page.evaluate(() => {
    const assistantElement = document.querySelector('[data-testid="chat-message"][data-role="assistant"]')
    const markdownElement = assistantElement?.querySelector('[data-slot="markdown-renderer"]')
    const citationElement = assistantElement?.querySelector('[data-testid="chat-citations"]')
    const tableScroller = markdownElement?.querySelector('table')?.parentElement
    const pre = markdownElement?.querySelector('pre')
    const userElement = document.querySelector('[data-testid="chat-message"][data-role="user"]')

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      markdownBeforeCitation: Boolean(
        markdownElement && citationElement &&
        (markdownElement.compareDocumentPosition(citationElement) & Node.DOCUMENT_POSITION_FOLLOWING)
      ),
      userText: userElement?.textContent ?? '',
      userRichNodes: userElement?.querySelectorAll('strong, a, [data-slot="markdown-renderer"]').length ?? -1,
      dangerousNodes: markdownElement?.querySelectorAll('script, iframe, [onerror], [onclick]').length ?? -1,
      dangerousLinks: markdownElement?.querySelectorAll('a[href^="javascript:"], a[href^="data:"]').length ?? -1,
      table: tableScroller ? {
        clientWidth: tableScroller.clientWidth,
        scrollWidth: tableScroller.scrollWidth,
        overflowX: getComputedStyle(tableScroller).overflowX,
      } : null,
      pre: pre ? {
        clientWidth: pre.clientWidth,
        scrollWidth: pre.scrollWidth,
        overflowX: getComputedStyle(pre).overflowX,
      } : null,
      xssExecuted: Boolean(window.__o1_xss),
    }
  })

  if (result.documentScrollWidth !== result.viewportWidth) {
    throw new Error(`${viewportKey}: 页面横向溢出 ${result.documentScrollWidth}/${result.viewportWidth}`)
  }
  if (!result.markdownBeforeCitation) throw new Error(`${viewportKey}: citation 未位于 Markdown 正文之后`)
  if (result.userText !== USER_SOURCE || result.userRichNodes !== 0) {
    throw new Error(`${viewportKey}: user 消息未保持纯文本`)
  }
  if (result.dangerousNodes !== 0 || result.dangerousLinks !== 0 || result.xssExecuted) {
    throw new Error(`${viewportKey}: XSS 安全检查失败`)
  }
  if (!result.table || result.table.overflowX !== 'auto' || result.table.scrollWidth <= result.table.clientWidth) {
    throw new Error(`${viewportKey}: 宽表格没有形成局部横滚`)
  }
  if (!result.pre || result.pre.overflowX !== 'auto' || result.pre.scrollWidth <= result.pre.clientWidth) {
    throw new Error(`${viewportKey}: 长代码没有形成局部横滚`)
  }

  return result
}

async function capture() {
  const options = parseArgs(process.argv.slice(2))
  const server = await ensureServer(options.baseUrl)
  const browser = await chromium.launch()
  const outputRoot = path.join(
    repoRoot,
    'docs',
    'qa',
    'post-phase4-ux-optimization',
    'screenshots',
    'o1-chat'
  )

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
        colorScheme: 'light',
        locale: 'zh-CN',
      })
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.addInitScript((authStore) => {
        localStorage.clear()
        sessionStorage.clear()
        localStorage.setItem('user-store', authStore)
      }, AUTH_STORE)
      await installMocks(page)
      await page.goto(`${options.baseUrl}/chat`, { waitUntil: 'domcontentloaded' })
      await page.getByPlaceholder('Type your message...').fill(USER_SOURCE)
      await page.getByRole('button', { name: 'Send' }).click()

      const result = await inspectCompletedState(page, viewport.key)
      if (pageErrors.length > 0) throw new Error(`${viewport.key}: ${pageErrors.join(' | ')}`)

      const targetDir = path.join(outputRoot, viewport.key)
      const target = path.join(targetDir, 'chat-markdown.png')
      await mkdir(targetDir, { recursive: true })
      await page.screenshot({ path: target, animations: 'disabled', fullPage: false })
      console.log(`[${viewport.key}] ${path.relative(repoRoot, target)} ${JSON.stringify(result)}`)
      await context.close()
    }
  } finally {
    await browser.close()
    if (server.child) server.child.kill()
  }

  console.log(`完成: 4/4，server=${server.reused ? 'reused' : 'started'}`)
}

capture().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
