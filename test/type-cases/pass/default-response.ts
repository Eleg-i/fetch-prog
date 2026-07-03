import Fetch from '../../../src/index'
import type { ExtendableResponse } from '../../../src/index'

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false

type Assert<T extends true> = T

const client = new Fetch()
const response = client.fetch({ url: '/users' })

export type DefaultResponseIsExtendable = Assert<
  Equal<typeof response, Promise<ExtendableResponse>>
>
