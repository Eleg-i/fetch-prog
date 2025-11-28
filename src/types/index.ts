declare global {
  type SerializableValue = string | number | null | undefined | boolean

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
