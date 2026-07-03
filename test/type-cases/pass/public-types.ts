import Fetch from '../../../src/index'
import type { ExtendableResponse, Options } from '../../../src/index'

type UserResponse = {
  id: string
  name: string
}

type AppResponse = ExtendableResponse<{
  readonly data: Promise<UserResponse>
}>

const client = new Fetch()
const ids = client.guard({
  request: config => config,
  response: (_config, response) => response
})
const options: Options = {
  url: '/users',
  method: 'PATCH',
  cache: 'no-cache',
  redirect: 'follow',
  referrerPolicy: 'strict-origin'
}
const response = {} as AppResponse
const data = response.data

client.unGuard(ids)
void options
void data
