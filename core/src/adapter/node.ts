export type Coordinate = {
    x: number,
    y: number,
}

export type BoundingBoxCoordinates = {
  leftTop: Coordinate;
  leftBot: Coordinate;
  rightTop: Coordinate;
  rightBot: Coordinate;
};

export interface Node {
    getBoundingBoxCoordinates(): BoundingBoxCoordinates
    getOriginalId(): string
}
