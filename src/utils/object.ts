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
