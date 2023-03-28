export type Coordinate = {
  x: number;
  y: number;
};

export type Attributes = {
  [type: string]: string;
};

export type BoxCoordinates = {
  leftTop: Coordinate;
  leftBot: Coordinate;
  rightTop: Coordinate;
  rightBot: Coordinate;
};

export interface Node {
  getRenderingBoundsCoordinates(): BoxCoordinates;
  getAbsoluteBoundingBoxCoordinates(): BoxCoordinates;
  getOriginalId(): string;
  getCSSAttributes(): Attributes;
}

export interface TextNode extends Node {
  getText(): string;
  isItalic(): boolean;
  getFamilyName(): string;
}
