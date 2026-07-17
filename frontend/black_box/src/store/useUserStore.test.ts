import { beforeEach, describe, expect, it, vi } from 'vitest'

const values = new Map<string, string>()
const memoryStorage = {
  get length() {
    return values.size
  },
  clear: () => values.clear(),
  getItem: (key: string) => values.get(key) ?? null,
  key: (index: number) => [...values.keys()][index] ?? null,
  removeItem: (key: string) => values.delete(key),
  setItem: (key: string, value: string) => values.set(key, value),
}
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memoryStorage,
})
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: memoryStorage },
})

import type { User } from '@/types'

vi.mock('@/api/user', () => ({
  doLogin: vi.fn(),
}))

const { doLogin } = await import('@/api/user')
const { useUserStore } = await import('@/store/useUserStore')

const baseState = {
  accessToken: '',
  refreshToken: '',
  user: null,
  isLogin: false,
}

describe('useUserStore user id contract', () => {
  beforeEach(() => {
    useUserStore.setState(baseState)
    vi.clearAllMocks()
  })

  it('normalizes a string id returned by an older login API', async () => {
    vi.mocked(doLogin).mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: '25', name: 'legacy-user', avatar: '' } as unknown as User,
    })

    await useUserStore.getState().login({
      name: 'legacy-user',
      password: 'Password123',
    })

    expect(useUserStore.getState().user?.id).toBe(25)
  })

  it('normalizes a string id restored from persisted state', () => {
    const merge = useUserStore.persist.getOptions().merge
    expect(merge).toBeTypeOf('function')
    if (!merge) return

    const merged = merge(
      {
        ...baseState,
        user: { id: '25', name: 'legacy-user', avatar: '' },
        isLogin: true,
      } as unknown as Partial<ReturnType<typeof useUserStore.getState>>,
      useUserStore.getState(),
    )

    expect(merged.user?.id).toBe(25)
  })
})
