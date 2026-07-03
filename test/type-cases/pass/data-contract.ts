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
const response = client.fetch<UserResponse, CreateUserData>({
  url: '/users',
  method: 'POST',
  data: { name: 'Ada', age: 20 }
})

void response
