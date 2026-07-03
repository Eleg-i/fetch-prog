import Fetch from '../../../src/index'

const client = new Fetch()

client.fetch({
  url: '/users',
  method: 'POST',
  data: { id: 1n }
})
