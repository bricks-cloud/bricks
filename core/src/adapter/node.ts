export type Coordinate = {
    x: Number,
    y: Number,
}

export type BoundingBoxCoordinates = {
    leftTop: Coordinate,
    leftBot: Coordinate,
    rightTop: Coordinate,
    rightBot: Coordinate,
}

export interface Node {
    getBoundingBoxCoordinates(): BoundingBoxCoordinates
}

