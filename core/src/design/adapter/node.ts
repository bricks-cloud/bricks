export type Coordinate = {
  x: number;
  y: number;
};

export type Attributes = {
  [type: string]: string;
};

export enum ExportFormat {
  SVG = "SVG",
  PNG = "PNG",
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
  getPositionalCssAttributes(): Attributes;
}

export interface TextNode extends Node {
  getText(): string;
  isItalic(): boolean;
  getFamilyName(): string;
}

export interface VectorNode extends Node {
  export(exportFormat: ExportFormat): Promise<string>;
}

export interface VectorGroupNode extends Node {
  export(exportFormat: ExportFormat): Promise<string>;
}

export interface ImageNode extends Node {
  export(exportFormat: ExportFormat): Promise<string>;
}

