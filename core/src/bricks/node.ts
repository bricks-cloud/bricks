import uuid from "react-native-uuid";
import {
  Node as AdaptedNode,
  TextNode as AdaptedTextNode,
  BoxCoordinates,
  Attributes,
} from "../design/adapter/node";
import { filterAttributes } from "./util";

export enum PostionalRelationship {
  INCLUDE = "INCLUDE",
  OVERLAP = "OVERLAP",
  COMPLETE_OVERLAP = "COMPLETE_OVERLAP",
  OUTSIDE = "OUTSIDE",
}

export type Option = {
  truncateNumbers: boolean;
  zeroValueAllowed: boolean;
};

export type Node = GroupNode | VisibleNode | TextNode | VectorNode;

export enum NodeType {
  BASE = "BASE",
  GROUP = "GROUP",
  VISIBLE = "VISIBLE",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
}

export type Annotations = {
  [key: string]: any;
};

export class BaseNode {
  readonly id: string;
  children: Node[] = [];
  positionalCssAttributes: Attributes = {};
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
    option: Option = { zeroValueAllowed: false, truncateNumbers: true }
  ): Attributes {
    return filterAttributes(this.positionalCssAttributes, option);
  }

  addPositionalCssAttributes(attributes: Attributes) {
    this.positionalCssAttributes = {
      ...attributes,
      ...this.positionalCssAttributes,
    };
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
  targetCoordinates: BoxCoordinates
) => {
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

const computePositionalRelationship = (
  currentCoordinates: BoxCoordinates,
  targetCoordinates: BoxCoordinates
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
  absRenderingBox: BoxCoordinates;
  cssAttributes: Attributes = {};

  constructor(children: Node[]) {
    super();
    this.setChildren(children);
    this.absRenderingBox = this.computeAbsRenderingBox();
  }

  getCssAttributes(
    option: Option = { zeroValueAllowed: false, truncateNumbers: true }
  ): Attributes {
    return filterAttributes(this.cssAttributes, option);
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

  getPositionalRelationship(targetNode: Node): PostionalRelationship {
    return computePositionalRelationship(
      this.absRenderingBox,
      targetNode.getAbsRenderingBox()
    );
  }

  private computeAbsRenderingBox(): BoxCoordinates {
    let xl = Infinity;
    let xr = -Infinity;
    let yt = Infinity;
    let yb = -Infinity;

    for (const child of this.getChildren()) {
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
  }

  getCssAttributes(
    option: Option = { zeroValueAllowed: false, truncateNumbers: true }
  ): Attributes {
    return filterAttributes(this.node.getCssAttributes(), option);
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
      targetNode.getAbsRenderingBox()
    );
  }

  getOriginalId(): string {
    return this.node.getOriginalId();
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

export class VectorNode extends VisibleNode {
  constructor(node: AdaptedNode) {
    super(node);
  }

  getType(): NodeType {
    return NodeType.VECTOR;
  }
}
