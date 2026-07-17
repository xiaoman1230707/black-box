import { test, expect, type Page } from '@playwright/test';

// 三期·§五 游戏 AI 助手 chat e2e(已人工验收的功能)。
// 策略同 social.spec:前端路由拦截 mock 后端的 data stream(SSE)响应,不依赖真实 AI / 后端 / 数据库。
// 只测「稳定可断言」项(承 e2e 纪律):
//   ① 登录后 chat 请求带 Authorization(§五 修 §四 401)+ 流式回答渲染;
//   ② 引用 chip 渲染 + 可点跳 /post/:id(§5.4 annotation→Link chip);
//   ③ 对话 store 保持(发消息→离开→回 chat→消息还在,§5.5 useChatStore)。
// 不测(归人工 / 已代验):引用「对版」准确性(语义匹配 / 阈值效果)、流式回答内容(AI 输出不确定)、检索相关性。
// 匿名访问 /chat → 重定向 /login 的「路由守卫」已由 auth-guard.spec 锁定,此处不重复。
// 断言只用 URL / 文本 / data-testid,不用 CSS 类名 / 像素(防四期视觉改动失效)。

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'e2e-token',
    refreshToken: 'e2e-refresh',
    user: { id: 1, name: 'test', avatar: '' },
    isLogin: true,
  },
  version: 0,
});

const CITED = { id: 39, title: '黑神话悟空：广智广谋速通打法' };

// mock chat 的 data stream 响应:annotation(8:)在前 + text(0:)+ finish(d:),与后端真实写法一致。
// route.fulfill 一次性给整段 body,useChat 的 data stream parser 仍按 \n 分段解析(content + annotations)。
function chatStreamBody() {
  return [
    '8:' + JSON.stringify([CITED]),
    '0:' + JSON.stringify('这是'),
    '0:' + JSON.stringify('回答。'),
    'd:' + JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } }),
  ].join('\n') + '\n';
}

function markdownChatStreamBody() {
  return [
    '8:' + JSON.stringify([CITED]),
    '0:' + JSON.stringify('## 虎先锋建议'),
    '0:' + JSON.stringify('\n\n- 保持距离'),
    '0:' + JSON.stringify('\n- 观察后摇\n\n```ts\nconst dodge = true\n```'),
    'd:' + JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } }),
  ].join('\n') + '\n';
}

const FAKE_POST = {
  id: CITED.id, title: CITED.title, brief: '正文', content: '正文',
  publishedAt: '2026-06-18', tags: [] as string[], thumbnail: '', pics: [] as string[],
  totalLikes: 0, totalComments: 0, likedByMe: false,
  user: { id: 9, name: '作者', avatar: '' },
};

async function setupMocks(
  page: Page,
  captured: { authHeader?: string },
  streamBody = chatStreamBody(),
) {
  // 兜底:其它后端调用返合理空结构(防 stray 请求挂起)。注册最早 → 匹配最后。
  await page.route('http://localhost:3000/**', (route) => {
    const url = route.request().url();
    let body: string;
    if (/\/api\/posts\/tags/.test(url) || /\/api\/games/.test(url)) body = '[]';
    else if (/\/api\/posts\/\d+/.test(url)) body = JSON.stringify(FAKE_POST);
    else body = JSON.stringify({ items: [], data: [], total: 0 });
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  // 详情页评论接口(点引用跳 /post/:id 后详情页加载)
  await page.route('**/api/posts/*/comments', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  // chat SSE(注册最晚 → 匹配最先):捕获 Authorization 头 + 返回 data stream
  await page.route('**/api/ai/chat', async (route) => {
    captured.authHeader = (await route.request().allHeaders())['authorization'];
    return route.fulfill({
      status: 200,
      headers: { 'x-vercel-ai-data-stream': 'v1' },
      contentType: 'text/plain; charset=utf-8',
      body: streamBody,
    });
  });
}

async function send(page: Page, text: string) {
  await page.getByPlaceholder('Type your message...').fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
}

test.describe('§五 chat·登录态', () => {
  let captured: { authHeader?: string };
  test.beforeEach(async ({ page }) => {
    captured = {};
    await page.addInitScript((s) => localStorage.setItem('user-store', s as string), AUTH_STORE);
    await setupMocks(page, captured);
  });

  test('发消息 → chat 请求带 Authorization + 流式回答渲染', async ({ page }) => {
    await page.goto('/chat');
    await send(page, '黑神话boss怎么打');
    // 回答(mock 文本)渲染 = useChat 正确解析 data stream
    await expect(page.getByText('这是回答。')).toBeVisible();
    // 请求带上 token(§五 修 §四 401:useChat 走 fetch、手动配 Authorization)
    expect(captured.authHeader).toContain('Bearer e2e-token');
  });

  test('引用 chip 渲染 + 可点跳 /post/:id', async ({ page }) => {
    await page.goto('/chat');
    await send(page, '黑神话boss怎么打');
    const chip = page.getByTestId('chat-citation-link').first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(/黑神话/);
    await expect(chip).toHaveAttribute('href', `/post/${CITED.id}`);
    await chip.click();
    await expect(page).toHaveURL(new RegExp(`/post/${CITED.id}$`));
  });

  test('对话 store 保持:发消息 → 离开 → 回 chat,消息还在', async ({ page }) => {
    await page.goto('/chat');
    await send(page, '黑神话boss怎么打');
    await expect(page.getByText('这是回答。')).toBeVisible();
    // 客户端导航离开(点引用去详情)→ goBack 回 chat(非整页刷新,store 内存保持)
    await page.getByTestId('chat-citation-link').first().click();
    await expect(page).toHaveURL(new RegExp(`/post/${CITED.id}$`));
    await page.goBack();
    await expect(page).toHaveURL(/\/chat$/);
    // 用户问句 + 回答都还在(useChatStore 恢复)
    await expect(page.getByText('黑神话boss怎么打')).toBeVisible();
    await expect(page.getByText('这是回答。')).toBeVisible();
  });

  test('assistant Markdown 语义渲染且 citation 仍独立可点', async ({ page }) => {
    await page.unroute('**/api/ai/chat');
    await setupMocks(page, captured, markdownChatStreamBody());
    await page.goto('/chat');
    await send(page, '请给出虎先锋建议');

    const assistant = page.getByTestId('chat-message').filter({ has: page.getByRole('heading', { name: '虎先锋建议' }) });
    await expect(assistant.getByRole('heading', { level: 2, name: '虎先锋建议' })).toBeVisible();
    await expect(assistant.getByRole('listitem')).toHaveCount(2);
    await expect(assistant.getByText('const dodge = true')).toBeVisible();

    const citation = assistant.getByTestId('chat-citation-link');
    await expect(citation).toHaveAttribute('href', `/post/${CITED.id}`);
    await expect(citation).toHaveText(CITED.title);
  });

  test('user Markdown 标记保持纯文本且不生成链接', async ({ page }) => {
    const source = '**原文** [链接](/post/1)';
    await page.goto('/chat');
    await send(page, source);

    const userMessage = page.getByTestId('chat-message').filter({ hasText: source });
    await expect(userMessage).toContainText(source);
    await expect(userMessage.getByRole('link')).toHaveCount(0);
  });
});
