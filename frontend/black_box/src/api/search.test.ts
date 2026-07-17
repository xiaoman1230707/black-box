import { beforeEach, describe, expect, it, vi } from "vitest"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("./config", () => ({ default: { get } }))

import { doSearch } from "./search"

describe("doSearch", () => {
  beforeEach(() => get.mockReset())

  it("bounds the browser search request", async () => {
    get.mockResolvedValue({ code: 0, data: [] })

    await doSearch("boss")

    expect(get).toHaveBeenCalledWith("/ai/search?keyword=boss", {
      timeout: 25_000,
    })
  })
})
