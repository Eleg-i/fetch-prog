import Fetch from '../../../src/index'

type UserResponse = {
  id: string
  name: string
}

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false

type Assert<T extends true> = T

const client = new Fetch()
const response = client.fetch<UserResponse>({ url: '/users/1' })

export type ResponseGenericIsUsed = Assert<Equal<typeof response, Promise<UserResponse>>>
