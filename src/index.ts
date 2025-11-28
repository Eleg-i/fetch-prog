import { merge } from '../node_modules/es-toolkit/dist/object/merge.mjs'
import { pipeThroughWithError, type Progress } from './utils/bytes'
import { treeShake } from './utils/object'
import { isSameOrigin, joinPath } from './utils/url'

type GuardError = (err: FetchError) => Promise<FetchError | void> | FetchError | void
type GuradRequest = (config: Options) => Options
// 响应拦截器，在第一个拦截器中接收 Response，后续接收上一个拦截器的返回值，报错返回 undefined
type GuardResponse = (config: Options, res: Response | ModResponse) => unknown

interface AbortEvent extends Event {
  currentTarget:
    | (EventTarget & {
        reason: string
      })
    | null
}

export interface ModResponse extends Response {
  readonly data: Promise<Serializable | ArrayBuffer | FormData>
  readonly cookies: Record<string, string>
  readonly _originalResponse?: ModResponse
}

type GuardType = {
  request?: GuradRequest | { handler?: GuradRequest; errorHandler?: GuardError }
  response?: GuardResponse | { handler?: GuardResponse; errorHandler?: GuardError }
}

type Body = Serializable | ReadableStream<Uint8Array>

// 请求选项
interface Options {
  // `url` 是用于请求的服务器 URL，必传参数
  url: string

  // `method` 是创建请求时使用的方法，默认是 GET
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

  // `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
  // 它可以通过设置一个 `baseURL` 便于为 axios 实例的方法传递相对 URL
  baseURL?: string

  // 自定义请求头
  headers?: HeadersInit

  // `paramsSerializer`是可选方法，主要用于序列化`params`
  paramsSerializer?: (params: object) => string

  // 需要发送的数据，对 POST 请求，会先序列化后发送，对于 GET 请求，会将键值对的 value 按 URL 编码序列化。
  data?: Body

  params?: Record<string, SerializableValue> | SerializableValue[]

  // 请求内容长度
  contentLength?: number

  // `timeout` 指定请求超时的毫秒数。
  // 如果请求时间超过 `timeout` 的值，则请求会被中断
  timeout?: number // 默认值是 `6000` (一分钟超时)

  // `withCredentials` 表示请求时是否需要使用凭证
  withCredentials?: boolean // default false

  // 是否为重试请求
  isRetry?: boolean

  // 请求优先级
  priority?: 'high' | 'low' | 'auto'

  // 重定向
  redirect?: 'follow' | 'error' | 'manual'

  // 缓存
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'

  // “keepalive”请求的正文大小限制为64 KiB。
  keepalive?: boolean

  // 请求的referrer
  referrer?: string

  // 请求的referrer策略
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'

  signal?: AbortSignal

  // 上传进度
  onUploadProgress?: (progress: Progress) => void

  // 异常处理
  onerror?: GuardError

  extra?: Record<string, any>
}

export type { FetchError, Options }

const ErrorStack = new WeakMap<object, FetchError>()

/**
 * 请求错误
 */
class FetchError extends Error {
  // code: number

  status: number

  config: Options

  /**
   * 构造器
   * @param message 错误信息
   * @param status  状态码
   * @param config  请求配置
   */
  constructor(message: string, status: number, config: Options) {
    super(message)

    // this.code = Number(status)
    this.status = status
    this.config = config
  }
}

/**
 * 生成拦截器
 * @returns 拦截器
 */
class Interceptors<T extends GuradRequest | GuardResponse> {
  handlers: T[]

  errorHandlers: GuardError[]

  /**
   * 构造器
   */
  constructor() {
    this.handlers = []
    this.errorHandlers = []
  }

  /**
   * 使用拦截器
   * @param handler     请求拦截器
   * @param errorHander 错误拦截器
   * @returns 返回拦截器 索引
   */
  use(handler: T, errorHander?: GuardError) {
    if (handler) this.handlers.push(handler)
    if (errorHander) this.errorHandlers.push(errorHander)

    return this.handlers.length - 1
  }

  /**
   * 删除拦截器
   * @param id 拦截器索引
   * @todo 这里的移除有问题，id 是索引，但是这样移除会修改数组长度，并移动后续拦截器所在的索引，会导致后续第二次 eject 时会移除错误的 handler
   */
  eject(id: number) {
    this.handlers.splice(id, 1)
  }

  /**
   * 清除拦截器
   */
  clear() {
    this.handlers = []
  }
}

/**
 * Fetch 请求
 */
export default class Fetch {
  #fetchDefaultOpt: {
    baseURL: string
    timeout: number
    withCredentials?: boolean
    extra?: Record<string, any>
  }

  // 拦截器
  #interceptors: {
    request: Interceptors<GuradRequest>
    response: Interceptors<GuardResponse>
  }

  /**
   * 构造函数
   * @param opt                 请求客户端初始化配置选项
   * @param opt.timeout         超时时间
   * @param opt.withCredentials 是否携带凭据
   * @param opt.baseURL         基准地址
   * @param opt.extra           额外参数
   */
  constructor(
    {
      baseURL = '',
      timeout = 1000 * 60,
      withCredentials,
      extra
    }: Pick<Options, 'baseURL' | 'timeout' | 'withCredentials' | 'extra'> = {
      baseURL: '',
      timeout: 1000 * 60
    }
  ) {
    this.#interceptors = {
      request: new Interceptors<GuradRequest>(),
      response: new Interceptors<GuardResponse>()
    }

    this.#fetchDefaultOpt = {
      baseURL,
      timeout,
      withCredentials,
      extra
    }
  }

  /**
   * 发送 http 请求
   * @param opt                   请求选项
   * @param opt.url               请求地址
   * @param [opt.method]          请求方法
   * @param [opt.baseURL]         请求基准地址
   * @param [opt.headers]         请求头
   * @param [opt.data]            请求载荷
   * @param [opt.timeout]         超时时间
   * @param [opt.withCredentials] 是否携带凭据
   * @param [opt.isRetry]         是否为重试请求
   * @returns 返回响应
   */
  fetch<
    T extends Serializable = undefined,
    R = Omit<Response, 'data'> & {
      data: T
    }
  >(opt: Options): Promise<R> {
    const { url, method = 'GET' } = opt

    if (!url) throw new Error('请求地址不能为空！')

    const { data } = opt

    // 清除未定义值的参数
    if (typeof data === 'object' && data && !Array.isArray(data)) treeShake(data)

    const mergedOpt = merge({ ...this.#fetchDefaultOpt }, opt)

    if (['GET', 'DELETE', 'OPTIONS', 'HEAD'].includes(method))
      return this.#get(mergedOpt) as Promise<R>

    if (['POST', 'PUT'].includes(method)) return this.#post(mergedOpt) as Promise<R>

    throw new Error(`请求方法 ${method} 不允许！`)
  }

  /**
   * get 请求
   * @param opt 请求选项
   * @returns 返回响应
   */
  #get(opt: Options) {
    const { data, url, params } = opt
    const originHost = url.match(/^(http|https):\/\/[^/]+/)?.[0]
    const urlParsed = new URL(url, 'http://tmp')
    const urlSearchParams = new URLSearchParams(urlParsed.search)

    if (data) {
      if (typeof data === 'string') urlParsed.search = data
      else if (data instanceof ArrayBuffer || data instanceof FormData)
        throw new Error('在 GET 请求中不允许的载荷数据类型！')
      else if (typeof data === 'object' && data !== null) {
        const _data = data as SerializableObject

        for (const _key in _data) {
          const key = typeof _key === 'string' ? _key : JSON.stringify(_key)
          const _value = _data[key]
          const value = typeof _value === 'string' ? _value : JSON.stringify(_value)

          urlSearchParams.append(key, value)
          urlParsed.search = urlSearchParams.toString()
        }
      }
    }

    if (params)
      if (Array.isArray(params))
        for (const param of params) {
          urlParsed.pathname = joinPath(urlParsed.pathname, param as string)
        }
      else
        for (const key in params) {
          const value = params[key] as string

          urlParsed.pathname = joinPath(urlParsed.pathname, value)
        }

    const { pathname, search, hash } = urlParsed
    const getUrl = `${originHost ? originHost : ''}${pathname}${search}${hash}`

    return this.#fetch({
      ...opt,
      url: getUrl,
      data: void 0
    })
  }

  /**
   * post 请求
   * @param opt 请求选项
   * @returns 返回响应
   */
  #post(opt: Options) {
    return this.#fetch(opt)
  }

  /**
   * 发送 fetch 请求
   * @param opt 请求选项
   * @returns 返回响应
   */
  async #fetch(opt: Options) {
    var req,
        contentType,
        headers: Record<string, string> = {}

    const abortController = new AbortController()
    const reqHandlers = this.#interceptors.request.handlers
    const transfOpt = reqHandlers.reduce((acc, handler) => handler(acc), opt as Options) as Options
    const {
      baseURL: baseUrl,
      cache,
      contentLength,
      data,
      headers: headersOpt = {},
      keepalive,
      method,
      onUploadProgress,
      priority,
      redirect,
      referrer,
      referrerPolicy,
      signal: innerSignal,
      timeout,
      url: _url,
      withCredentials: _withCredentials
    } = transfOpt
    const url = genUrlByBase(_url, baseUrl)
    const withCredentials = _withCredentials ?? isSameOrigin(url)
    let body = genSerializedData(data!),
        duplex: 'half' | 'full' | undefined

    if (body instanceof ReadableStream) {
      body = handleUploadProgress({
        progressCallback: onUploadProgress,
        errorCallback: err => {
          ErrorStack.set(transfOpt, new FetchError(`传输流错误：${err.message}`, 419, transfOpt))
        },
        contentLength,
        progress: true,
        speed: true,
        stream: body,
        signal: abortController.signal
      })
      duplex = 'half'
    }

    if (Array.isArray(headersOpt)) {
      contentType = headersOpt.find(([key]) => key === 'content-type')?.[1]
      headers = Object.fromEntries(headersOpt)
    } else if (headersOpt) {
      const hd = headersOpt as Record<string, string>

      contentType = hd['content-type']
      headers = hd
    }

    contentType ??= genContentType(data)

    if (contentType) headers['content-type'] = contentType

    innerSignal?.addEventListener('abort', _event => {
      const { currentTarget } = _event as AbortEvent

      abortController.abort(currentTarget?.reason)
    })

    const fetchInit: RequestInit = {
      body,
      cache,
      credentials: withCredentials ? 'include' : 'same-origin',
      duplex,
      headers,
      keepalive,
      method,
      priority,
      redirect,
      referrer,
      referrerPolicy,
      signal: abortController.signal
    }

    try {
      req = self.fetch(url, fetchInit)
    } catch (err: any) {
      const finalError = await this.#handleReqError({
        message: err.message,
        status: 400,
        opt: transfOpt
      })

      if (finalError) throw finalError

      return
    }

    const timer = setTimeout(() => {
      abortController.abort('request timeout')
    }, timeout)

    ;(async () => {
      // 处理请求发起时的网络异常错误或者浏览器内部错误
      try {
        await req
      } catch (err: any) {
        let innerErr = err as FetchError

        if (typeof err === 'string') innerErr = new FetchError(err, 418, transfOpt)
        if (ErrorStack.has(transfOpt)) innerErr = ErrorStack.get(transfOpt)!

        const finalError = await this.#handleReqError({
          message: innerErr.message,
          status: innerErr.status ?? 400,
          opt: transfOpt
        })

        if (finalError) throw finalError
      } finally {
        clearTimeout(timer)
      }
    })()

    let result: ModResponse | Response | undefined = await req
    const { status, statusText, ok } = result
    const resHandlers = this.#interceptors.response.handlers

    if (!ok)
      await this.#handleResError({
        status,
        statusText,
        opt: transfOpt
      })

    for (const handler of resHandlers) result = (await handler(transfOpt, result)) as ModResponse

    return result!
  }

  /**
   * 处理响应错误
   * @param err            错误
   * @param err.message    错误信息
   * @param err.status     状态码
   * @param err.statusText 状态码描述
   * @param err.opt        请求选项
   */
  async #handleResError({
    message,
    status,
    statusText,
    opt
  }: {
    message?: string
    status: number
    statusText?: string
    opt: Options
  }) {
    let innerErr: FetchError = new FetchError(
      message ?? statusText ?? '未知的服务错误',
      status,
      opt
    )
    const { onerror: firstErrorHandler } = opt
    const resErrHanders = this.#interceptors.response.errorHandlers

    if (firstErrorHandler) {
      const nextError = await firstErrorHandler(
        new FetchError(innerErr?.message ?? '', innerErr?.status ?? 500, opt)
      )

      if (nextError) innerErr = nextError
      else return
    }

    for (const handler of resErrHanders) {
      const nextError = await handler(
        new FetchError(innerErr?.message ?? '', innerErr?.status ?? 500, opt)
      )

      if (nextError) innerErr = nextError
      else return
    }

    return innerErr
  }

  /**
   * 处理请求错误
   * @param err            错误
   * @param err.message    错误信息
   * @param err.status     状态码
   * @param err.statusText 状态码描述
   * @param err.opt        请求选项
   */
  async #handleReqError({
    message,
    status,
    statusText,
    opt
  }: {
    message?: string
    status: number
    statusText?: string
    opt: Options
  }) {
    let innerErr: FetchError | void = new FetchError(
      message ?? statusText ?? '未知的网络错误',
      status,
      opt
    )
    const { onerror: firstErrorHandler } = opt
    const reqErrHanders = this.#interceptors.request.errorHandlers

    if (firstErrorHandler) {
      const nextError = await firstErrorHandler(
        new FetchError(innerErr?.message ?? '', innerErr?.status ?? 400, opt)
      )

      if (nextError) innerErr = nextError
      else return
    }

    for (const handler of reqErrHanders) {
      const nextError = await handler(
        new FetchError(innerErr?.message ?? '', innerErr?.status ?? 400, opt)
      )

      if (nextError) innerErr = nextError
      else return
    }

    return innerErr
  }

  /**
   * 设置 fetch 守卫
   * @param guardOpt          守卫设置
   * @param guardOpt.request  请求守卫
   * @param guardOpt.response 响应守卫
   */
  guard({ request, response }: GuardType) {
    if (typeof request === 'function') {
      this.#interceptors.request.use(request)
    } else if (request?.handler) {
      this.#interceptors.request.use(request.handler, request?.errorHandler)
    }

    if (typeof response === 'function') {
      this.#interceptors.response.use(response)
    } else if (response?.handler) {
      this.#interceptors.response.use(response.handler, response?.errorHandler)
    }
  }

  /**
   * 移除 fetch 守卫
   * @param guardOpt          守卫设置
   * @param guardOpt.request  请求守卫 id
   * @param guardOpt.response 响应守卫 id
   */
  unGuard({ request, response }: { request?: number; response?: number }) {
    if (request !== void 0) this.#interceptors.request.eject(request)

    if (response !== void 0) this.#interceptors.response.eject(response)
  }
}

/**
 * 序列化对象
 * @param url     请求地址
 * @param baseURL 基准地址
 * @returns 返回序列化后的对象
 */
function genUrlByBase(url: string, baseURL?: string) {
  if (url.startsWith('http') || !baseURL) return url
  else {
    const parsedBaseURL = new URL(baseURL, 'http://tmp')

    if (!parsedBaseURL.pathname.endsWith('/')) parsedBaseURL.pathname += '/'
    const { pathname, search, hash } = new URL(url.replace(/^\//, ''), parsedBaseURL)

    return `${pathname}${search}${hash}`
  }
}

// 可序列化类型序列化后的类型
type SerializedData =
  | Exclude<SerializableValue, number | boolean | null | Date>
  | ReadableStream<Uint8Array>

/**
 * 序列化对象
 * @param data 要序列化的数据
 * @returns 返回序列化后的数据
 */
function genSerializedData(data: Body): SerializedData {
  if (
    typeof data === 'object' &&
    !(
      data instanceof FormData ||
      data instanceof ArrayBuffer ||
      data instanceof Blob ||
      data instanceof Date ||
      data instanceof ReadableStream
    )
  )
    return JSON.stringify(data)
  else return data as SerializedData
}

/**
 * 生成内容类型
 * @param [data] 数据
 * @returns 返回内容类型
 */
function genContentType(data?: Body) {
  if (data instanceof FormData) {
    for (const pair of data.entries()) {
      if (pair[1] instanceof File) return 'multipart/form-data'
    }

    return 'application/x-www-form-urlencoded'
  } else if (
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof ReadableStream
  )
    return 'application/octet-stream'
  else if (data instanceof Blob) return data.type
  else if (typeof data === 'string') return 'text/plain'
  else if (typeof data === 'object') return 'application/json'
  else return
}

/**
 * 处理上传进度
 * @param opt                  参数
 * @param opt.stream           待处理的流
 * @param opt.contentLength    待处理的流总长度
 * @param opt.speed            是否显示速度
 * @param opt.progress         是否显示进度
 * @param opt.progressCallback 进度回调函数
 * @param opt.errorCallback    错误回调函数
 * @param opt.signal           中断信号
 */
function handleUploadProgress({
  stream,
  contentLength,
  speed,
  progress,
  signal,
  progressCallback,
  errorCallback
}: {
  stream: ReadableStream<Uint8Array>
  contentLength?: number
  speed: boolean
  progress: boolean
  signal?: AbortSignal
  progressCallback?: (arg0: Progress) => void
  errorCallback: (res: Error) => void
}) {
  if (stream instanceof ReadableStream)
    if (progressCallback) {
      let abortFunc: (abort: (reson?: string) => void) => void | undefined

      if (signal)
        /**
         * 发起流中断的方法
         * @param abort 中断流的方法
         */
        abortFunc = abort =>
          signal.addEventListener('abort', _event => {
            const { currentTarget } = _event as AbortEvent

            abort(currentTarget?.reason ?? '请求已中断')
          })

      return pipeThroughWithError(stream, {
        contentLength,
        progressCallback,
        errorCallback,
        speed,
        progress,
        abort: abortFunc!
      })
    } else {
      console.warn('未指定进度回调函数，将返回原始流')

      return stream
    }
  else throw new Error('请传入 ReadableStream')
}
