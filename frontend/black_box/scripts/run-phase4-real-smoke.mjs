import { chromium, request } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const UI_ORIGIN = process.env.P6_UI_ORIGIN || 'http://localhost:4173'
const API_ORIGIN = process.env.P6_API_ORIGIN || 'http://localhost:3107'
const API_BASE = `${API_ORIGIN}/api`
const scriptDir = dirname(fileURLToPath(import.meta.url))
const imageFixture = resolve(scriptDir, '../../../backend/backend/posts/src/scripts/fixtures/phase4-demo-images/black-myth-boss.jpg')
const results = []

const record = (name, details) => {
  results.push({ name, ...details })
  process.stdout.write(`[P6] ${name}: ${JSON.stringify(details)}\n`)
}
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const elapsed = (startedAt) => Date.now() - startedAt
const readStoredAuth = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('user-store') || '{}'))

const waitForSearchTerminalState = async (page, timeout = 27_000) => {
  const state = page.locator('[data-slot="search-state"]')
  await state.waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForFunction(() => {
    const value = document.querySelector('[data-slot="search-state"]')?.getAttribute('data-state')
    return value === 'success' || value === 'empty' || value === 'error'
  }, undefined, { timeout })
  return state.getAttribute('data-state')
}

const main = async () => {
  const api = await request.newContext({ baseURL: API_ORIGIN })
  const health = await api.get('/api')
  assert(health.ok(), `backend health failed: ${health.status()}`)

  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL: UI_ORIGIN,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  let chatStream = ''
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', async (response) => {
    if (response.url() !== `${API_BASE}/ai/chat`) return
    try {
      chatStream = await response.text()
    } catch {
      chatStream = ''
    }
  })

  try {
    const suffix = `${Date.now()}`.slice(-10)
    const userName = `p6qa_${suffix}`
    const password = `P6qa${suffix}X`
    const commentText = `P6 评论 ${suffix}`
    const replyText = `P6 回复 ${suffix}`
    const postTitle = `P6 Markdown 验收 ${suffix}`
    const markdown = [
      '# P6 Markdown',
      '普通单换行一',
      '普通单换行二',
      '',
      '- [x] GFM 任务',
      '- ~~删除线~~',
      '',
      '| 游戏 | 结论 |',
      '| --- | --- |',
      '| 黑神话 | 通过 |',
      '',
      '```ts',
      'const safe = true',
      '```',
    ].join('\n')

    await page.goto('/login')
    await page.getByTestId('seg-register').click()
    await page.getByTestId('auth-name').fill(userName)
    await page.getByTestId('auth-password').fill(password)
    await page.getByTestId('auth-confirm').fill(password)
    await page.getByTestId('auth-submit').click()
    await page.waitForURL(`${UI_ORIGIN}/`, { timeout: 15_000 })
    const auth = await readStoredAuth(page)
    assert(auth.state?.accessToken && auth.state?.refreshToken, 'registration did not persist tokens')
    record('register-and-login', { passed: true, userName })

    await page.getByTestId('post-item').first().waitFor({ state: 'visible' })
    const games = page.getByTestId('game-chip')
    assert((await games.count()) === 5, 'home must expose five game filters')
    await games.filter({ hasText: '原神' }).click()
    await page.waitForFunction(() => {
      const active = document.querySelector('[data-testid="game-chip"][data-state="active"]')
      return active?.textContent?.includes('原神') && document.querySelectorAll('[data-testid="post-item"]').length === 7
    })
    await games.filter({ hasText: '黑神话' }).click()
    await games.filter({ hasText: '赛博朋克' }).click()
    await page.waitForFunction(() => {
      const active = document.querySelector('[data-testid="game-chip"][data-state="active"]')
      return active?.textContent?.includes('赛博朋克') && document.querySelectorAll('[data-testid="post-item"]').length === 7
    })
    await games.filter({ hasText: '赛博朋克' }).click()
    await page.waitForTimeout(200)
    const initialPosts = await page.getByTestId('post-item').count()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForFunction((count) => document.querySelectorAll('[data-testid="post-item"]').length > count, initialPosts, { timeout: 10_000 })
    record('home-filter-and-pagination', { passed: true, initialPosts, loadedPosts: await page.getByTestId('post-item').count() })

    const staleAuth = await readStoredAuth(page)
    staleAuth.state.accessToken = 'p6-expired-access-token'
    await page.evaluate((value) => localStorage.setItem('user-store', JSON.stringify(value)), staleAuth)
    const searchStarted = Date.now()
    await page.goto('/search?q=%E7%8E%9B%E8%8E%B2%E5%A6%AE%E4%BA%9A%E6%89%93%E6%B3%95')
    const searchState = await waitForSearchTerminalState(page)
    const refreshedAuth = await readStoredAuth(page)
    assert(refreshedAuth.state?.accessToken !== 'p6-expired-access-token', '401 did not trigger token refresh')
    record('search-and-token-refresh', { passed: true, terminalState: searchState, elapsedMs: elapsed(searchStarted) })

    const postsResponse = await api.get('/api/posts?page=1&limit=1')
    assert(postsResponse.ok(), 'public post list failed')
    const postsPayload = await postsResponse.json()
    const targetId = postsPayload.items?.[0]?.id
    assert(Number.isInteger(targetId), 'no target post found')
    const beforePost = await (await api.get(`/api/posts/${targetId}`)).json()
    await page.goto(`/post/${targetId}`)
    await page.getByTestId('post-detail-page').waitFor({ state: 'visible' })
    await page.locator('[data-slot="post-body"]').waitFor({ state: 'visible' })
    const initialLikeState = await page.getByTestId('like-button').getAttribute('data-state')
    await page.getByTestId('like-button').click()
    await page.waitForFunction((state) => document.querySelector('[data-testid="like-button"]')?.getAttribute('data-state') !== state, initialLikeState)
    await page.getByTestId('like-button').click()
    await page.waitForFunction((state) => document.querySelector('[data-testid="like-button"]')?.getAttribute('data-state') === state, initialLikeState)
    await page.getByTestId('comment-input').fill(commentText)
    await page.getByTestId('comment-submit').click()
    const ownComment = page.getByTestId('comment-item').filter({ hasText: commentText })
    await ownComment.waitFor({ state: 'visible' })
    await ownComment.getByTestId('reply-button').click()
    await page.getByTestId('comment-input').fill(replyText)
    await page.getByTestId('comment-submit').click()
    await page.getByTestId('comment-reply').filter({ hasText: replyText }).waitFor({ state: 'visible' })
    await page.getByTestId('delete-comment').first().click()
    await page.getByRole('button', { name: '确认删除' }).click()
    await ownComment.waitFor({ state: 'detached' })
    const afterPost = await (await api.get(`/api/posts/${targetId}`)).json()
    assert(afterPost.viewCount === beforePost.viewCount, 'viewCount changed after detail visit')
    const commentsText = await page.locator('section[aria-labelledby="comments-heading"]').innerText()
    assert(!/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(commentsText), 'comments expose a fabricated timestamp')
    record('post-detail-social', { passed: true, postId: targetId, viewCount: afterPost.viewCount })

    await page.goto('/compose')
    await page.getByTestId('compose-page').waitFor({ state: 'visible' })
    await page.getByTestId('compose-title').fill(postTitle)
    await page.getByTestId('compose-game').click()
    await page.getByRole('option', { name: /黑神话.*悟空/ }).click()
    await page.getByTestId('compose-tag').first().click()
    await page.getByTestId('compose-content').fill(markdown)
    const previewButton = page.getByRole('button', { name: '预览' })
    if (await previewButton.isVisible()) await previewButton.click()
    await page.getByText('P6 Markdown', { exact: true }).last().waitFor({ state: 'visible' })
    await page.getByTestId('compose-image-input').setInputFiles(imageFixture)
    await page.getByRole('img', { name: '已上传的帖子配图' }).waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByTestId('compose-submit').click()
    await page.waitForURL(/\/post\/\d+$/, { timeout: 30_000 })
    const createdPostId = Number(page.url().split('/').pop())
    await page.getByText('P6 Markdown', { exact: true }).waitFor({ state: 'visible' })
    await page.getByText('普通单换行一').waitFor({ state: 'visible' })
    await page.getByText('普通单换行二').waitFor({ state: 'visible' })
    await page.getByRole('img', { name: postTitle }).waitFor({ state: 'visible' })
    record('compose-markdown-upload', { passed: true, createdPostId })

    await page.goto('/chat')
    const question = `黑神话有什么攻略？P6-${suffix}`
    await page.getByPlaceholder('Type your message...').fill(question)
    const chatStarted = Date.now()
    await page.getByRole('button', { name: 'Send' }).click()
    await page.waitForFunction(() => !document.querySelector('[data-testid="chat-loading"]'), undefined, { timeout: 58_000 })
    const chatElapsedMs = elapsed(chatStarted)
    const assistantMessages = page.locator('[data-testid="chat-message"][data-role="assistant"]')
    const chatError = await page.locator('[data-slot="chat-error"]').count()
    assert((await assistantMessages.count()) > 0 || chatError > 0, 'chat ended without response or finite error')
    const citations = await page.getByTestId('chat-citation-link').count()
    await page.locator('aside a[href="/"]').click()
    await page.locator('aside a[href="/chat"]').click()
    await page.getByText(question, { exact: true }).waitFor({ state: 'visible' })
    record('chat-real-stream-and-memory', {
      passed: true,
      elapsedMs: chatElapsedMs,
      terminal: chatError ? 'error' : 'answer',
      citations,
      streamParts: ['0:', '8:', '3:', 'd:'].filter((part) => chatStream.includes(part)),
    })

    await page.goto('/mine')
    await page.getByTestId('mine-avatar').waitFor({ state: 'visible' })
    await page.getByLabel('修改头像').click()
    await page.getByTestId('avatar-file-input').setInputFiles(imageFixture)
    await page.getByText('头像更新成功').waitFor({ state: 'visible', timeout: 15_000 })
    const avatarImage = page.getByTestId('mine-avatar').locator('img')
    await avatarImage.waitFor({ state: 'visible' })
    assert((await avatarImage.getAttribute('src'))?.startsWith(`${API_ORIGIN}/uploads/`), 'avatar does not use configured public URL')
    await page.getByRole('button', { name: '退出登录' }).click()
    await page.goto('/chat')
    await page.waitForURL(/\/login$/, { timeout: 10_000 })
    record('mine-avatar-and-logout', { passed: true })

    const unauthorized = await api.get('/api/ai/search?keyword=test')
    assert(unauthorized.status() === 401, `anonymous AI search expected 401, got ${unauthorized.status()}`)
    for (const route of ['/ai/rag', '/ai/git', '/ai/avatar']) {
      const response = await api.post(`/api${route}`, { data: {} })
      assert(response.status() === 404, `${route} expected 404, got ${response.status()}`)
    }
    const allowedCors = await request.newContext({ baseURL: API_ORIGIN, extraHTTPHeaders: { Origin: UI_ORIGIN } })
    const deniedCors = await request.newContext({ baseURL: API_ORIGIN, extraHTTPHeaders: { Origin: 'http://127.0.0.1:4173' } })
    const allowedResponse = await allowedCors.get('/api/games')
    const deniedResponse = await deniedCors.get('/api/games')
    assert(allowedResponse.headers()['access-control-allow-origin'] === UI_ORIGIN, 'configured CORS origin missing')
    assert(!deniedResponse.headers()['access-control-allow-origin'], 'unconfigured CORS origin was allowed')
    await allowedCors.dispose()
    await deniedCors.dispose()

    let rateLimitedAt = null
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const response = await api.post('/api/auth/login', { data: { name: `missing_${suffix}`, password: 'WrongPass123' } })
      if (response.status() === 429) {
        rateLimitedAt = attempt
        break
      }
    }
    assert(rateLimitedAt !== null, 'login rate limit did not produce 429')
    record('security-and-removed-surface', { passed: true, anonymousAi: 401, removedAiRoutes: 404, exactCors: true, rateLimitedAt })

    const expectedConsoleErrors = consoleErrors.filter(
      (message) => message.startsWith('Chat Error:') || message.includes('status of 401 (Unauthorized)'),
    )
    const unexpectedConsoleErrors = consoleErrors.filter((message) => !expectedConsoleErrors.includes(message))
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`)
    assert(unexpectedConsoleErrors.length === 0, `console errors: ${unexpectedConsoleErrors.join(' | ')}`)
    record('browser-runtime', { passed: true, pageErrors: pageErrors.length, expectedConsoleErrors: expectedConsoleErrors.length })
  } finally {
    await context.close()
    await browser.close()
    await api.dispose()
  }

  process.stdout.write(`${JSON.stringify({ passed: true, results }, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`[P6] FAILED: ${error.stack || error.message}\n`)
  process.exitCode = 1
})
