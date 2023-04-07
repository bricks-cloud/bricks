import uuid from "react-native-uuid";
import {
  Node as AdaptedNode,
  TextNode as AdaptedTextNode,
  BoxCoordinates,
  Attributes,
  ExportFormat,
  VectorNode as AdaptedVectorNode,
  VectorGroupNode as AdaptedVectorGroupNode,
  ImageNode as AdaptedImageNode,
} from "../design/adapter/node";
import { isEmpty } from "../utils";
import { selectBox } from "./additional-css";
import { filterAttributes } from "./util";

export enum PostionalRelationship {
  INCLUDE = "INCLUDE",
  OVERLAP = "OVERLAP",
  COMPLETE_OVERLAP = "COMPLETE_OVERLAP",
  OUTSIDE = "OUTSIDE",
}

export type Option = {
  truncateNumbers?: boolean;
  zeroValueAllowed?: boolean;
};

export type Node = GroupNode | VisibleNode | TextNode | VectorNode | ImageNode;

export enum NodeType {
  BASE = "BASE",
  GROUP = "GROUP",
  VISIBLE = "VISIBLE",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
  VECTOR_GROUP = "VECTOR_GROUP",
  IMAGE = "IMAGE",
}

export type Annotations = {
  [key: string]: any;
};

export class BaseNode {
  readonly id: string;
  children: Node[] = [];
  positionalCssAttributes: Attributes = {};
  cssAttributes: Attributes = {};
  annotations: Annotations = {};

  constructor() {
    this.id = uuid.v1() as string;
  }

  addChildren(children: Node[]) {
    this.children = this.children.concat(children);
  }

  setPositionalCssAttributes(attributes: Attributes) {
    this.positionalCssAttributes = attributes;
  }

  getPositionalCssAttributes(
    option: Option = { zeroValueAllowed: false, truncateNumbers: true },
  ): Attributes {
    return filterAttributes(this.positionalCssAttributes, option);
  }

  addPositionalCssAttributes(attributes: Attributes) {
    this.positionalCssAttributes = {
      ...attributes,
      ...this.positionalCssAttributes,
    };
  }

  getAPositionalAttribute(key: string): string {
    return this.positionalCssAttributes[key];
  }

  setCssAttributes(attributes: Attributes) {
    this.cssAttributes = attributes;
  }

  getCssAttributes(
    option: Option = { zeroValueAllowed: false, truncateNumbers: true },
  ): Attributes {
    return filterAttributes(this.cssAttributes, option);
  }

  addCssAttributes(attributes: Attributes) {
    this.cssAttributes = {
      ...this.cssAttributes,
      ...attributes,
    };
  }

  getACssAttribute(key: string): string {
    return this.cssAttributes[key];
  }

  setChildren(children: Node[]) {
    this.children = children;
  }

  getChildren(): Node[] {
    return this.children;
  }

  getType() {
    return NodeType.BASE;
  }

  addAnnotations(key: string, value: any) {
    this.annotations[key] = value;
  }

  getAnnotation(key: string): any {
    return this.annotations[key];
  }

  getId() {
    return this.id;
  }
}

// doOverlap determines whether two boxes overlap with one another.
export const doOverlap = (
  currentCoordinate: BoxCoordinates,
  targetCoordinates: BoxCoordinates,
): boolean => {
  if (
    currentCoordinate.leftTop.x === currentCoordinate.rightBot.x ||
    currentCoordinate.leftTop.y === currentCoordinate.rightBot.y
  ) {
    return false;
  }

  if (
    targetCoordinates.leftTop.x === targetCoordinates.rightBot.x ||
    targetCoordinates.leftTop.y === targetCoordinates.rightBot.y
  ) {
    return false;
  }

  if (
    currentCoordinate.leftTop.x > targetCoordinates.rightBot.x ||
    targetCoordinates.leftTop.x > currentCoordinate.rightBot.x
  ) {
    return false;
  }

  if (
    currentCoordinate.rightBot.y < targetCoordinates.leftTop.y ||
    targetCoordinates.rightBot.y < currentCoordinate.leftTop.y
  ) {
    return false;
  }

  return true;
};

// doOutside determines whether any coorindate of the target box is outside of the current box.
export const doOutside = (
  currentCoordinates: BoxCoordinates,
  targetCoordinates: BoxCoordinates,
): boolean => {
  if (targetCoordinates.leftTop.x >= currentCoordinates.leftTop.x &&
    targetCoordinates.rightBot.x <= currentCoordinates.rightBot.x &&
    targetCoordinates.leftTop.y >= currentCoordinates.leftTop.y &&
    targetCoordinates.leftBot.y <= currentCoordinates.leftBot.y) {
    return false;
  }

  return true;
};

// getVisibleChildrenRenderingBox gets the children rendering  
const getVisibleChildrenRenderingBox = (children: Node[]): BoxCoordinates => {
  let xl = Infinity;
  let xr = -Infinity;
  let yt = Infinity;
  let yb = -Infinity;

  for (const child of children) {
    const type = child.getType();
    if (type !== NodeType.VISIBLE) {
      continue;
    }

    let coordinates = child.getAbsRenderingBox();

    if (coordinates.leftTop.x < xl) {
      xl = coordinates.leftTop.x;
    }

    if (coordinates.rightBot.x > xr) {
      xr = coordinates.rightBot.x;
    }

    if (coordinates.leftTop.y < yt) {
      yt = coordinates.leftTop.y;
    }

    if (coordinates.rightBot.y > yb) {
      yb = coordinates.rightBot.y;
    }
  }

  const boxCoordinates = {
    leftTop: {
      x: xl,
      y: yt,
    },
    leftBot: {
      x: xl,
      y: yb,
    },
    rightTop: {
      x: xr,
      y: yt,
    },
    rightBot: {
      x: xr,
      y: yb,
    },
  };

  return boxCoordinates;
};

const computePositionalRelationship = (
  currentCoordinates: BoxCoordinates,
  targetCoordinates: BoxCoordinates,
): PostionalRelationship => {
  if (
    targetCoordinates.leftTop.y >= currentCoordinates.leftTop.y &&
    targetCoordinates.leftTop.x >= currentCoordinates.leftTop.x &&
    targetCoordinates.rightBot.x <= currentCoordinates.rightBot.x &&
    targetCoordinates.rightBot.y <= currentCoordinates.rightBot.y
  ) {
    return PostionalRelationship.INCLUDE;
  }

  if (
    targetCoordinates.leftTop.y === currentCoordinates.leftTop.y &&
    targetCoordinates.leftTop.x === currentCoordinates.leftTop.x &&
    targetCoordinates.rightBot.x === currentCoordinates.rightBot.x &&
    targetCoordinates.rightBot.y === currentCoordinates.rightBot.y
  ) {
    return PostionalRelationship.COMPLETE_OVERLAP;
  }

  if (doOverlap(currentCoordinates, targetCoordinates)) {
    return PostionalRelationship.OVERLAP;
  }

  return PostionalRelationship.OUTSIDE;
};

export class GroupNode extends BaseNode {
  readonly id: string;
  node?: AdaptedNode;
  absRenderingBox: BoxCoordinates;

  constructor(children: Node[], node: AdaptedNode = null) {
    super();
    this.setChildren(children);
    this.absRenderingBox = this.computeAbsRenderingBox();

    if (!isEmpty(node)) {
      this.node = node;
      this.setCssAttributes(this.node.getCssAttributes());
      this.setPositionalCssAttributes(this.node.getPositionalCssAttributes());
    }
  }

  getType(): NodeType {
    return NodeType.GROUP;
  }

  setChildren(children: Node[]) {
    this.children = children;
    this.absRenderingBox = this.computeAbsRenderingBox();
  }

  getAbsRenderingBox() {
    return this.absRenderingBox;
  }

  getAbsBoundingBox() {
    if (!isEmpty(this.node)) {
      return this.node.getAbsoluteBoundingBoxCoordinates();
    }

    return this.getAbsRenderingBox();
  }

  getPositionalRelationship(targetNode: Node): PostionalRelationship {
    return computePositionalRelationship(
      this.absRenderingBox,
      targetNode.getAbsRenderingBox(),
    );
  }

  areThereOverflowingChildren(): boolean {
    const childrenRenderingBox = getVisibleChildrenRenderingBox(this.getChildren());
    const bbox = this.getAbsBoundingBox();

    if (childrenRenderingBox.leftTop.x === Infinity) {
      return false;
    }

    return doOutside(bbox, childrenRenderingBox);
  }

  private computeAbsRenderingBox(): BoxCoordinates {
    let xl = Infinity;
    let xr = -Infinity;
    let yt = Infinity;
    let yb = -Infinity;

    for (const child of this.getChildren()) {
      let coordinates = selectBox(child);

      if (coordinates.leftTop.x < xl) {
        xl = coordinates.leftTop.x;
      }

      if (coordinates.rightBot.x > xr) {
        xr = coordinates.rightBot.x;
      }

      if (coordinates.leftTop.y < yt) {
        yt = coordinates.leftTop.y;
      }

      if (coordinates.rightBot.y > yb) {
        yb = coordinates.rightBot.y;
      }
    }

    this.cssAttributes["width"] = `${Math.abs(xr - xl)}px`;
    this.cssAttributes["height"] = `${Math.abs(yb - yt)}px`;

    return {
      leftTop: {
        x: xl,
        y: yt,
      },
      leftBot: {
        x: xl,
        y: yb,
      },
      rightTop: {
        x: xr,
        y: yt,
      },
      rightBot: {
        x: xr,
        y: yb,
      },
    };
  }
}

export class VisibleNode extends BaseNode {
  readonly node: AdaptedNode;
  type: NodeType;

  constructor(node: AdaptedNode) {
    super();
    this.node = node;
    this.setCssAttributes(this.node.getCssAttributes());
    this.setPositionalCssAttributes(this.node.getPositionalCssAttributes());
  }

  getAbsBoundingBox(): BoxCoordinates {
    return this.node.getAbsoluteBoundingBoxCoordinates();
  }

  getType(): NodeType {
    return NodeType.VISIBLE;
  }

  getAbsRenderingBox(): BoxCoordinates {
    return this.node.getRenderingBoundsCoordinates();
  }

  getPositionalRelationship(targetNode: Node): PostionalRelationship {
    return computePositionalRelationship(
      this.getAbsRenderingBox(),
      targetNode.getAbsRenderingBox(),
    );
  }

  getOriginalId(): string {
    return this.node.getOriginalId();
  }

  areThereOverflowingChildren(): boolean {
    const childrenRenderingBox = getVisibleChildrenRenderingBox(this.getChildren());
    const bbox = this.getAbsBoundingBox();

    if (childrenRenderingBox.leftTop.x === Infinity) {
      return false;
    }

    if (childrenRenderingBox.leftTop.x > bbox.leftTop.x &&
      childrenRenderingBox.rightBot.x < bbox.rightBot.x &&
      childrenRenderingBox.leftTop.y > bbox.leftTop.y &&
      childrenRenderingBox.leftBot.y < bbox.leftBot.y) {
      return false;
    }

    return true;
  }
}

export class TextNode extends VisibleNode {
  fontSource: string;
  node: AdaptedTextNode;
  constructor(node: AdaptedTextNode) {
    super(node);
    this.node = node;
  }

  isItalic(): boolean {
    return this.node.isItalic();
  }

  getFamilyName(): string {
    return this.node.getFamilyName();
  }

  getAbsBoundingBox(): BoxCoordinates {
    return this.node.getAbsoluteBoundingBoxCoordinates();
  }

  getFontSource() {
    return this.fontSource;
  }

  setFontSource(source: string) {
    this.fontSource = source;
  }

  getText(): string {
    return this.node.getText();
  }

  getType(): NodeType {
    return NodeType.TEXT;
  }
}

export class VectorGroupNode extends GroupNode {
  readonly node: AdaptedVectorGroupNode;
  constructor(node: AdaptedVectorGroupNode, children: Node[] = []) {
    super(children);
    this.node = node;
  }

  getType(): NodeType {
    return NodeType.VECTOR_GROUP;
  }

  async export(exportFormat: ExportFormat): Promise<string> {
    return await this.node.export(exportFormat);
  }
}

export class VectorNode extends VisibleNode {
  readonly vectorNode: AdaptedVectorNode;
  constructor(node: AdaptedVectorNode) {
    super(node);
    this.vectorNode = node;
  }

  getType(): NodeType {
    return NodeType.VECTOR;
  }

  async export(exportFormat: ExportFormat): Promise<string> {
    return await this.vectorNode.export(exportFormat);
  }
}

export class ImageNode extends VisibleNode {
  readonly imageNode: AdaptedImageNode;
  constructor(node: AdaptedImageNode) {
    super(node);
    this.imageNode = node;
  }

  getType(): NodeType {
    return NodeType.IMAGE;
  }

  async export(exportFormat: ExportFormat): Promise<string> {
    return await this.imageNode.export(exportFormat);
  }
}

