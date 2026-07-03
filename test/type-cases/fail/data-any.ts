import Fetch from '../../../src/index'

const client = new Fetch()

client.fetch<unknown, any>({
  url: '/users',
  method: 'POST',
  data: { name: 'Ada' }
})
