import { expect, test, type Page } from '@playwright/test';

const USER = { id: 7, name: '验收玩家', avatar: '' };
const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'personal-content-token',
    refreshToken: 'personal-content-refresh',
    user: USER,
    isLogin: true,
  },
  version: 0,
});

type ListKind = 'mine' | 'liked';

type ListCall = {
  kind: ListKind;
  page: number;
  limit: number;
};

type MockState = {
  mineIds: number[];
  likedIds: number[];
  listCalls: ListCall[];
  unlikeIds: number[];
};

function fakePost(id: number, prefix: string, likedByMe = false) {
  return {
    id,
    title: `${prefix} ${id}`,
    brief: `帖子 ${id} 的摘要`,
    content: `帖子 ${id} 的正文`,
    publishedAt: '2026-07-18T00:00:00.000Z',
    totalLikes: likedByMe ? 4 : 2,
    totalComments: 0,
    viewCount: 10 + id,
    likedByMe,
    tags: ['攻略'],
    thumbnail: '',
    user: USER,
  };
}

function makeState(): MockState {
  return {
    mineIds: Array.from({ length: 12 }, (_, index) => 101 + index),
    likedIds: Array.from({ length: 11 }, (_, index) => 201 + index),
    listCalls: [],
    unlikeIds: [],
  };
}

async function injectLogin(page: Page) {
  await page.addInitScript((store) => {
    localStorage.setItem('user-store', store as string);
  }, AUTH_STORE);
}

async function setupPersonalContentMocks(page: Page, state: MockState) {
  await page.route('**/api/posts/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const listMatch = url.pathname.match(/\/api\/posts\/(mine|liked)$/);

    if (request.method() === 'GET' && listMatch) {
      const kind = listMatch[1] as ListKind;
      const currentPage = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      state.listCalls.push({ kind, page: currentPage, limit });

      const source = kind === 'mine' ? state.mineIds : state.likedIds;
      let pageIds = source.slice((currentPage - 1) * limit, currentPage * limit);

      // 第二页重复最后一个首屏 id，锁定客户端 append 去重。
      if (kind === 'mine' && currentPage === 2 && pageIds.length > 0) {
        pageIds = [source[limit - 1], ...pageIds];
      }

      await route.fulfill({
        json: {
          items: pageIds.map((id) => fakePost(id, kind === 'mine' ? '发布帖子' : '收藏帖子', kind === 'liked')),
          total: source.length,
        },
      });
      return;
    }

    const commentsMatch = url.pathname.match(/\/api\/posts\/(\d+)\/comments$/);
    if (request.method() === 'GET' && commentsMatch) {
      await route.fulfill({ json: { items: [] } });
      return;
    }

    const likeMatch = url.pathname.match(/\/api\/posts\/(\d+)\/like$/);
    if (request.method() === 'DELETE' && likeMatch) {
      const id = Number(likeMatch[1]);
      state.likedIds = state.likedIds.filter((postId) => postId !== id);
      state.unlikeIds.push(id);
      await route.fulfill({ json: { liked: false, totalLikes: 3 } });
      return;
    }

    const detailMatch = url.pathname.match(/\/api\/posts\/(\d+)$/);
    if (request.method() === 'GET' && detailMatch) {
      const id = Number(detailMatch[1]);
      await route.fulfill({
        json: fakePost(id, state.likedIds.includes(id) ? '收藏帖子' : '发布帖子', state.likedIds.includes(id)),
      });
      return;
    }

    await route.fallback();
  });
}

async function loadNextPage(page: Page, state: MockState, kind: ListKind) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(
    () => state.listCalls.some((call) => call.kind === kind && call.page === 2 && call.limit === 10),
  ).toBe(true);
}

test('匿名访问两个个人内容页面均重定向登录', async ({ page }) => {
  for (const path of ['/mine/posts', '/mine/likes']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test.describe('登录态个人内容', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = makeState();
    await injectLogin(page);
    await setupPersonalContentMocks(page, state);
  });

  test('Mine 两个入口分别进入我的发布与我的收藏', async ({ page }) => {
    await page.goto('/mine');
    await expect(page.getByTestId('mine-posts-link')).toBeVisible();
    await expect(page.getByTestId('mine-likes-link')).toBeVisible();

    await page.getByTestId('mine-posts-link').click();
    await expect(page).toHaveURL(/\/mine\/posts$/);
    await expect(page.getByTestId('personal-post-list-page')).toHaveAttribute('data-kind', 'published');

    await page.goBack();
    await expect(page).toHaveURL(/\/mine$/);
    await page.getByTestId('mine-likes-link').click();
    await expect(page).toHaveURL(/\/mine\/likes$/);
    await expect(page.getByTestId('personal-post-list-page')).toHaveAttribute('data-kind', 'liked');
  });

  test('我的发布按 page/limit 翻页、去重并进入详情', async ({ page }) => {
    await page.goto('/mine/posts');
    await expect(page.getByTestId('post-item')).toHaveCount(10);
    await expect.poll(() => state.listCalls[0]).toEqual({ kind: 'mine', page: 1, limit: 10 });

    await loadNextPage(page, state, 'mine');
    await expect(page.getByTestId('post-item')).toHaveCount(12);
    await expect(page.getByText('发布帖子 110', { exact: true })).toHaveCount(1);

    await page.getByText('发布帖子 111', { exact: true }).click();
    await expect(page).toHaveURL(/\/post\/111$/);
    await expect(page.getByTestId('post-detail-page')).toBeVisible();
  });

  test('我的收藏只读取 liked 列表、翻页并进入详情', async ({ page }) => {
    await page.goto('/mine/likes');
    await expect(page.getByTestId('post-item')).toHaveCount(10);
    await loadNextPage(page, state, 'liked');
    await expect(page.getByTestId('post-item')).toHaveCount(11);

    expect(state.listCalls.filter((call) => call.kind === 'mine')).toHaveLength(0);
    await page.getByText('收藏帖子 211', { exact: true }).click();
    await expect(page).toHaveURL(/\/post\/211$/);
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'liked');
  });

  test('详情取消点赞后返回收藏页重取首屏并移除该帖', async ({ page }) => {
    await page.goto('/mine/likes');
    await expect(page.getByText('收藏帖子 201', { exact: true })).toBeVisible();

    await page.getByText('收藏帖子 201', { exact: true }).click();
    await expect(page).toHaveURL(/\/post\/201$/);
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'liked');
    await page.getByTestId('like-button').click();
    await expect(page.getByTestId('like-button')).toHaveAttribute('data-state', 'idle');
    expect(state.unlikeIds).toEqual([201]);

    await page.goBack();
    await expect(page).toHaveURL(/\/mine\/likes$/);
    await expect.poll(
      () => state.listCalls.filter((call) => call.kind === 'liked' && call.page === 1).length,
    ).toBe(2);
    await expect(page.getByText('收藏帖子 201', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('personal-post-total')).toHaveText('共 10 篇');
  });
});
