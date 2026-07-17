import { beforeEach, describe, expect, it, vi } from 'vitest'

const { feedbackError } = vi.hoisted(() => ({ feedbackError: vi.fn() }))

vi.mock('@/lib/feedback', () => ({
  feedback: { error: feedbackError },
}))

vi.mock('@/config/runtime', () => ({
  API_BASE_URL: 'http://test.invalid/api',
  apiUrl: (path: string) => `http://test.invalid/api${path}`,
}))

import { handleChatResponse } from './useChatBot'

describe('handleChatResponse', () => {
  beforeEach(() => feedbackError.mockReset())

  it('shows one stable feedback message for rate limiting', () => {
    handleChatResponse({ status: 429 } as Response)

    expect(feedbackError).toHaveBeenCalledWith('请求过于频繁，请稍后再试', {
      id: 'chat-rate-limited',
    })
  })

  it('does not inspect or alter successful streaming responses', () => {
    handleChatResponse({ status: 201 } as Response)
    expect(feedbackError).not.toHaveBeenCalled()
  })
})
