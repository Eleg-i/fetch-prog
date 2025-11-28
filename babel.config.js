module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { browsers: 'last 3 versions and >1% and not dead and not ie < 12' },
        corejs: '3',
        useBuiltIns: 'usage',
        spec: true
      }
    ],
    '@vue/babel-preset-jsx'
  ],
  plugins: ['@babel/plugin-transform-class-properties', '@babel/plugin-transform-private-methods'],
  env: {
    dev: {
      plugins: [['transform-remove-console', { include: [''] }]]
    },
    build: {
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]]
    }
  }
}
