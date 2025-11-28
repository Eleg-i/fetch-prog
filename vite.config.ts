import { resolve } from 'node:path'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      // 设置库的入口文件
      entry: resolve(__dirname, 'src/index.ts'),
      // 输出文件名
      fileName: format => `index.${format === 'es' ? 'm' : 'c'}js`,
      // 支持的格式：ES模块
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['pinia', 'vue', '@cailiao/locks']
    }
  },
  plugins: [
    // 生成类型声明文件
    dts({
      outDirs: ['dist'],
      // include: ['src/**/*.d.ts', 'src/**/*.ts'],
      bundleTypes: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
