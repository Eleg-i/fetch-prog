# fetch-prog —— 增强型 Fetch API 请求库

简体中文 | [English](../README.md)

## 描述

fetch-prog 是一个基于原生 Fetch API 的增强型请求库，提供了丰富的功能扩展，如请求/响应拦截、进度监控、错误处理、超时控制等特性，让网络请求更加易用和强大。

## 开始使用

安装依赖包

```bash
npm i @cailiao/fetch-prog
```

## 基本用法

### 导入与初始化

```javascript
import Fetch from '@cailiao/fetch-prog'

// 创建请求客户端实例
const fetchClient = new Fetch({
  baseURL: '/api', // 基础 URL
  timeout: 1000 * 60, // 超时时间（毫秒）
  withCredentials: true, // 是否携带凭证
  extra: {} // 额外参数
})
```

### 发送基本请求

```javascript
// GET 请求
fetchClient.fetch({
  url: '/users',
  method: 'GET',
  params: { id: 1 },
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('响应数据:', response.data)
})
.catch(error => {
  console.error('请求错误:', error)
})

// POST 请求
fetchClient.fetch({
  url: '/users',
  method: 'POST',
  data: { name: '张三', age: 30 }
})
```

## 进度监控

fetch-prog 提供了强大的进度监控功能，特别是在上传文件时非常有用。

### 文件上传进度监控示例

```javascript
// 使用 throttle 来限制进度更新频率，避免过于频繁的状态更新
import { throttle } from 'es-toolkit'
import dayjs from 'dayjs'

// 创建进度更新函数
const updateProgress = throttle((progress) => {
  // progress 对象包含以下字段：
  // - progress: 进度百分比 (0-100)
  // - transferred: 已传输的字节数
  // - speed: 传输速度（字节/秒）
  // - speedText: 格式化的速度文本（如 "2.5 MB/s"）
  // - total: 文件总大小
  
  console.log(`上传进度: ${progress.progress}%`)
  console.log(`已传输: ${progress.transferred} / ${progress.total} 字节`)
  console.log(`上传速度: ${progress.speedText}`)
  
  // 计算剩余时间
  const restTime = dayjs.duration(
    (progress.total - progress.transferred) / (progress.speed || 1),
    'seconds'
  )
  console.log(`剩余时间: ${restTime.asMinutes().toFixed(1)} 分钟`)
}, 250) // 每 250ms 更新一次

// 发送带进度监控的文件上传请求
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]
const stream = file.stream()

fetchClient.fetch({
  url: '/upload',
  method: 'POST',
  data: stream,
  contentLength: file.size,
  onUploadProgress: (progress) => {
    updateProgress(progress)
  }
})
.finally(() => {
  // 确保最后一次进度被更新
  updateProgress.flush()
})
.then(() => {
  console.log('上传完成')
})
.catch(error => {
  console.error('上传失败:', error)
})
```

## 拦截器

fetch-prog 支持请求和响应拦截器，可以在请求发送前和响应接收后执行自定义逻辑。

### 添加拦截器

```javascript
// 添加请求拦截器
fetchClient.guard({
  request: (config) => {
    // 在发送请求前做些什么
    // 例如：添加认证 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      }
    }
    return config
  }
})

// 添加响应拦截器
fetchClient.guard({
  response: (config, response) => {
    // 对响应数据做点什么
    // 例如：统一处理数据格式
    return {
      ...response,
      // 假设响应数据在 response.body 中
      data: response.json()
    }
  }
})
```

### 错误拦截器

```javascript
fetchClient.guard({
  response: {
    handler: (config, response) => response,
    errorHandler: (error) => {
      // 统一处理错误
      if (error.status === 401) {
        // 未授权，跳转到登录页
        window.location.href = '/login'
        return null // 返回 null 会阻止错误继续传播
      }
      return error // 返回错误会继续抛出
    }
  }
})
```

### 移除拦截器

```javascript
// 保存拦截器的 ID
const requestInterceptorId = fetchClient.guard({
  request: config => config
})

// 移除拦截器
fetchClient.unGuard({ request: requestInterceptorId })
```

## 请求配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `url` | string | - | 请求的服务器 URL，必传参数 |
| `method` | string | 'GET' | 请求方法 |
| `baseURL` | string | '' | 基础 URL，会自动加在 `url` 前面 |
| `headers` | HeadersInit | {} | 请求头 |
| `params` | object/array | - | URL 参数 |
| `data` | any | - | 请求数据 |
| `contentLength` | number | - | 请求内容长度（用于进度计算） |
| `timeout` | number | 60000 | 请求超时时间（毫秒） |
| `withCredentials` | boolean | false | 是否携带凭证 |
| `signal` | AbortSignal | - | 用于取消请求的信号 |
| `onUploadProgress` | function | - | 上传进度回调函数 |
| `cache` | string | 'default' | 请求缓存策略 |
| `redirect` | string | 'follow' | 重定向策略 |
| `priority` | string | 'auto' | 请求优先级 |

## 进度对象 (Progress) 接口

当使用进度监控功能时，回调函数会接收一个 Progress 对象，包含以下属性：

```typescript
interface Progress {
  progress?: number       // 进度百分比 (0-100)
  speed?: number          // 传输速度（字节/秒）
  speedText?: string      // 格式化的速度文本（如 "2.5 MB/s"）
  total?: number          // 总大小（字节）
  transferred: number     // 已传输大小（字节）
}
```

## 错误处理

fetch-prog 提供了全面的错误处理机制，可以捕获各种网络错误和响应错误。

### 错误对象

当请求失败时，抛出的错误对象是一个 `FetchError` 实例，包含以下属性：

- `message`: 错误消息
- `status`: HTTP 状态码
- `config`: 请求配置对象

### 常见错误状态码处理

```javascript
try {
  const response = await fetchClient.fetch({
    url: '/api/data'
  })
} catch (error) {
  switch (error.status) {
    case 400:
      console.error('请求参数错误:', error.message)
      break
    case 401:
      console.error('未授权，请登录:', error.message)
      break
    case 403:
      console.error('拒绝访问:', error.message)
      break
    case 404:
      console.error('请求资源不存在:', error.message)
      break
    case 419:
      console.error('文件读取失败:', error.message)
      break
    case 413:
      console.error('文件过大:', error.message)
      break
    case 500:
      console.error('服务器内部错误:', error.message)
      break
    default:
      console.error('请求失败:', error.message)
  }
}
```

## 取消请求

使用 AbortController 可以取消正在进行的请求：

```javascript
const abortController = new AbortController()

fetchClient.fetch({
  url: '/api/data',
  signal: abortController.signal
})

// 取消请求
abortController.abort('取消请求的原因')
```

## 高级功能

### 自定义序列化器

fetch-prog 会根据数据类型自动设置 Content-Type 并序列化数据，但你也可以自定义序列化方式：

```javascript
fetchClient.fetch({
  url: '/api/data',
  method: 'POST',
  data: complexObject,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  // 自定义序列化函数可以在这里通过转换 data 实现
})
```

### 多文件上传

fetch-prog 支持通过 ReadableStream 进行高效的文件上传：

```javascript
const formData = new FormData()
formData.append('file', file)

fetchClient.fetch({
  url: '/api/upload',
  method: 'POST',
  data: formData,
  headers: {
    // 注意：使用 FormData 时不要手动设置 Content-Type，浏览器会自动添加
  },
  onUploadProgress: (progress) => {
    console.log(`上传进度: ${progress.progress}%`)
  }
})
```

## 最佳实践

1. **创建单例实例**：在应用中创建一个全局的 fetchClient 实例，统一管理配置和拦截器

2. **使用拦截器统一处理认证**：在请求拦截器中添加 token，在响应拦截器中处理 token 过期

3. **合理设置超时时间**：根据不同类型的请求设置合适的超时时间，大文件上传应该设置更长的超时

4. **使用 throttle 优化进度更新**：在处理上传/下载进度时，使用 throttle 限制更新频率，避免过多的 UI 更新

5. **错误处理分离**：将错误处理逻辑集中在一个地方，方便统一管理错误展示

## 支持

喜欢这个项目吗？请给它一个 star 以示支持！⭐

您的 star 有助于项目获得更多关注，并鼓励进一步的开发。
