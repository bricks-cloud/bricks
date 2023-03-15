import uuid from "react-native-uuid";
import { Node as AdaptedNode, BoundingBoxCoordinates } from "../adapter/node";
import { doOverlap } from "./util";

export enum PostionalRelationship {
  INCLUDE = "INCLUDE",
  OVERLAP = "OVERLAP",
  COMPLETE_OVERLAP = "COMPLETE_OVERLAP",
  OUTSIDE = "OUTSIDE",
}

export type Node = GroupNode | VisibleNode;

export enum NodeType {
  BASE = "BASE",
  GROUP = "GROUP",
  VISIBLE = "VISIBLE",
  TEXT = "TEXT",
  VECTOR = "VECTOR"
}

class BaseNode {
  readonly id: string;
  children: Node[] = [];

  constructor() {
    this.id = uuid.v1() as string;
  }

  addChildren(children: Node[]) {
    this.children = this.children.concat(children);
  }

  setChildren(children: Node[]) {
    this.children = children;
  }

  getChildren() {
    return this.children;
  }

  getType() {
    return NodeType.BASE;;
  }

  getId() {
    return this.id;
  }
}

const computePositionalRelationship = (currentCoordinates: BoundingBoxCoordinates, targetCoordinates: BoundingBoxCoordinates): PostionalRelationship => {
  if (targetCoordinates.leftTop.y >= currentCoordinates.leftTop.y
    && targetCoordinates.leftTop.x >= currentCoordinates.leftTop.x
    && targetCoordinates.rightBot.x <= currentCoordinates.rightBot.x
    && targetCoordinates.rightBot.y <= currentCoordinates.rightBot.y) {
    return PostionalRelationship.INCLUDE;
  }

  if (targetCoordinates.leftTop.y === currentCoordinates.leftTop.y
    && targetCoordinates.leftTop.x === currentCoordinates.leftTop.x
    && targetCoordinates.rightBot.x === currentCoordinates.rightBot.x
    && targetCoordinates.rightBot.y === currentCoordinates.rightBot.y
  ) {
    return PostionalRelationship.COMPLETE_OVERLAP;
  }

  if (doOverlap(currentCoordinates, targetCoordinates)) {
    return PostionalRelationship.OVERLAP;
  }

  return PostionalRelationship.OUTSIDE;
}

export class GroupNode extends BaseNode {
  readonly id: string;
  absRenderingBox: BoundingBoxCoordinates;

  constructor(children: Node[]) {
    super();
    this.setChildren(children);
    this.absRenderingBox = this.computeAbsRenderingBox();
  }


  getType(): NodeType {
    return NodeType.GROUP;
  }

  setChildren(children: Node[]) {
    this.children = children;
    this.absRenderingBox = this.computeAbsRenderingBox();
  };

  getAbsRenderingBox() {
    return this.absRenderingBox;
  }

  getPositionalRelationship(targetNode: Node): PostionalRelationship {
    return computePositionalRelationship(this.absRenderingBox, targetNode.getAbsRenderingBox());
  }

  private computeAbsRenderingBox(): BoundingBoxCoordinates {
    let xl = Infinity;
    let xr = -Infinity;
    let yt = Infinity;
    let yb = -Infinity;

    for (const child of this.getChildren()) {
      const coordinates = child.getAbsRenderingBox();
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
        yb = coordinates.leftBot.y;
      }
    }

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

  constructor(node: AdaptedNode) {
    super();
    this.node = node;
  }

  getType(): NodeType {
    return NodeType.VISIBLE;
  }

  getAbsRenderingBox(): BoundingBoxCoordinates {
    return this.node.getBoundingBoxCoordinates();
  }

  getPositionalRelationship(targetNode: Node): PostionalRelationship {
    return computePositionalRelationship(this.getAbsRenderingBox(), targetNode.getAbsRenderingBox());
  }

  debug() {
    console.log(this.node.getOriginalId());
  }

  getOriginalId(): string {
    return this.node.getOriginalId();
  }
}


export class TextNode extends VisibleNode {
  constructor(node: AdaptedNode) {
    super(node);
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