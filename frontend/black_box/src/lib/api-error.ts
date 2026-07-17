interface ApiErrorShape {
  code?: string
  isAxiosError?: boolean
  request?: unknown
  response?: {
    status?: number
    data?: {
      message?: string | string[]
    }
  }
}

function isApiErrorShape(error: unknown): error is ApiErrorShape {
  return typeof error === "object" && error !== null
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isApiErrorShape(error)) return fallback

  if (error.response?.status === 429) {
    return "操作太频繁，请稍后再试"
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "请求超时，请稍后重试"
  }

  if (
    error.code === "ERR_NETWORK" ||
    (error.isAxiosError === true && error.request && !error.response)
  ) {
    return "网络连接失败，请检查网络后重试"
  }

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.join("；")
  if (typeof message === "string" && message.trim()) return message

  return fallback
}
