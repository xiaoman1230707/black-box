import { test, expect, type Page } from '@playwright/test';

// 二期·详情页评论 + 点赞 e2e(已人工验收的功能)。
// 策略:前端路由拦截 mock 后端 —— 有状态 mock(评论树 / 点赞态在测试进程内维护),
// 使"发评论→出现""点赞→+1→刷新持久"等交互链路可断言。不依赖真实后端/数据库。
// 断言只用 URL / 文本 / data-testid(不用 CSS 类名 / 像素,防四期视觉改动后失效)。

// 评论作者 = 注入的登录用户(id 一致 → 详情页显示本人删除入口)
const USER = { id: 2, name: 'test', avatar: '' };
const AUTH_STORE = JSON.stringify({
  state: { accessToken: 't', refreshToken: 't', user: USER, isLogin: true },
  version: 0,
});

type MockState = {
  comments: MockComment[];
  liked: boolean;
  totalLikes: number;
  nextId: number;
};

type MockComment = {
  id: number;
  content: string;
  user: typeof USER;
  replies: MockComment[];
};

function makeState(): MockState {
  return { comments: [], liked: false, totalLikes: 3, nextId: 100 };
}

// 注册有状态 mock(详情 / 评论树 / 发评论 / 删评论 / 点赞)。glob 的 * 不跨 '/',四类路径互不重叠。
async function setupMocks(page: Page, state: MockState) {
  const FAKE_POST = {
    id: 1, title: 'e2e 帖子', brief: '正文', content: '正文',
    publishedAt: '2026-06-18', tags: [] as string[], thumbnail: '',
    user: { id: 9, name: '作者', avatar: '' },
  };

  // GET /api/posts/:id 详情(* 不匹配 /comments、/like 子路径)
  await page.route('**/api/posts/*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const totalComments = state.comments.reduce((n, c) => n + 1 + c.replies.length, 0);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...FAKE_POST,
        likedByMe: state.liked,
        totalLikes: state.totalLikes,
        totalComments,
      }),
    });
  });

  // GET / POST /api/posts/:id/comments
  await page.route('**/api/posts/*/comments', async (route) => {
    const m = route.request().method();
    if (m === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: state.comments }) });
    } else if (m === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const node: MockComment = { id: state.nextId++, content: body.content, user: USER, replies: [] };
      if (body.parentId) {
        const top = state.comments.find((c) => c.id === body.parentId);
        if (top) top.replies.push(node);
      } else {
        state.comments.push(node);
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(node) });
    } else {
      await route.fallback();
    }
  });

  // DELETE /api/comments/:id(顶层或回复均移除)
  await page.route('**/api/comments/*', async (route) => {
    const id = Number(route.request().url().split('/').pop());
    state.comments = state.comments.filter((c) => c.id !== id);
    state.comments.forEach((c) => (c.replies = c.replies.filter((reply) => reply.id !== id)));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  // POST / DELETE /api/posts/:id/like
  await page.route('**/api/posts/*/like', async (route) => {
    const m = route.request().method();
    if (m === 'POST') {
      state.liked = true; state.totalLikes++;
    } else if (m === 'DELETE') {
      state.liked = false; state.totalLikes--;
    } else {
      return route.fallback();
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ liked: state.liked, totalLikes: state.totalLikes }) });
  });
}

test.describe('详情页·登录态', () => {
  let state: MockState;
  test.beforeEach(async ({ page }) => {
    state = makeState();
    await page.addInitScript((store) => localStorage.setItem('user-store', store as string), AUTH_STORE);
    await setupMocks(page, state);
  });

  test('发评论 → 评论出现,计数 +1', async ({ page }) => {
    await page.goto('/post/1');
    await expect(page.getByText('还没有评论，来抢沙发吧')).toBeVisible();
    await page.getByTestId('comment-input').fill('第一条评论');
    await page.getByTestId('comment-submit').click();
    await expect(page.getByTestId('comment-item').filter({ hasText: '第一条评论' })).toBeVisible();
    await expect(page.getByText('评论 (1)')).toBeVisible();
  });

  test('回复顶层评论 → 回复挂其下', async ({ page }) => {
    await page.goto('/post/1');
    await page.getByTestId('comment-input').fill('顶层评论');
    await page.getByTestId('comment-submit').click();
    await expect(page.getByTestId('comment-item').filter({ hasText: '顶层评论' })).toBeVisible();
    // 点该顶层评论的回复 → 输入 → 提交
    await page.getByTestId('reply-button').first().click();
    await page.getByTestId('comment-input').fill('一条回复');
    await page.getByTestId('comment-submit').click();
    await expect(page.getByTestId('comment-reply').filter({ hasText: '一条回复' })).toBeVisible();
    await expect(page.getByText('评论 (2)')).toBeVisible();
  });

  test('删除本人评论 → 消失', async ({ page }) => {
    await page.goto('/post/1');
    await page.getByTestId('comment-input').fill('待删除评论');
    await page.getByTestId('comment-submit').click();
    await expect(page.getByText('待删除评论')).toBeVisible();
    await page.getByTestId('delete-comment').first().click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText('待删除评论')).toHaveCount(0);
  });

  test('点赞 → +1 且 liked,取消 → -1 且 idle', async ({ page }) => {
    await page.goto('/post/1');
    await expect(page.getByTestId('like-count')).toHaveText('3');
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'idle');
    await page.getByTestId('like-button').click();
    await expect(page.getByTestId('like-count')).toHaveText('4');
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'liked');
    await page.getByTestId('like-button').click();
    await expect(page.getByTestId('like-count')).toHaveText('3');
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'idle');
  });

  test('点赞后刷新 → likedByMe 持久', async ({ page }) => {
    await page.goto('/post/1');
    await page.getByTestId('like-button').click();
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'liked');
    await page.reload();
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'liked');
    await expect(page.getByTestId('like-count')).toHaveText('4');
  });
});

test.describe('详情页·未登录', () => {
  let state: MockState;
  test.beforeEach(async ({ page }) => {
    state = makeState();
    await setupMocks(page, state); // 不注入登录态
  });

  test('显示"登录后参与评论",不显示评论输入框', async ({ page }) => {
    await page.goto('/post/1');
    await expect(page.getByTestId('login-to-comment')).toBeVisible();
    await expect(page.getByTestId('comment-input')).toHaveCount(0);
  });

  test('未登录点赞 → 跳 /login', async ({ page }) => {
    await page.goto('/post/1');
    await page.getByTestId('like-button').click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
