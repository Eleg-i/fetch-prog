declare global {
  type SerializableBoxedPrimitive =
    | InstanceType<StringConstructor>
    | InstanceType<NumberConstructor>
    | InstanceType<BooleanConstructor>

  type SerializableValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | Date
    | SerializableBoxedPrimitive

  type SerializableObject = {
    [k in string | number]: Serializable
  }

  type SerializableArray = Serializable[]

  type Serializable = SerializableValue | SerializableArray | SerializableObject

  interface RequestInit {
    duplex: 'half' | 'full' | undefined
  }
}

export {}
