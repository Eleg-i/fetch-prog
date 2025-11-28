module.exports = [
  {
    files: ['src/api/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 1 // 禁止使用 any 类型
    }
  },
  {
    files: ['vite.config.ts', 'vite.*.config.ts', 'pages.config.ts', 'manifest.config.ts'],
    rules: {
      'jsdoc/require-jsdoc': 0 // vite 配置允许省略方法注释
    }
  },
  {
    files: ['*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 0, // cjs 允许使用 require
      '@typescript-eslint/no-var-requires': 0 // cjs 允许使用 require'
    }
  },
  {
    files: ['*.ts', '*.vue'],
    rules: {
      'jsdoc/require-returns': 0, // ts 允许函数不带 return
      'jsdoc/require-yields-type': 0 // ts 允许 generator 函数不带 yield
    }
  },
  {
    files: ['*.vue', '**/test/**/*', 'src/main.ts'], // vue setup 语法糖、测试文件和主入口中不认为是副作用
    rules: {
      'tree-shaking/no-side-effects-in-initialization': 0
    }
  }
]
