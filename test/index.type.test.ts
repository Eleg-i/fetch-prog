import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

type TscResult = {
  code: number | null
  output: string
}

type TypeCase = {
  name: string
  file: string
  expectPass: boolean
  expectedOutput?: string[]
}

const testDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(testDir, '..')
const tscPath = resolve(rootDir, 'node_modules/typescript/bin/tsc')
const globalTypesPath = resolve(rootDir, 'src/types/index.ts')

const commonArgs = [
  '--noEmit',
  '--pretty',
  'false',
  '--skipLibCheck',
  '--strict',
  '--target',
  'ESNext',
  '--module',
  'ESNext',
  '--moduleResolution',
  'bundler',
  '--lib',
  'ESNext,DOM,DOM.Iterable'
]

const cases: TypeCase[] = [
  {
    name: '默认响应类型是 ExtendableResponse',
    file: 'pass/default-response.ts',
    expectPass: true
  },
  {
    name: '响应泛型会决定返回值类型',
    file: 'pass/response-generic.ts',
    expectPass: true
  },
  {
    name: '双泛型请求体接受合法契约数据',
    file: 'pass/data-contract.ts',
    expectPass: true
  },
  {
    name: 'guard、Options 和 ExtendableResponse 正向类型可用',
    file: 'pass/public-types.ts',
    expectPass: true
  },
  {
    name: '双泛型请求体拒绝契约外字段',
    file: 'fail/data-extra.ts',
    expectPass: false,
    expectedOutput: ['extra']
  },
  {
    name: '双泛型请求体拒绝缺少必填字段',
    file: 'fail/data-missing.ts',
    expectPass: false,
    expectedOutput: ['age']
  },
  {
    name: '普通请求体拒绝 symbol',
    file: 'fail/data-symbol.ts',
    expectPass: false,
    expectedOutput: ['symbol']
  },
  {
    name: '普通请求体拒绝 function',
    file: 'fail/data-function.ts',
    expectPass: false,
    expectedOutput: ['formatter']
  },
  {
    name: '普通请求体拒绝 bigint',
    file: 'fail/data-bigint.ts',
    expectPass: false,
    expectedOutput: ['bigint']
  },
  {
    name: '请求体契约拒绝 any',
    file: 'fail/data-any.ts',
    expectPass: false,
    expectedOutput: ['any']
  },
  {
    name: 'Options.method 拒绝非法方法',
    file: 'fail/options-invalid-method.ts',
    expectPass: false,
    expectedOutput: ['TRACE']
  },
  {
    name: 'Options.cache 拒绝非法缓存策略',
    file: 'fail/options-invalid-cache.ts',
    expectPass: false,
    expectedOutput: ['memory-only']
  }
]

/**
 * 运行单个类型测试文件
 * @param file 类型测试文件相对路径
 * @returns 返回 tsc 退出码和输出
 */
function runTsc(file: string) {
  const filePath = resolve(testDir, 'type-cases', file)

  return new Promise<TscResult>((resolveResult, reject) => {
    const child = spawn(process.execPath, [tscPath, ...commonArgs, globalTypesPath, filePath], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''

    child.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    child.stderr.on('data', chunk => {
      output += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', code => {
      resolveResult({ code, output })
    })
  })
}

describe('Fetch 类型提示', () => {
  for (const item of cases) {
    /**
     * 验证独立类型用例的 tsc 编译结果。
     * @returns 无返回值
     */
    it(item.name, async () => {
      const result = await runTsc(item.file)

      if (item.expectPass) {
        expect(result.output).toBe('')
        expect(result.code).toBe(0)
      } else {
        expect(result.code).not.toBe(0)

        for (const expected of item.expectedOutput ?? []) expect(result.output).toContain(expected)
      }
    })
  }
})
