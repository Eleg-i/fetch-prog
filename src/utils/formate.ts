/**
 * 将字节每秒（bps）转换为更易读的速度单位，如 KB/s、MB/s 等
 * @param bps - 要转换的字节每秒数值
 * @returns 转换后的速度字符串，格式为 "X.XX 单位/秒"，其中 X.XX 是保留两位小数的数值，单位是根据速度大小自动选择的
 */
export function convertSpeed(bps: number) {
  let innerBps = bps,
      index = 0
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']

  for (; innerBps >= 1000 && index < units.length - 1; index++) innerBps /= 1000

  return innerBps.toFixed(2) + ' ' + units[index]
}
