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
  JPG = "JPG",
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
  export(exportFormat: ExportFormat): Promise<string>;
}

export interface StyledTextSegment {
  characters: string;
  start: number;
  end: number;
  fontName: {
    family: string;
    style: string;
  };
  // CSS strings
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textDecoration: "normal" | "line-through" | "underline";
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  color: string;
  letterSpacing: string;
}

export interface ListSegment {
  characters: string;
  start: number;
  end: number;
  listType: "none" | "ul" | "ol";
}

export interface TextNode extends Node {
  getText(): string;
  isItalic(): boolean;
  getFamilyName(): string;
  getStyledTextSegments(): StyledTextSegment[];
  getListSegments(): ListSegment[];
}

export interface VectorNode extends Node {}

export interface VectorGroupNode extends Node {}

export interface ImageNode extends Node {}
