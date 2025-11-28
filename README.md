# fetch-prog —— Enhanced Fetch API Request Library

[简体中文](./readme/README-zh-cn.md) | English

## Description

fetch-prog is an enhanced request library based on the native Fetch API, providing rich feature extensions such as request/response interception, progress monitoring, error handling, timeout control, and more, making network requests more usable and powerful.

## Getting Started

Install the package

```bash
npm i @cailiao/fetch-prog
```

## Basic Usage

### Import and Initialization

```javascript
import Fetch from '@cailiao/fetch-prog'

// Create a request client instance
const fetchClient = new Fetch({
  baseURL: '/api', // Base URL
  timeout: 1000 * 60, // Timeout in milliseconds
  withCredentials: true, // Whether to carry credentials
  extra: {} // Extra parameters
})
```

### Send Basic Requests

```javascript
// GET request
fetchClient.fetch({
  url: '/users',
  method: 'GET',
  params: { id: 1 },
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Response data:', response.data)
})
.catch(error => {
  console.error('Request error:', error)
})

// POST request
fetchClient.fetch({
  url: '/users',
  method: 'POST',
  data: { name: 'John', age: 30 }
})
```

## Progress Monitoring

fetch-prog provides powerful progress monitoring functionality, which is especially useful when uploading files.

### File Upload Progress Monitoring Example

```javascript
// Use throttle to limit progress update frequency and avoid excessive state updates
import { throttle } from 'es-toolkit'
import dayjs from 'dayjs'

// Create progress update function
const updateProgress = throttle((progress) => {
  // The progress object contains the following fields:
  // - progress: Progress percentage (0-100)
  // - transferred: Number of bytes transferred
  // - speed: Transfer speed (bytes/second)
  // - speedText: Formatted speed text (e.g., "2.5 MB/s")
  // - total: Total file size
  
  console.log(`Upload progress: ${progress.progress}%`)
  console.log(`Transferred: ${progress.transferred} / ${progress.total} bytes`)
  console.log(`Upload speed: ${progress.speedText}`)
  
  // Calculate remaining time
  const restTime = dayjs.duration(
    (progress.total - progress.transferred) / (progress.speed || 1),
    'seconds'
  )
  console.log(`Remaining time: ${restTime.asMinutes().toFixed(1)} minutes`)
}, 250) // Update every 250ms

// Send file upload request with progress monitoring
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
  // Ensure the last progress update
  updateProgress.flush()
})
.then(() => {
  console.log('Upload completed')
})
.catch(error => {
  console.error('Upload failed:', error)
})
```

## Interceptors

fetch-prog supports request and response interceptors, allowing you to execute custom logic before sending requests and after receiving responses.

### Adding Interceptors

```javascript
// Add request interceptor
fetchClient.guard({
  request: (config) => {
    // Do something before sending the request
    // For example: Add authentication token
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

// Add response interceptor
fetchClient.guard({
  response: (config, response) => {
    // Do something with the response data
    // For example: Uniform data format processing
    return {
      ...response,
      // Assuming response data is in response.body
      data: response.json()
    }
  }
})
```

### Error Interceptors

```javascript
fetchClient.guard({
  response: {
    handler: (config, response) => response,
    errorHandler: (error) => {
      // Uniform error handling
      if (error.status === 401) {
        // Unauthorized, redirect to login page
        window.location.href = '/login'
        return null // Returning null prevents the error from propagating
      }
      return error // Returning the error will continue to throw it
    }
  }
})
```

### Removing Interceptors

```javascript
// Save interceptor ID
const requestInterceptorId = fetchClient.guard({
  request: config => config
})

// Remove interceptor
fetchClient.unGuard({ request: requestInterceptorId })
```

## Request Configuration Options

| Option | Type | Default Value | Description |
|--------|------|--------------|-------------|
| `url` | string | - | Server URL for the request, required parameter |
| `method` | string | 'GET' | Request method |
| `baseURL` | string | '' | Base URL, automatically prepended to `url` |
| `headers` | HeadersInit | {} | Request headers |
| `params` | object/array | - | URL parameters |
| `data` | any | - | Request data |
| `contentLength` | number | - | Request content length (for progress calculation) |
| `timeout` | number | 60000 | Request timeout in milliseconds |
| `withCredentials` | boolean | false | Whether to carry credentials |
| `signal` | AbortSignal | - | Signal for canceling the request |
| `onUploadProgress` | function | - | Upload progress callback function |
| `cache` | string | 'default' | Request cache strategy |
| `redirect` | string | 'follow' | Redirection strategy |
| `priority` | string | 'auto' | Request priority |

## Progress Object Interface

When using progress monitoring functionality, the callback function receives a Progress object with the following properties:

```typescript
interface Progress {
  progress?: number       // Progress percentage (0-100)
  speed?: number          // Transfer speed (bytes/second)
  speedText?: string      // Formatted speed text (e.g., "2.5 MB/s")
  total?: number          // Total size (bytes)
  transferred: number     // Transferred size (bytes)
}
```

## Error Handling

fetch-prog provides a comprehensive error handling mechanism that can catch various network errors and response errors.

### Error Object

When a request fails, the thrown error object is a `FetchError` instance with the following properties:

- `message`: Error message
- `status`: HTTP status code
- `config`: Request configuration object

### Common Error Status Code Handling

```javascript
try {
  const response = await fetchClient.fetch({
    url: '/api/data'
  })
} catch (error) {
  switch (error.status) {
    case 400:
      console.error('Bad request parameters:', error.message)
      break
    case 401:
      console.error('Unauthorized, please login:', error.message)
      break
    case 403:
      console.error('Access denied:', error.message)
      break
    case 404:
      console.error('Requested resource not found:', error.message)
      break
    case 419:
      console.error('File reading failed:', error.message)
      break
    case 413:
      console.error('File too large:', error.message)
      break
    case 500:
      console.error('Server internal error:', error.message)
      break
    default:
      console.error('Request failed:', error.message)
  }
}
```

## Canceling Requests

Use AbortController to cancel ongoing requests:

```javascript
const abortController = new AbortController()

fetchClient.fetch({
  url: '/api/data',
  signal: abortController.signal
})

// Cancel request
abortController.abort('Reason for canceling the request')
```

## Advanced Features

### Custom Serializers

fetch-prog automatically sets Content-Type and serializes data based on data type, but you can also customize the serialization method:

```javascript
fetchClient.fetch({
  url: '/api/data',
  method: 'POST',
  data: complexObject,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  // Custom serialization function can be implemented here by transforming data
})
```

### Multiple File Uploads

fetch-prog supports efficient file uploads through ReadableStream:

```javascript
const formData = new FormData()
formData.append('file', file)

fetchClient.fetch({
  url: '/api/upload',
  method: 'POST',
  data: formData,
  headers: {
    // Note: Do not manually set Content-Type when using FormData, the browser will automatically add it
  },
  onUploadProgress: (progress) => {
    console.log(`Upload progress: ${progress.progress}%`)
  }
})
```

## Best Practices

1. **Create a singleton instance**: Create a global fetchClient instance in your application to uniformly manage configurations and interceptors

2. **Use interceptors for unified authentication**: Add tokens in request interceptors and handle token expiration in response interceptors

3. **Set reasonable timeout times**: Set appropriate timeout times according to different types of requests, large file uploads should set longer timeouts

4. **Use throttle to optimize progress updates**: When handling upload/download progress, use throttle to limit update frequency and avoid excessive UI updates

5. **Separate error handling**: Centralize error handling logic in one place for convenient unified management of error display

## Support

Like this project? Please give it a star for support! ⭐

Your star helps the project gain more attention and encourages further development.
