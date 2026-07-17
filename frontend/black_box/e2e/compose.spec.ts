import { test, expect, type Page } from '@playwright/test';

// 二期·发帖页 e2e(发帖页已人工验收通过)。
// 策略:前端路由拦截 mock 后端 —— 注入登录态 + mock /games、/posts/tags、POST /posts、详情接口。
// 断言用 URL / 文本 / data-testid;无后端依赖。

const USER = { id: 1, name: 'e2e-user', avatar: '' };
const AUTH_STORE = JSON.stringify({
  state: { accessToken: 't', refreshToken: 't', user: USER, isLogin: true },
  version: 0,
});

const TAGS = [
  { id: 1, name: '资讯' }, { id: 2, name: '攻略' }, { id: 3, name: '求助' },
  { id: 4, name: '评测' }, { id: 5, name: '活动' },
];
const GAMES = [{ id: 1, name: '黑神话:悟空' }, { id: 2, name: '原神' }];

// 跳详情后需要的完整 post(详情页渲染 user.avatar 等,空结构会崩)
const FAKE_POST = {
  id: 123, title: '新帖', content: '正文', brief: '正文',
  publishedAt: '2026-06-18', totalLikes: 0, totalComments: 0, viewCount: 0,
  likedByMe: false, tags: [] as string[], thumbnail: '', user: { id: 1, name: '作者', avatar: '' },
};

// 首页已加载列表(测 prependPost:发帖后新帖应插到这俩之上)
const HOME_POSTS = [
  { id: 11, title: '旧帖A', brief: 'A', publishedAt: '2026-06-01', totalLikes: 1, totalComments: 0, viewCount: 5, likedByMe: false, tags: ['攻略'], thumbnail: '', user: { id: 2, name: '甲', avatar: '' } },
  { id: 12, title: '旧帖B', brief: 'B', publishedAt: '2026-06-02', totalLikes: 2, totalComments: 1, viewCount: 8, likedByMe: false, tags: [] as string[], thumbnail: '', user: { id: 3, name: '乙', avatar: '' } },
];

type MockState = { postCalled: boolean; lastBody: Record<string, unknown> | null };

async function setupMocks(page: Page, state: MockState) {
  await page.route('http://localhost:3000/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const m = req.method();
    if (/\/api\/games/.test(path)) return route.fulfill({ json: GAMES });
    if (/\/api\/posts\/tags/.test(path)) return route.fulfill({ json: TAGS });
    if (/\/api\/upload\/image/.test(path)) return route.fulfill({ json: { id: 7, url: 'http://x/o.jpg', thumbnailUrl: 'http://x/o-thumbnail.jpg' } });
    if (m === 'POST' && path === '/api/posts') {
      state.postCalled = true;
      state.lastBody = JSON.parse(req.postData() || '{}');
      return route.fulfill({ json: { id: 123 } });
    }
    if (m === 'GET' && path === '/api/posts') return route.fulfill({ json: { items: HOME_POSTS, total: HOME_POSTS.length } });
    if (/\/api\/posts\/\d+\/comments/.test(path)) return route.fulfill({ json: { items: [] } });
    if (/\/api\/posts\/\d+/.test(path)) return route.fulfill({ json: FAKE_POST });
    return route.fulfill({ json: { items: [], total: 0 } });
  });
}

test.describe('发帖页', () => {
  let state: MockState;
  test.beforeEach(async ({ page }) => {
    state = { postCalled: false, lastBody: null };
    await page.addInitScript((s) => localStorage.setItem('user-store', s as string), AUTH_STORE);
    await setupMocks(page, state);
  });

  test('发帖成功(标题+正文+游戏+标签)→ 跳新帖详情', async ({ page }) => {
    await page.goto('/compose');
    await expect(page.getByTestId('compose-page')).toBeVisible();
    await page.getByTestId('compose-title').fill('我的第一帖');
    await page.getByTestId('compose-game').click();
    await page.getByRole('option', { name: '黑神话:悟空' }).click();
    await page.getByTestId('compose-tag').first().click();
    await page.getByTestId('compose-content').fill('这是正文内容');
    await page.getByTestId('compose-submit').click();
    await expect(page).toHaveURL(/\/post\/123$/);
    expect(state.postCalled).toBe(true);
  });

  test('不传图也能发 → 提交成功', async ({ page }) => {
    await page.goto('/compose');
    await page.getByTestId('compose-title').fill('无图帖');
    await page.getByTestId('compose-content').fill('正文');
    await page.getByTestId('compose-submit').click();
    await expect(page).toHaveURL(/\/post\/123$/);
    expect(state.postCalled).toBe(true);
    expect(state.lastBody?.fileIds).toBeUndefined(); // 未传图 → 不带 fileIds
  });

  // Compose 必填校验 = 提交按钮 disabled(title/content 非空才可点),非"可点+错误提示";e2e 反映现状用 disabled 断言。
  test('标题空 → 提交按钮禁用(前端拦,不调 /posts)', async ({ page }) => {
    await page.goto('/compose');
    await page.getByTestId('compose-content').fill('只有正文');
    await expect(page.getByTestId('compose-submit')).toBeDisabled();
    expect(state.postCalled).toBe(false);
  });

  test('正文空 → 提交按钮禁用(前端拦,不调 /posts)', async ({ page }) => {
    await page.goto('/compose');
    await page.getByTestId('compose-title').fill('只有标题');
    await expect(page.getByTestId('compose-submit')).toBeDisabled();
    expect(state.postCalled).toBe(false);
  });

  // prependPost:发帖成功后新帖进 home store 列表顶(返回首页即见、无需刷新、不丢已加载列表)。
  // 全程 SPA(点 Sidebar 导航,不 reload),断言列表首项为新帖、数量 +1。
  test('发帖成功 → 新帖进首页列表顶(prependPost)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('post-item').first()).toBeVisible();
    await expect(page.getByTestId('post-item')).toHaveCount(HOME_POSTS.length); // 旧列表 2 帖
    // SPA 进发帖页(点 Sidebar「发帖」)
    await page.locator('aside a[href="/compose"]').click();
    await expect(page).toHaveURL(/\/compose$/);
    await page.getByTestId('compose-title').fill('全新帖');
    await page.getByTestId('compose-content').fill('正文内容');
    await page.getByTestId('compose-submit').click();
    await expect(page).toHaveURL(/\/post\/123$/);
    // SPA 回首页(点 Sidebar「首页」)→ 新帖在顶 + 数量 +1(未刷新、未丢旧列表)
    await page.locator('aside a[href="/"]').click();
    await expect(page).toHaveURL(/localhost:5173\/$/);
    await expect(page.getByTestId('post-item')).toHaveCount(HOME_POSTS.length + 1); // 2 + 新帖 = 3
    await expect(page.getByTestId('post-item').first()).toContainText('新帖'); // FAKE_POST.title
  });
});
