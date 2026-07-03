type BoxedPrimitive =
  | InstanceType<StringConstructor>
  | InstanceType<NumberConstructor>
  | InstanceType<BooleanConstructor>

type SerializableLeaf = string | number | boolean | null | undefined | Date | BoxedPrimitive

type IsAny<T> = 0 extends 1 & T ? true : false

type SerializableValueOf<T> =
  IsAny<T> extends true
    ? never
    : T extends SerializableLeaf
      ? T
      : T extends (...args: any[]) => any
        ? never
        : T extends readonly unknown[]
          ? SerializableArrayOf<T>
          : T extends object
            ? SerializableObjectOf<T>
            : never

type SerializableArrayOf<T extends readonly unknown[]> = number extends T['length']
  ? T extends unknown[]
    ? SerializableValueOf<T[number]>[]
    : readonly SerializableValueOf<T[number]>[]
  : {
      [K in keyof T]: SerializableValueOf<T[K]>
    }

type SerializableObjectOf<T extends object> = {
  [K in keyof T]: SerializableValueOf<T[K]>
}

type SerializableRootOf<T> =
  IsAny<T> extends true
    ? never
    : T extends (...args: any[]) => any
      ? never
      : T extends readonly unknown[]
        ? SerializableArrayOf<T>
        : T extends object
          ? T extends SerializableLeaf
            ? never
            : SerializableObjectOf<T>
          : never

/** 模式二：泛型映射式可序列化约束，配合 `fetch<ResT, DataT>` 使用 */
export type SerializableParam<T> = T & SerializableRootOf<T>

type SerVal =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | BoxedPrimitive
  | SerVal[]
  | { [k: string]: SerVal }

/** 模式一：非泛型递归可序列化根类型（用于对象字面量的宽松校验） */
export type LooseSerializableRoot = { [k: string]: SerVal } | SerVal[]

/** 模式一 `fetch<ResT>` 允许的 data 类型（含流/二进制等非 JSON 载荷） */
export type LooseFetchData =
  | LooseSerializableRoot
  | ReadableStream<Uint8Array>
  | FormData
  | ArrayBuffer
  | Blob
  | string

/**
 * 以 Response 为基类、允许外部无限扩展的响应占位类型。
 *
 * 库本身不预设任何扩展字段（如 data、cookies 等均由外部拦截器决定）。
 * 默认 `ExtendableResponse` 等价于 `Response`；外部通过泛型参数声明自己的扩展形状。
 * @example
 * type AppResponse = ExtendableResponse<{
 *   readonly data: Promise<unknown>
 *   readonly cookies: Record<string, string>
 * }>
 */
export type ExtendableResponse<E extends object = object> = Response & E
