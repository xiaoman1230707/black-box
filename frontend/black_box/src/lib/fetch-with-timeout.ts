const timeoutReason = () => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("请求超时", "TimeoutError")
  }
  return new Error("请求超时")
}

export const createTimeoutFetch = (
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch
): typeof fetch => {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController()
    const requestSignal =
      init?.signal ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.signal
        : undefined)
    const abortFromCaller = () => controller.abort(requestSignal?.reason)

    if (requestSignal?.aborted) {
      abortFromCaller()
    } else {
      requestSignal?.addEventListener("abort", abortFromCaller, { once: true })
    }

    const timeout = setTimeout(() => controller.abort(timeoutReason()), timeoutMs)

    return fetchImpl(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timeout)
      requestSignal?.removeEventListener("abort", abortFromCaller)
    })
  }) as typeof fetch
}
