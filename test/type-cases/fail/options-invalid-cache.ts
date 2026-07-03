import type { Options } from '../../../src/index'

const invalidCache: Options = {
  url: '/users',
  cache: 'memory-only'
}

void invalidCache
