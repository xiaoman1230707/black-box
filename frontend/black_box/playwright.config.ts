import { defineConfig, devices } from '@playwright/test';

// e2e 配置(工程质量保障,贯穿各期,不计入某一期功能范围)。
// 守卫 e2e 采用「前端路由拦截 mock 后端」策略:不依赖真实后端与数据库、不造真实账号。
// baseURL 指向 vite dev(5173);webServer 自动起 dev,本机已有 dev 则复用。
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 自动起前端 dev;守卫 e2e 用路由拦截 mock 后端,故无需起后端与数据库。
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    env: {
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
