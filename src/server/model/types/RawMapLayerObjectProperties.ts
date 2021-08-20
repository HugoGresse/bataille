export interface RawMapLayerObjectProperties {
    name: string
    objects: [
        {
            properties: {
                name: string
                value: string | number
            }[]
            x: number
            y: number
        }
    ]
}
