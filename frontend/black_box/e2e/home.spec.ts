import { test, expect, type Page } from '@playwright/test';

// 二期·首页标签栏 e2e(只测可稳定断言的点:标签显示 / 点击筛选 / 顺序切换 / toggle 取消)。
// 时序敏感交互(keep-alive 激活刷新、快速连切竞态、无限滚动)不在此测,见 02-phase2-social.md §十「二期 e2e 覆盖情况」。
// 策略:mock GET /posts/tags(五类)+ GET /posts(按 tag query 确定性返回);断言用 文本 / data-testid / data-state。

const TAGS = [
  { id: 1, name: '资讯' }, { id: 2, name: '攻略' }, { id: 3, name: '求助' },
  { id: 4, name: '评测' }, { id: 5, name: '活动' },
];

function fakePost(id: number, title: string, tag: string) {
  return {
    id, title, brief: '内容', publishedAt: '2026-06-18',
    totalLikes: 0, totalComments: 0, viewCount: 0,
    tags: [tag], thumbnail: '', user: { id: 1, name: '作者', avatar: '' },
  };
}

async function setupHomeMocks(page: Page) {
  // 标签接口(无 query)
  await page.route(/\/api\/posts\/tags/, (route) => route.fulfill({ json: TAGS }));
  // 列表接口(带 query),按 tag 确定性返回不同帖子
  await page.route(/\/api\/posts\?/, (route) => {
    const url = new URL(route.request().url());
    const tag = url.searchParams.get('tag');
    let items;
    if (tag === '攻略') items = [fakePost(11, '攻略帖示例', '攻略')];
    else if (tag === '评测') items = [fakePost(12, '评测帖示例', '评测')];
    else items = [fakePost(99, '全部帖示例', '资讯')]; // 无 tag / all = 全部
    route.fulfill({ json: { items, total: items.length } });
  });
}

test.describe('首页标签栏', () => {
  test.beforeEach(async ({ page }) => {
    await setupHomeMocks(page);
  });

  test('标签栏显示五类内容类型', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('tag-chip')).toHaveCount(5);
    for (const t of TAGS) {
      await expect(page.getByTestId('tag-chip').filter({ hasText: t.name })).toBeVisible();
    }
  });

  test('点击 tag → 高亮该 tag + 列表显示该类帖子', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('全部帖示例')).toBeVisible(); // 初始全部
    await page.getByTestId('tag-chip').filter({ hasText: '攻略' }).click();
    await expect(page.getByTestId('tag-chip').filter({ hasText: '攻略' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('攻略帖示例')).toBeVisible();
  });

  test('切换 tag(攻略 → 评测)→ 高亮与列表都切换', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('tag-chip').filter({ hasText: '攻略' }).click();
    await expect(page.getByText('攻略帖示例')).toBeVisible();
    // 切到评测
    await page.getByTestId('tag-chip').filter({ hasText: '评测' }).click();
    await expect(page.getByText('评测帖示例')).toBeVisible();
    await expect(page.getByTestId('tag-chip').filter({ hasText: '评测' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('tag-chip').filter({ hasText: '攻略' })).toHaveAttribute('data-state', 'inactive');
  });

  test('点已选中的 tag → 取消、回全部', async ({ page }) => {
    await page.goto('/');
    const guide = page.getByTestId('tag-chip').filter({ hasText: '攻略' });
    await guide.click();
    await expect(guide).toHaveAttribute('data-state', 'active');
    await guide.click(); // 再点 → 回全部
    await expect(page.getByTestId('tag-all')).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('全部帖示例')).toBeVisible();
  });
});
