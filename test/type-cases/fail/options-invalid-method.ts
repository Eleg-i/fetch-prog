import type { Options } from '../../../src/index'

const invalidMethod: Options = {
  url: '/users',
  method: 'TRACE'
}

void invalidMethod
