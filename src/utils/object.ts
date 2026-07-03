import type { LooseFetchData } from '../types/serializable'

/**
 * 递归删除对象中值为 undefined 的字段
 * @param obj 要处理的对象
 * @returns 处理后的对象
 */
export const treeShake = (obj: object) => {
  if (typeof obj !== 'object' || obj === null) return obj

  for (const _key of Object.keys(obj)) {
    const key = _key as keyof typeof obj
    const value = obj[key]

    if (value === void 0) delete obj[key]
    else if (typeof value === 'object' && value !== null) treeShake(value)
  }

  return obj
}

/**
 * 规范化请求数据
 * @param data 原始请求数据
 * @returns 返回不会修改调用方对象的请求数据
 */
export function normalizeData(data?: LooseFetchData | object) {
  if (
    typeof data === 'object' &&
    data &&
    !Array.isArray(data) &&
    !(data instanceof FormData) &&
    !(data instanceof ArrayBuffer) &&
    !(data instanceof Blob) &&
    !(data instanceof Date) &&
    !(data instanceof ReadableStream)
  )
    return treeShake(cloneSerializableObject(data as SerializableObject)) as LooseFetchData

  return data
}

/**
 * 克隆可序列化对象
 * @param data 待克隆的数据
 * @returns 返回克隆后的数据
 */
function cloneSerializableObject(data: SerializableObject): SerializableObject {
  const result: SerializableObject = {}

  for (const key of Object.keys(data)) {
    const value = data[key]

    if (Array.isArray(value)) result[key] = value.map(item => cloneSerializableValue(item))
    else result[key] = cloneSerializableValue(value)
  }

  return result
}

/**
 * 克隆可序列化值
 * @param value 待克隆的值
 * @returns 返回克隆后的值
 */
function cloneSerializableValue(value: Serializable): Serializable {
  if (Array.isArray(value)) return value.map(item => cloneSerializableValue(item))
  if (value instanceof Date) return new Date(value)
  if (isSerializableObject(value)) return cloneSerializableObject(value)

  return value
}

/**
 * 判断是否为普通可序列化对象
 * @param value 待判断的值
 * @returns 返回是否为普通可序列化对象
 */
function isSerializableObject(value: Serializable): value is SerializableObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date) &&
    !(value instanceof String) &&
    !(value instanceof Number) &&
    !(value instanceof Boolean)
  )
}
