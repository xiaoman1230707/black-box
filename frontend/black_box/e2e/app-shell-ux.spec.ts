import { expect, test, type Page } from '@playwright/test';

const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'e2e-token',
    refreshToken: 'e2e-refresh',
    user: { id: 1, name: 'test', avatar: '' },
    isLogin: true,
  },
  version: 0,
});

const FAKE_POST = {
  id: 1,
  title: '壳层验收帖子',
  brief: '用于验证页面职责。',
  content: '正文',
  publishedAt: '2026-07-17',
  totalLikes: 0,
  totalComments: 0,
  viewCount: 0,
  likedByMe: false,
  tags: [] as string[],
  thumbnail: '',
  pics: [] as string[],
  user: { id: 1, name: '作者', avatar: '' },
};

async function setupMocks(page: Page, searchKeywords: string[]) {
  await page.addInitScript((store) => {
    localStorage.setItem('user-store', store as string);
    localStorage.removeItem('search-store');
  }, AUTH_STORE);

  await page.route('http://localhost:3000/**', (route) => {
    const url = new URL(route.request().url());
    let body: unknown = { items: [], data: [], total: 0 };

    if (url.pathname === '/api/ai/search') {
      searchKeywords.push(url.searchParams.get('keyword') ?? '');
      body = { code: 0, message: 'ok', data: [FAKE_POST] };
    } else if (url.pathname === '/api/posts/tags' || url.pathname === '/api/games') {
      body = [];
    } else if (/^\/api\/posts\/\d+\/comments$/.test(url.pathname)) {
      body = { items: [] };
    } else if (/^\/api\/posts\/\d+$/.test(url.pathname)) {
      body = FAKE_POST;
    } else if (url.pathname === '/api/users/me') {
      body = { id: 1, name: 'test', avatar: '' };
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test.describe('O1 App Shell 搜索职责', () => {
  let searchKeywords: string[];

  test.beforeEach(async ({ page }) => {
    searchKeywords = [];
    await setupMocks(page, searchKeywords);
  });

  test('Home 仅一个搜索区，提交后正确进入 /search?q=', async ({ page }) => {
    const keyword = '黑神话 & 虎先锋? #攻略%';
    await page.goto('/');

    await expect(page.getByRole('search')).toHaveCount(1);
    await page.getByRole('search').getByRole('searchbox').fill(keyword);
    await page.getByRole('search').getByRole('button', { name: '搜索', exact: true }).click();

    await expect(page).toHaveURL(/\/search\?/);
    expect(new URL(page.url()).searchParams.get('q')).toBe(keyword);
  });

  test('Search 仅一个页内搜索区并消费 q', async ({ page }) => {
    const keyword = '玛莲妮亚打法';
    await page.goto(`/search?q=${encodeURIComponent(keyword)}`);

    await expect(page.getByRole('search')).toHaveCount(1);
    await expect(page.getByRole('search').getByRole('searchbox')).toHaveValue(keyword);
    await expect(page.getByTestId('search-results')).toBeVisible();
    expect(searchKeywords).toEqual([keyword]);
  });

  test('其余业务页无搜索区，Login 仍独立于 App Shell', async ({ page }) => {
    for (const path of ['/post/1', '/compose', '/chat', '/mine']) {
      await page.goto(path);
      await expect(page.getByTestId('app-shell')).toBeVisible();
      await expect(page.getByRole('search')).toHaveCount(0);
    }

    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('app-shell')).toHaveCount(0);
  });
});
