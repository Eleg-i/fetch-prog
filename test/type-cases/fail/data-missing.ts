import Fetch from '../../../src/index'

type UserResponse = {
  id: string
  name: string
}

type CreateUserData = {
  name: string
  age: number
}

const client = new Fetch()

client.fetch<UserResponse, CreateUserData>({
  url: '/users',
  method: 'POST',
  data: { name: 'Ada' }
})
