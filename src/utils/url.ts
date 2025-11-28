const noSensiceDomain = 'http://tmp'
const noSensiceDomain2 = 'http://tmp2'

/**
 * 判断是否为同源
 * @param url 请求地址
 * @returns 返回是否为同源
 */
export function isSameOrigin(url: string) {
  var currentOrigin = location.origin

  if (url.startsWith('http') || url.startsWith('https')) return url.startsWith(currentOrigin)
  else return true
}

/**
 * 合并路径
 * @param base  基础路径
 * @param paths 其它路径
 * @returns 返回合并后的路径
 */
export function joinPath(base: string, ...paths: string[]) {
  var innerBase = base
  const hasDomain = withOrigin(base)

  // 如果基础URL没有域名，添加一个无意义的域名
  if (!hasDomain) innerBase = joinPath(noSensiceDomain, base)

  let url = new URL(innerBase)

  paths.forEach(path => {
    url = new URL(
      encodeURIComponent(path)
        .replace(/%2F/g, '/')
        .replace(/^\/([^\/])/, '$1'),
      `${url}/`.replace(/\/+$/, '/')
    )
  })

  const { origin } = url

  // 如果没有域名则只返回除域名之外的部分
  return hasDomain ? url.href : url.href.replace(origin, '')
}

/**
 * 判断指定的地址是否包含源（协议+主机）的部分
 * @param url 请求地址
 * @returns 返回是否包含源
 */
export function withOrigin(url: string) {
  const { origin } = new URL(url, noSensiceDomain2)

  return origin !== noSensiceDomain2
}
