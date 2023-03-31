export type Coordinate = {
  x: number;
  y: number;
};

export type Attributes = {
  [type: string]: string;
};

export enum ExportFormat {
  SVG = "SVG",
}

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
  getCssAttributes(): Attributes;
}

export interface TextNode extends Node {
  getText(): string;
  isItalic(): boolean;
  getFamilyName(): string;
}

export interface VectorNode extends Node {
  exportAsSvg(exportFormat: ExportFormat): Promise<string>;
}

export interface VectorGroupNode extends Node {
  exportAsSvg(exportFormat: ExportFormat): Promise<string>;
}
