import { describe, expect, it, vi } from "vitest"

vi.mock("@/config/runtime", () => ({
  API_BASE_URL: "http://test.invalid/api",
}))
vi.mock("@/store/useUserStore", () => ({
  useUserStore: {
    getState: () => ({ accessToken: "", refreshToken: "", logout: vi.fn() }),
    setState: vi.fn(),
  },
}))

import instance from "./config"

describe("axios response interceptor", () => {
  it("preserves a network error that has no response", async () => {
    const networkError = Object.assign(new Error("Network Error"), {
      code: "ERR_NETWORK",
      isAxiosError: true,
      request: {},
      config: { headers: {} },
    })

    const request = instance.get("/network-failure", {
      adapter: async () => Promise.reject(networkError),
    })

    await expect(request).rejects.toBe(networkError)
  })
})
