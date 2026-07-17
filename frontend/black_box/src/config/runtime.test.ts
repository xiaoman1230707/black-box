import { afterEach, describe, expect, it, vi } from "vitest"

const loadRuntime = async (value?: string) => {
  vi.resetModules()
  vi.unstubAllEnvs()

  if (value !== undefined) {
    vi.stubEnv("VITE_API_BASE_URL", value)
  }

  return import("./runtime")
}

describe("frontend runtime config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects a missing API base URL", async () => {
    await expect(loadRuntime()).rejects.toThrow("VITE_API_BASE_URL")
  })

  it("trims whitespace and trailing slashes", async () => {
    const runtime = await loadRuntime("  https://api.example.com/api///  ")

    expect(runtime.API_BASE_URL).toBe("https://api.example.com/api")
  })

  it("joins API paths with exactly one slash", async () => {
    const runtime = await loadRuntime("https://api.example.com/api/")

    expect(runtime.apiUrl("/ai/chat")).toBe("https://api.example.com/api/ai/chat")
    expect(runtime.apiUrl("posts")).toBe("https://api.example.com/api/posts")
  })
})
