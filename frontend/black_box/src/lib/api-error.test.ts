import { describe, expect, it } from "vitest"

import { getApiErrorMessage } from "@/lib/api-error"

describe("getApiErrorMessage", () => {
  it("优先将 429 映射为统一限流文案", () => {
    expect(
      getApiErrorMessage(
        { response: { status: 429, data: { message: "provider detail" } } },
        "fallback"
      )
    ).toBe("操作太频繁，请稍后再试")
  })

  it("识别无响应的网络错误", () => {
    expect(getApiErrorMessage({ code: "ERR_NETWORK" }, "fallback")).toBe(
      "网络连接失败，请检查网络后重试"
    )
  })

  it("将 axios 超时与普通网络断开区分", () => {
    expect(getApiErrorMessage({ code: "ECONNABORTED" }, "fallback")).toBe(
      "请求超时，请稍后重试"
    )
    expect(getApiErrorMessage({ code: "ETIMEDOUT" }, "fallback")).toBe(
      "请求超时，请稍后重试"
    )
  })

  it("合并 Nest 数组消息并保留字符串消息", () => {
    expect(
      getApiErrorMessage(
        { response: { status: 400, data: { message: ["标题必填", "正文必填"] } } },
        "fallback"
      )
    ).toBe("标题必填；正文必填")
    expect(
      getApiErrorMessage(
        { response: { status: 400, data: { message: "提交失败" } } },
        "fallback"
      )
    ).toBe("提交失败")
  })

  it("未知错误不暴露技术 message", () => {
    expect(getApiErrorMessage(new Error("ECONNRESET at socket"), "请重试")).toBe(
      "请重试"
    )
  })
})
