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
  GROUP = "GROUP",
  VISIBLE = "VISIBLE",
}

class BaseNode {
  readonly id: string;
  readonly type: string;
  private children: Node[] = [];

  constructor(type: string) {
    this.id = uuid.v1() as string;
    this.type = type;
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
    return this.type;
  }

  getId() {
    return this.id;
  }
}

export class GroupNode extends BaseNode {
  readonly id: string;

  constructor(children: Node[]) {
    super(NodeType.GROUP);
    this.setChildren(children);
  }
}

export class VisibleNode extends BaseNode {
  readonly node: AdaptedNode;

  constructor(node: AdaptedNode) {
    super(NodeType.VISIBLE);
    this.node = node;
  }

  getType() {
    return NodeType.VISIBLE;
  }

  getAbsRenderingBox(): BoundingBoxCoordinates {
    return this.node.getBoundingBoxCoordinates();
  }

  getPositionalRelationship(targetNode: VisibleNode): PostionalRelationship {
    const targetCoordinates = targetNode.getAbsRenderingBox();
    const coordinates = this.node.getBoundingBoxCoordinates();

    if (
      targetCoordinates.leftTop.y > coordinates.leftTop.y &&
      targetCoordinates.leftTop.x > coordinates.leftTop.x &&
      targetCoordinates.rightBot.x < coordinates.rightBot.x &&
      targetCoordinates.rightBot.y < coordinates.rightBot.y
    ) {
      return PostionalRelationship.INCLUDE;
    }

    if (
      targetCoordinates.leftTop.y === coordinates.leftTop.y &&
      targetCoordinates.leftTop.x === coordinates.leftTop.x &&
      targetCoordinates.rightBot.x === coordinates.rightBot.x &&
      targetCoordinates.rightBot.y === coordinates.rightTop.y
    ) {
      return PostionalRelationship.COMPLETE_OVERLAP;
    }

    if (doOverlap(coordinates, targetCoordinates)) {
      return PostionalRelationship.OVERLAP;
    }

    return PostionalRelationship.OUTSIDE;
  }
}
