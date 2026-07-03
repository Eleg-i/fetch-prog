import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fetch from '../src/index'

type FetchMock = ReturnType<typeof createFetchMock>

/**
 * 创建 fetch mock
 * @returns 返回 fetch mock 函数
 */
function createFetchMock() {
  return vi.fn((url: string, init?: RequestInit) => {
    void url
    void init

    return Promise.resolve(new Response(null, { status: 200, statusText: 'OK' }))
  })
}

/**
 * 获取最后一次请求参数
 * @param fetchMock fetch mock 函数
 * @returns 返回最后一次请求的 url 和 init
 */
function getLastRequest(fetchMock: FetchMock) {
  const lastCall = fetchMock.mock.calls.at(-1)

  if (!lastCall) throw new Error('fetch mock 未被调用')

  return {
    init: lastCall[1]!,
    url: lastCall[0]
  }
}

beforeEach(() => {
  vi.stubGlobal('self', globalThis)
  vi.stubGlobal('location', { origin: 'http://example.test' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Fetch 基础设施', () => {
  /**
   * 验证 Vitest 可以导入并实例化包入口。
   * @returns 无返回值
   */
  it('可以创建 Fetch 客户端实例', () => {
    const client = new Fetch()

    expect(client).toBeInstanceOf(Fetch)
  })
})

describe('Fetch API 行为', () => {
  /**
   * 验证 PATCH 请求会按带请求体方法发送。
   * @returns 无返回值
   */
  it('PATCH 请求会携带序列化后的请求体', async () => {
    const fetchMock = createFetchMock()

    vi.stubGlobal('fetch', fetchMock)

    const client = new Fetch()

    await client.fetch({
      url: '/users/1',
      method: 'PATCH',
      data: { name: 'new-name' }
    })

    const { init, url } = getLastRequest(fetchMock)

    expect(url).toBe('/users/1')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ name: 'new-name' }))
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' })
  })

  /**
   * 验证 GET 类请求会使用 paramsSerializer 序列化对象 data。
   * @returns 无返回值
   */
  it('GET 请求会使用 paramsSerializer 生成查询字符串', async () => {
    const fetchMock = createFetchMock()
    const paramsSerializer = vi.fn(() => 'page=1&keyword=fetch')

    vi.stubGlobal('fetch', fetchMock)

    const client = new Fetch()

    await client.fetch({
      url: '/articles',
      method: 'GET',
      data: { page: 1, keyword: 'fetch' },
      paramsSerializer
    })

    const { init, url } = getLastRequest(fetchMock)

    expect(paramsSerializer).toHaveBeenCalledWith({ page: 1, keyword: 'fetch' })
    expect(url).toBe('/articles?page=1&keyword=fetch')
    expect(init.body).toBeUndefined()
  })

  /**
   * 验证 FormData 请求不会手动设置 content-type。
   * @returns 无返回值
   */
  it('FormData 请求不主动设置 content-type', async () => {
    const fetchMock = createFetchMock()
    const formData = new FormData()

    vi.stubGlobal('fetch', fetchMock)

    formData.append('name', 'fetch-prog')

    const client = new Fetch()

    await client.fetch({
      url: '/upload',
      method: 'POST',
      data: formData
    })

    const { init } = getLastRequest(fetchMock)

    expect(init.body).toBe(formData)
    expect(init.headers).not.toHaveProperty('content-type')
  })

  /**
   * 验证 guard 返回的 id 可以稳定移除指定请求拦截器。
   * @returns 无返回值
   */
  it('unGuard 会移除指定请求拦截器且不影响后续 id', async () => {
    const fetchMock = createFetchMock()
    const firstGuard = vi.fn(config => ({
      ...config,
      headers: {
        ...(config.headers as Record<string, string> | undefined),
        'x-first': '1'
      }
    }))
    const secondGuard = vi.fn(config => ({
      ...config,
      headers: {
        ...(config.headers as Record<string, string> | undefined),
        'x-second': '2'
      }
    }))

    vi.stubGlobal('fetch', fetchMock)

    const client = new Fetch()
    const firstIds = client.guard({ request: firstGuard })
    const secondIds = client.guard({ request: secondGuard })

    client.unGuard({ request: firstIds.request })

    await client.fetch({ url: '/guarded' })

    const { init } = getLastRequest(fetchMock)

    expect(firstIds.request).toBe(0)
    expect(secondIds.request).toBe(1)
    expect(firstGuard).not.toHaveBeenCalled()
    expect(secondGuard).toHaveBeenCalledOnce()
    expect(init.headers).toMatchObject({ 'x-second': '2' })
    expect(init.headers).not.toHaveProperty('x-first')
  })

  /**
   * 验证对象 data 清理 undefined 时不会修改调用方对象。
   * @returns 无返回值
   */
  it('清理对象 data 的 undefined 字段时不会修改原始对象', async () => {
    const fetchMock = createFetchMock()
    const data = {
      name: 'fetch-prog',
      ignored: void 0,
      nested: {
        kept: 'yes',
        ignored: void 0
      }
    }

    vi.stubGlobal('fetch', fetchMock)

    const client = new Fetch()

    await client.fetch({
      url: '/payload',
      method: 'POST',
      data
    })

    const { init } = getLastRequest(fetchMock)

    expect(Object.hasOwn(data, 'ignored')).toBe(true)
    expect(Object.hasOwn(data.nested, 'ignored')).toBe(true)
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'fetch-prog',
      nested: {
        kept: 'yes'
      }
    })
  })
})
