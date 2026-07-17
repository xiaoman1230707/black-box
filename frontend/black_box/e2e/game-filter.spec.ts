import { test, expect, type Page } from '@playwright/test';

// 三期·§六 按游戏筛选 e2e(已人工验收的功能)。
// 策略同 home.spec:mock GET /games(游戏行)+ /posts/tags + /posts?(按 tag/gameId 组合确定性返回);
//   并捕获 /posts 请求 query,断言「请求带 gameId/tag」(tag×game AND、独立 toggle 的关键证据)。
// 只测稳定可断言项:gameId 筛选 / tag×game 叠加(请求带双参 + 列表交集)/ 游戏切换 / 独立 toggle。
// 不测视觉(chip 布局/样式归人工/四期)。断言用 文本 / data-testid / data-state。
// 时序敏感(快速连切竞态、无限滚动)不在此测(同 home.spec 口径,归人工/已代验)。

const GAMES = [{ id: 1, name: '黑神话' }, { id: 2, name: '原神' }, { id: 3, name: '艾尔登' }];
const TAGS = [{ id: 1, name: '资讯' }, { id: 2, name: '攻略' }, { id: 3, name: '评测' }];

function fakePost(id: number, title: string) {
  return {
    id, title, brief: '内容', publishedAt: '2026-06-18',
    totalLikes: 0, totalComments: 0, viewCount: 0,
    tags: ['攻略'], thumbnail: '', user: { id: 1, name: '作者', avatar: '' },
  };
}

type Captured = { tag: string | null; gameId: string | null };

async function setupMocks(page: Page, captured: Captured) {
  // 注:用末尾锚定的 glob,避免正则 /\/api\/games/ 误拦 Vite 源码模块 localhost:5173/src/api/games.ts
  //     (该路径也含 "/api/games";glob '**/api/games' 要求以 games 结尾,games.ts 以 .ts 结尾故不匹配)。
  await page.route('**/api/games', (route) => route.fulfill({ json: GAMES }));
  await page.route('**/api/posts/tags', (route) => route.fulfill({ json: TAGS }));
  // 列表:按 (gameId, tag) 组合确定性返回;记录最后一次请求 query
  await page.route(/\/api\/posts\?/, (route) => {
    const url = new URL(route.request().url());
    const tag = url.searchParams.get('tag');
    const gameId = url.searchParams.get('gameId');
    captured.tag = tag;
    captured.gameId = gameId;
    let items;
    if (gameId === '1' && tag === '攻略') items = [fakePost(101, '黑神话攻略帖')];
    else if (gameId === '1') items = [fakePost(102, '黑神话帖A'), fakePost(103, '黑神话帖B')];
    else if (gameId === '2') items = [fakePost(201, '原神帖A')];
    else if (tag === '攻略') items = [fakePost(301, '全部游戏攻略帖')];
    else items = [fakePost(99, '全部帖示例')];
    route.fulfill({ json: { items, total: items.length } });
  });
}

const gameChip = (page: Page, name: string) => page.getByTestId('game-chip').filter({ hasText: name });
const tagChip = (page: Page, name: string) => page.getByTestId('tag-chip').filter({ hasText: name });

test.describe('§六 按游戏筛选', () => {
  let captured: Captured;
  test.beforeEach(async ({ page }) => {
    captured = { tag: null, gameId: null };
    await setupMocks(page, captured);
  });

  test('游戏行渲染 + 选游戏 → 列表是该游戏帖(请求带 gameId)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-filter-row')).toBeVisible();
    await expect(page.getByTestId('game-chip')).toHaveCount(3);
    await expect(page.getByText('全部帖示例')).toBeVisible(); // 初始无筛选

    await gameChip(page, '黑神话').click();
    await expect(gameChip(page, '黑神话')).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('黑神话帖A')).toBeVisible();
    await expect(page.getByText('全部帖示例')).toHaveCount(0);
    expect(captured.gameId).toBe('1');
  });

  test('tag×game 叠加 → 请求带 tag+gameId、列表是交集', async ({ page }) => {
    await page.goto('/');
    await gameChip(page, '黑神话').click();
    await tagChip(page, '攻略').click();
    await expect(page.getByText('黑神话攻略帖')).toBeVisible();
    expect(captured.gameId).toBe('1');
    expect(captured.tag).toBe('攻略');
  });

  test('游戏切换(黑神话 → 原神)→ 高亮与列表都切', async ({ page }) => {
    await page.goto('/');
    await gameChip(page, '黑神话').click();
    await expect(page.getByText('黑神话帖A')).toBeVisible();
    await gameChip(page, '原神').click();
    await expect(page.getByText('原神帖A')).toBeVisible();
    await expect(gameChip(page, '原神')).toHaveAttribute('data-state', 'active');
    await expect(gameChip(page, '黑神话')).toHaveAttribute('data-state', 'inactive');
    expect(captured.gameId).toBe('2');
  });

  test('独立 toggle:game+tag,取消 game → tag 仍在(请求只带 tag)', async ({ page }) => {
    await page.goto('/');
    await gameChip(page, '黑神话').click();
    await tagChip(page, '攻略').click();
    await expect(page.getByText('黑神话攻略帖')).toBeVisible();
    // 取消 game(再点黑神话)→ game 灭、tag 攻略仍在
    await gameChip(page, '黑神话').click();
    await expect(gameChip(page, '黑神话')).toHaveAttribute('data-state', 'inactive');
    await expect(tagChip(page, '攻略')).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('全部游戏攻略帖')).toBeVisible();
    expect(captured.tag).toBe('攻略');
    expect(captured.gameId).toBeNull(); // 请求不带 gameId
  });
});
