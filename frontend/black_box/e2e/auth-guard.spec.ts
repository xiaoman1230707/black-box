import { test, expect } from '@playwright/test';

// 一期·守卫与路由 e2e(锁定已人工验收通过的核心链路)。
// 策略:前端路由拦截 mock 后端 —— 不依赖真实后端/数据库、不造真实账号。
//   · 守卫本质是前端路由逻辑(有无有效登录态 → 放行/重定向),前端自身可判定;
//   · 后端真实登录链路已在前序人工核实可用(结论 A),无需 e2e 重复验证。
// 断言只用 URL / data-testid 稳定锚点,不用 CSS 类名 / DOM 结构 / 像素(防四期视觉改动后大面积失败)。

// mock 登录态:按 useUserStore persist 现状结构(localStorage key = 'user-store')。
// 守卫(RequireAuth)只读 isLogin;user 按 User 类型({id,name,avatar?})给最小可用值。
const AUTH_STORE = JSON.stringify({
  state: {
    accessToken: 'e2e-access-token',
    refreshToken: 'e2e-refresh-token',
    user: { id: 1, name: 'e2e-user', avatar: '' },
    isLogin: true,
  },
  version: 0,
});

// 受保护页 / 公开页清单(对应路由表与守卫)。
// /search 三期(§四)加 RequireAuth(语义搜索需登录)→ 从 PUBLIC 移入 PROTECTED。
const PROTECTED = ['/chat', '/mine', '/compose', '/search'];
const PUBLIC = ['/', '/post/1'];
const REMOVED = ['/rag', '/git'];

// 帖子详情用结构完整的假 post(详情页内部直接渲染 post.user.avatar,空结构会崩),按 User/Post 类型给值。
const FAKE_POST = {
  id: 1,
  title: 'e2e 帖子',
  brief: 'e2e 简介',
  publishedAt: '2026-06-18',
  totalLikes: 0,
  totalComments: 0,
  tags: [] as string[],
  thumbnail: '',
  pics: [] as string[],
  user: { id: 1, name: 'e2e-author', avatar: '' },
};

// mock 后端:拦截所有发往后端(:3000)的请求,避免请求挂起 / 连接拒绝噪音。
// 守卫断言不依赖响应内容,但 App Shell 内的展示页会渲染响应数据,故按接口分流给合理结构:
//   · 帖子详情 /api/posts/:id → 完整 post 对象;其余(列表/标签等)→ 空集。
// (axios 拦截器已解包 response.data,故 body 即业务对象本身)
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/**', (route) => {
    const url = route.request().url();
    let body: string;
    if (/\/api\/posts\/tags/.test(url) || /\/api\/games/.test(url)) {
      // 标签 / 游戏接口返数组(Compose、首页等直接 .map,空结构会崩)
      body = '[]';
    } else if (/\/api\/posts\/\d+/.test(url)) {
      body = JSON.stringify(FAKE_POST);
    } else {
      body = JSON.stringify({ items: [], data: [], total: 0 });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
});

test.describe('未登录(无 token)', () => {
  for (const path of PROTECTED) {
    test(`未登录访问 ${path} → 重定向 /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId('login-page')).toBeVisible();
    });
  }

  for (const path of PUBLIC) {
    test(`匿名可访问 ${path} → 进入 App Shell,不被重定向`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByTestId('app-shell')).toBeVisible();
    });
  }

  for (const path of REMOVED) {
    test(`${path} 不可达 → 不进 App Shell 且不被重定向`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      // 路由整条移除:React Router 无匹配 → 渲染 null,既不进 Shell 也不触发守卫重定向。
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByTestId('app-shell')).toHaveCount(0);
    });
  }
});

test.describe('已登录(注入有效 token)', () => {
  test.beforeEach(async ({ page }) => {
    // addInitScript 在页面脚本前运行,赶在 zustand persist 读取 localStorage 之前写入登录态。
    await page.addInitScript((store) => {
      localStorage.setItem('user-store', store as string);
    }, AUTH_STORE);
  });

  test('登录态访问 /chat → 放行,停在目标路由', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });

  test('登录态访问 /mine → 放行,停在目标路由', async ({ page }) => {
    await page.goto('/mine');
    await expect(page).toHaveURL(/\/mine$/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });

  test('登录态访问 /compose → 放行,占位页可见', async ({ page }) => {
    await page.goto('/compose');
    await expect(page).toHaveURL(/\/compose$/);
    await expect(page.getByTestId('compose-page')).toBeVisible();
  });
});
