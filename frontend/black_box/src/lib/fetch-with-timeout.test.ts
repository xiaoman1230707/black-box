import { describe, expect, it, vi } from "vitest"

import { createTimeoutFetch } from "@/lib/fetch-with-timeout"

describe("createTimeoutFetch", () => {
  it("aborts a pending request at the client deadline", async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
      })
    ) as typeof fetch
    const timeoutFetch = createTimeoutFetch(55, fetchImpl)

    const request = timeoutFetch("http://test.invalid/chat")
    const rejection = expect(request).rejects.toBeDefined()
    await vi.advanceTimersByTimeAsync(55)

    await rejection
    vi.useRealTimers()
  })

  it("preserves an abort from the caller", async () => {
    const caller = new AbortController()
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
      })
    ) as typeof fetch
    const timeoutFetch = createTimeoutFetch(55_000, fetchImpl)

    const request = timeoutFetch("http://test.invalid/chat", {
      signal: caller.signal,
    })
    caller.abort(new Error("caller aborted"))

    await expect(request).rejects.toThrow("caller aborted")
  })
})
