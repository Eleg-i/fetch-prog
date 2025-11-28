import { convertSpeed } from './formate'

export interface Progress {
  progress?: number
  speed?: number
  speedText?: string
  total?: number
  transferred: number
}

/**
 * 获取流的读取进度
 * @param stream           流
 * @param op               参数
 * @param op.contentLength 流长度
 * @param op.callback      回调函数
 * @param op.progress      是否显示进度
 * @param op.speed         是否显示速度
 * @param op.abort         中断回调
 */
export function pipeThroughProgress(
  stream: ReadableStream,
  {
    contentLength,
    progress = true,
    speed,
    callback,
    abort
  }: {
    contentLength?: number
    progress: boolean
    speed?: boolean
    callback: (res: Progress) => void
    abort?: (abort: (reson?: string) => void) => void
  }
): ReadableStream<Uint8Array> {
  if (!(progress || speed)) return stream

  let streamController: TransformStreamDefaultController | null = null
  const processor = new ProgressProcessor(callback, { total: contentLength, speed, progress })

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      streamController ??= controller
      controller.enqueue(chunk)
      queueMicrotask(() => processor?.process(chunk))
    }
  })

  if (abort) abort(reson => streamController?.error(reson ?? 'stream aborted'))

  return stream.pipeThrough(transformStream)
}

/**
 * 获取流的读取进度
 * @param stream              流
 * @param op                  参数
 * @param op.contentLength    流长度
 * @param op.progress         是否显示进度
 * @param op.speed            是否显示速度
 * @param op.progressCallback 进度回调函数
 * @param op.errorCallback    错误
 * @param op.abort            中断回调
 */
export function pipeThroughWithError(
  stream: ReadableStream,
  {
    contentLength,
    progress = true,
    speed,
    progressCallback,
    errorCallback,
    abort
  }: {
    contentLength?: number
    progress?: boolean
    speed?: boolean
    progressCallback?: (res: Progress) => void
    errorCallback: (res: Error) => void
    abort?: (abort: (reson?: string) => void) => void
  }
): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader,
      processor: ProgressProcessor | undefined,
      streamController: ReadableStreamDefaultController | null = null

  if (progressCallback)
    processor = new ProgressProcessor(progressCallback, { total: contentLength, speed, progress })

  const result = new ReadableStream({
    start() {
      reader = stream.getReader()
    },
    async pull(controller) {
      let value: Uint8Array, done: boolean

      streamController ??= controller
      try {
        ({ value, done } = await reader.read())
      } catch (err) {
        const error = err as Error

        controller.error(error)
        errorCallback(error)

        return
      }

      if (done) {
        controller.close()

        return
      }

      queueMicrotask(() => processor?.process(value))

      controller.enqueue(value)
    }
  })

  if (abort) abort(reson => streamController?.error(reson ?? 'stream aborted'))

  return result
}

/**
 * 进度处理器
 */
class ProgressProcessor {
  #transferred = 0

  #window: { timestamp: number; transferred: number }[] = []

  #callback: (res: Progress) => void

  #speed: boolean

  #total?: number

  #progress: boolean

  /**
   * 创建一个进度处理器
   * @param callback     回调函数
   * @param opt          参数
   * @param opt.total    总长度
   * @param opt.speed    是否显示速度
   * @param opt.progress 是否显示进度
   */
  constructor(
    callback: (res: Progress) => void,
    {
      total,
      speed,
      progress
    }: {
      total?: number
      speed?: boolean
      progress?: boolean
    }
  ) {
    this.#transferred = 0
    this.#window = []
    this.#callback = callback
    this.#speed = speed ?? false
    this.#total = total
    this.#progress = total ? progress ?? false : false

    if (!total && progress)
      console.warn('When enabling progress, the total parameter must be passed simultaneously!')
  }

  /**
   * 处理进度
   * @param chunk 块
   */
  process(chunk: Uint8Array) {
    const window = this.#window
    const callback = this.#callback
    const total = this.#total
    const speed = this.#speed
    const progress = this.#progress

    this.#transferred += chunk.byteLength

    const transferred = this.#transferred
    const result: Progress = { transferred, total }

    if (total && progress) {
      const percent = Math.round(transferred / total * 10000)
      const progressPercent = total > 0 ? Math.min(100, percent / 100) : 0

      if (progressPercent > 10000)
        console.warn(`Stream progress greater than 100%, ${progressPercent}%`)

      result.progress = progressPercent
    } else console.warn('ContentLength must be provided to calculate progress!')

    if (speed) {
      const current = { timestamp: Date.now(), transferred }
      const first = window[0]

      window.push(current)

      if (!first || window.length < 3) return
      const duration = (current.timestamp - first.timestamp) / 1000

      if (!duration) return
      const speedNum = (current.transferred - first.transferred) / duration

      const speedString = convertSpeed(speedNum)

      result.speed = speedNum
      result.speedText = speedString

      if (duration > 1000) window.shift()
    }

    callback(result)
  }
}
