# fetch-prog API

## 目录

- [概览](#概览)
- [公开导出](#公开导出)
- [Fetch 类](#fetch-类)
- [构造函数参数](#构造函数参数)
- [fetch 方法](#fetch-方法)
- [请求配置 Options](#请求配置-options)
- [请求体 data](#请求体-data)
- [进度回调参数](#进度回调参数)
- [拦截器 guard](#拦截器-guard)
- [移除拦截器 unGuard](#移除拦截器-unguard)
- [FetchError](#fetcherror)
- [导出类型](#导出类型)
- [Web 标准引用](#web-标准引用)
- [当前实现注意点](#当前实现注意点)

## 概览

`fetch-prog` 是一个基于浏览器原生 `fetch` 的请求客户端。它默认导出 `Fetch` 类，提供：

| 能力 | 说明 |
|------|------|
| 请求发送 | 通过 `client.fetch(options)` 发送 HTTP 请求 |
| 默认配置 | 构造实例时设置 `baseURL`、`timeout`、`withCredentials`、`extra` |
| 请求/响应拦截 | 通过 `guard()` 注册请求和响应处理函数 |
| 上传进度 | 当 `data` 是 `ReadableStream<Uint8Array>` 时，可通过 `onUploadProgress` 接收进度 |
| 错误封装 | 网络错误、HTTP 非 2xx 响应会包装为 `FetchError` |
| 类型约束 | 提供 `Options`、`FetchError`、`ExtendableResponse`、`LooseFetchData`、`SerializableParam` |

## 公开导出

| 导出 | 类型 | 说明 |
|------|------|------|
| `default` | `typeof Fetch` | 默认导出的请求客户端类 |
| `FetchError` | class | 请求或响应错误类型 |
| `Options` | interface | `fetch()` 的请求配置类型 |
| `ExtendableResponse<E>` | type | 基于原生 `Response` 的可扩展响应类型 |
| `LooseFetchData` | type | 普通请求模式下允许的 `data` 类型 |
| `SerializableParam<T>` | type | 双泛型请求模式下用于约束 `data` 可序列化的类型 |

## Fetch 类

```typescript
import Fetch from 'fetch-prog'

const client = new Fetch({
  baseURL: '/api',
  timeout: 60_000,
  withCredentials: true,
  extra: {}
})
```

`Fetch` 实例持有默认请求配置和拦截器。实例方法包括：

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `fetch<TRes>(opt)` | 请求配置 | `Promise<TRes>` | 发送请求，默认响应类型是 `ExtendableResponse` |
| `fetch<TRes, TData>(opt)` | 请求配置 | `Promise<TRes>` | 发送请求，并约束 `data` 必须匹配 `TData` 且可序列化 |
| `guard(guardOpt)` | 拦截器配置 | `{ request?: number; response?: number }` | 注册请求/响应拦截器，并返回可用于移除的索引 |
| `unGuard(opt)` | 拦截器索引配置 | `void` | 移除指定请求/响应拦截器 |

## 构造函数参数

```typescript
new Fetch(options?: Pick<Options, 'baseURL' | 'timeout' | 'withCredentials' | 'extra'>)
```

| 参数 | 类型 | 必填 | 默认值 | 作用 |
|------|------|------|--------|------|
| `baseURL` | `string` | 否 | `''` | 请求基准地址。请求时会与相对 `url` 组合 |
| `timeout` | `number` | 否 | `60000` | 请求超时时间，单位毫秒。超时后内部 `AbortController` 会中断请求 |
| `withCredentials` | `boolean` | 否 | 未显式设置 | 是否携带凭证。未设置时，当前实现会根据请求是否同源自动决定 |
| `extra` | `Record<string, any>` | 否 | 未设置 | 透传的额外配置，会合并到每次请求配置中，供拦截器或业务代码读取 |

## fetch 方法

### 普通模式

```typescript
fetch<TRes = ExtendableResponse>(
  opt: Omit<Options, 'data'> & {
    data?: LooseFetchData
  }
): Promise<TRes>
```

普通模式适合直接传入对象字面量、字符串、`FormData`、`Blob`、`ArrayBuffer` 或 `ReadableStream` 等请求体。未传 `TRes` 时，返回值类型为 `Promise<ExtendableResponse>`，运行时默认是原生 `Response`。

### 契约模式

```typescript
fetch<TRes, TData>(
  opt: Omit<Options, 'data'> & {
    data?: SerializableParam<TData>
  }
): Promise<TRes>
```

契约模式适合请求体已有业务接口类型的场景。`TData` 会被映射为可序列化约束，`function`、`symbol`、`bigint`、`any` 等不符合可序列化约束的值会在类型层面被拒绝。

### 分发行为

| `method` | 当前处理方式 |
|----------|--------------|
| 未传 | 按 `GET` 处理 |
| `GET`、`DELETE`、`OPTIONS`、`HEAD` | 走 URL 查询参数和路径参数处理，最终不传请求体 |
| `POST`、`PUT`、`PATCH` | 走请求体序列化处理 |

## 请求配置 Options

```typescript
interface Options {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  baseURL?: string
  headers?: HeadersInit
  paramsSerializer?: (params: object) => string
  data?: LooseFetchData
  params?: Record<string, SerializableValue> | SerializableValue[]
  contentLength?: number
  timeout?: number
  withCredentials?: boolean
  isRetry?: boolean
  priority?: 'high' | 'low' | 'auto'
  redirect?: 'follow' | 'error' | 'manual'
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'
  keepalive?: boolean
  referrer?: string
  referrerPolicy?: ReferrerPolicy
  signal?: AbortSignal
  onUploadProgress?: (progress: ProgressLike) => void
  onDownloadProgress?: (progress: ProgressLike) => void
  onerror?: (err: FetchError) => Promise<FetchError | void> | FetchError | void
  extra?: Record<string, any>
}
```

| 参数 | 类型 | 必填 | 默认值 | 作用 |
|------|------|------|--------|------|
| `url` | `string` | 是 | 无 | 请求地址。为空时立即抛出 `请求地址不能为空！` |
| `method` | 字符串联合类型 | 否 | `'GET'` | 请求方法。当前实际支持见 [分发行为](#分发行为) |
| `baseURL` | `string` | 否 | 构造函数中的 `baseURL` 或 `''` | 与相对 `url` 组合生成最终请求地址 |
| `headers` | `HeadersInit` | 否 | `{}` | 请求头。支持对象或二维数组形式 |
| `paramsSerializer` | `(params: object) => string` | 否 | 无 | 自定义 GET 类请求中对象 `data` 的查询字符串序列化 |
| `data` | `LooseFetchData` / `SerializableParam<TData>` | 否 | 无 | 请求数据。GET 类请求会转为查询字符串；POST/PUT/PATCH 会作为请求体发送 |
| `params` | `Record<string, SerializableValue> \| SerializableValue[]` | 否 | 无 | RESTful 路径参数。对象会按属性值追加到路径；数组会按顺序追加到路径 |
| `contentLength` | `number` | 否 | 无 | 上传流总字节数，用于计算 `progress` 和 `total` |
| `timeout` | `number` | 否 | 构造函数中的 `timeout` 或 `60000` | 请求超时时间，单位毫秒 |
| `withCredentials` | `boolean` | 否 | 同源请求自动为 `true`，跨源自动为 `false` | 控制 `fetch` 的 `credentials`，`true` 对应 `'include'`，`false` 对应 `'same-origin'` |
| `isRetry` | `boolean` | 否 | 无 | 标记是否为重试请求。当前库内部不主动使用，适合拦截器或业务代码读取 |
| `priority` | `'high' \| 'low' \| 'auto'` | 否 | 浏览器默认 | 透传给 `fetch` 的请求优先级 |
| `redirect` | `'follow' \| 'error' \| 'manual'` | 否 | 浏览器默认 | 透传给 `fetch` 的重定向策略 |
| `cache` | Request cache 字符串联合类型 | 否 | 浏览器默认 | 透传给 `fetch` 的缓存策略 |
| `keepalive` | `boolean` | 否 | 浏览器默认 | 透传给 `fetch` 的 `keepalive` |
| `referrer` | `string` | 否 | 浏览器默认 | 透传给 `fetch` 的 referrer |
| `referrerPolicy` | Referrer policy 字符串联合类型 | 否 | 浏览器默认 | 透传给 `fetch` 的 referrer 策略 |
| `signal` | `AbortSignal` | 否 | 无 | 外部取消信号。触发后会中断内部请求 |
| `onUploadProgress` | `(progress) => void` | 否 | 无 | 上传进度回调。仅当 `data` 是 `ReadableStream<Uint8Array>` 且传入该回调时生效 |
| `onDownloadProgress` | `(progress) => void` | 否 | 无 | 类型中存在，但当前实现尚未处理下载进度 |
| `onerror` | 错误处理函数 | 否 | 无 | 单次请求级错误处理器。返回错误会继续抛出；返回 `void` 会吞掉错误 |
| `extra` | `Record<string, any>` | 否 | 构造函数中的 `extra` | 额外配置，当前库内部不主动使用，适合拦截器或业务读取 |

## 请求体 data

### 支持类型

`LooseFetchData` 支持：

| 类型 | 发送行为 |
|------|----------|
| 普通对象 / 数组 | 非 GET 类请求中会复制并清理 `undefined` 字段，再 `JSON.stringify(data)`，并默认设置 `content-type: application/json` |
| `string` | 原样作为请求体，默认 `content-type: text/plain` |
| `FormData` | 原样作为请求体；不主动设置 `content-type`，交给浏览器自动处理 multipart boundary |
| `ArrayBuffer` | 原样作为请求体，默认 `content-type: application/octet-stream` |
| `Blob` | 原样作为请求体，默认使用 `blob.type` |
| `ReadableStream<Uint8Array>` | 原样或包裹进度处理后作为请求体，默认 `content-type: application/octet-stream`，并设置 `duplex: 'half'` |

### GET 类请求中的 data

`GET`、`DELETE`、`OPTIONS`、`HEAD` 会先处理 `data`，再把请求体清空：

| `data` 类型 | 行为 |
|-------------|------|
| `string` | 直接作为 URL search 部分 |
| 普通对象 | 每个属性追加到查询字符串。非字符串值会 `JSON.stringify` 后追加 |
| `ArrayBuffer` / `FormData` | 抛出 `在 GET 请求中不允许的载荷数据类型！` |

### params 路径参数

`params` 用于把值追加到 URL 路径末尾：

```typescript
await client.fetch({
  url: '/users',
  params: { id: 1 }
})
```

当前实现只使用对象属性的值，不使用属性名。数组形式会按数组顺序追加。

## 进度回调参数

`Progress` 当前不是根入口的命名导出类型，但 `onUploadProgress` 会收到同形状对象：

```typescript
interface ProgressLike {
  progress?: number
  speed?: number
  speedText?: string
  total?: number
  transferred: number
}
```

| 属性 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `transferred` | `number` | 是 | 已传输字节数 |
| `total` | `number` | 否 | 总字节数，来自 `contentLength` |
| `progress` | `number` | 否 | 进度百分比，范围通常为 `0-100`。只有传入 `contentLength` 且启用进度计算时才有值 |
| `speed` | `number` | 否 | 传输速度，单位字节/秒 |
| `speedText` | `string` | 否 | 格式化后的速度文本，如 `2.5 MB/s` |

## 拦截器 guard

```typescript
client.guard({
  request: config => config,
  response: (config, response) => response
})
```

### 参数结构

```typescript
type GuardError = (err: FetchError) => Promise<FetchError | void> | FetchError | void
type GuardRequest = (config: Options) => Options
type GuardResponse = (config: Options, res: ExtendableResponse) => unknown

type GuardType = {
  request?: GuardRequest | { handler?: GuardRequest; errorHandler?: GuardError }
  response?: GuardResponse | { handler?: GuardResponse; errorHandler?: GuardError }
}
```

| 参数 | 类型 | 作用 |
|------|------|------|
| `request` | `GuardRequest` | 请求发出前执行。接收当前 `Options`，必须返回新的或修改后的 `Options` |
| `request.handler` | `GuardRequest` | 对象形式的请求拦截器 |
| `request.errorHandler` | `GuardError` | 请求阶段错误处理器 |
| `response` | `GuardResponse` | 收到响应后执行。接收最终请求配置和当前响应/上一个响应拦截器返回值 |
| `response.handler` | `GuardResponse` | 对象形式的响应拦截器 |
| `response.errorHandler` | `GuardError` | 响应阶段错误处理器 |

### 返回值

`guard()` 返回已注册拦截器的索引：

```typescript
{
  request?: number
  response?: number
}
```

请求拦截器内部会按注册顺序执行。响应拦截器也会按注册顺序执行，前一个响应拦截器的返回值会成为后续处理链中的结果，并最终成为 `fetch()` 的 resolved value。

错误处理器规则：

| 返回值 | 行为 |
|--------|------|
| `FetchError` | 继续把该错误交给下一个错误处理器，最后抛出 |
| `Promise<FetchError>` | 等待后同上 |
| `void` / `undefined` | 认为错误已被处理，停止继续抛出 |

## 移除拦截器 unGuard

```typescript
client.unGuard({
  request: 0,
  response: 0
})
```

| 参数 | 类型 | 必填 | 作用 |
|------|------|------|------|
| `request` | `number` | 否 | 要移除的请求拦截器索引 |
| `response` | `number` | 否 | 要移除的响应拦截器索引 |

`unGuard()` 返回 `void`。`guard()` 返回的索引可直接传给 `unGuard()`。底层会记录已移除索引并在执行时跳过，不会移动后续拦截器索引。

## FetchError

```typescript
class FetchError extends Error {
  status: number
  config: Options

  constructor(message: string, status: number, config: Options)
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `message` | `string` | 错误信息，继承自 `Error` |
| `status` | `number` | HTTP 状态码或库内部定义的错误状态码 |
| `config` | `Options` | 发生错误时的请求配置 |

常见内部状态码：

| 状态码 | 来源 | 说明 |
|--------|------|------|
| `400` | 请求构造或浏览器内部请求错误 | 请求发起失败时的默认状态码 |
| `418` | 请求阶段捕获到字符串错误 | 字符串错误被包装为 `FetchError` |
| `419` | 上传流读取错误 | `ReadableStream` 传输错误 |
| HTTP 响应状态码 | 响应 `ok === false` | 例如 `401`、`404`、`500` |

## 导出类型

### ExtendableResponse

```typescript
type ExtendableResponse<E extends object = object> = Response & E
```

用于描述响应拦截器给原生 `Response` 追加的业务字段：

```typescript
type AppResponse = ExtendableResponse<{
  readonly data: Promise<unknown>
}>
```

如果不传泛型，默认等价于可扩展的原生 `Response`。标准 `Response` 属性和方法见 [MDN Response](https://developer.mozilla.org/docs/Web/API/Response)。

### LooseFetchData

```typescript
type LooseFetchData =
  | LooseSerializableRoot
  | ReadableStream<Uint8Array>
  | FormData
  | ArrayBuffer
  | Blob
  | string
```

普通 `fetch<TRes>()` 模式下的请求体类型。`LooseSerializableRoot` 是 JSON-like 对象或数组根类型，叶子值包括 `string`、`number`、`boolean`、`null`、`undefined`、`Date`、装箱 `String` / `Number` / `Boolean`。

### SerializableParam

```typescript
type SerializableParam<T> = T & SerializableRootOf<T>
```

用于 `fetch<TRes, TData>()`，要求 `data` 与 `TData` 匹配并保持可序列化。根类型必须是对象或数组；函数、`any`、不可序列化叶子值会被排除。

### Options

`Options` 是请求配置接口，详见 [请求配置 Options](#请求配置-options)。

### FetchError

`FetchError` 是错误类，详见 [FetchError](#fetcherror)。

## Web 标准引用

以下类型或属性来自 Web 标准，本文不展开标准细节：

| 名称 | MDN |
|------|-----|
| `fetch` / `RequestInit` | [MDN Fetch API](https://developer.mozilla.org/docs/Web/API/Fetch_API) |
| `Response` | [MDN Response](https://developer.mozilla.org/docs/Web/API/Response) |
| `Headers` / `HeadersInit` | [MDN Headers](https://developer.mozilla.org/docs/Web/API/Headers) |
| `AbortController` / `AbortSignal` | [MDN AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)、[MDN AbortSignal](https://developer.mozilla.org/docs/Web/API/AbortSignal) |
| `FormData` | [MDN FormData](https://developer.mozilla.org/docs/Web/API/FormData) |
| `Blob` | [MDN Blob](https://developer.mozilla.org/docs/Web/API/Blob) |
| `File` | [MDN File](https://developer.mozilla.org/docs/Web/API/File) |
| `ArrayBuffer` | [MDN ArrayBuffer](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) |
| `ReadableStream` / `TransformStream` | [MDN ReadableStream](https://developer.mozilla.org/docs/Web/API/ReadableStream)、[MDN TransformStream](https://developer.mozilla.org/docs/Web/API/TransformStream) |
| `URL` / `URLSearchParams` | [MDN URL](https://developer.mozilla.org/docs/Web/API/URL)、[MDN URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams) |
| `Request.cache` | [MDN Request.cache](https://developer.mozilla.org/docs/Web/API/Request/cache) |
| `Request.redirect` | [MDN Request.redirect](https://developer.mozilla.org/docs/Web/API/Request/redirect) |
| `Request.keepalive` | [MDN Request.keepalive](https://developer.mozilla.org/docs/Web/API/Request/keepalive) |
| `Request.referrer` | [MDN Request.referrer](https://developer.mozilla.org/docs/Web/API/Request/referrer) |
| `Request.referrerPolicy` | [MDN Request.referrerPolicy](https://developer.mozilla.org/docs/Web/API/Request/referrerPolicy) |
