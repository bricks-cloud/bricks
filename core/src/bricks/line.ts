import { Node } from "./node";
import { Direction } from "./direction";
import { selectBox } from "./additional-css";

// RelativePosition represents a point's position relative to a line.
enum RelativePoisition {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  CONTAIN = "CONTAIN",
}

// getLineBasedOnDirection gets the boundary of a node depending on the input direction.
export const getLineBasedOnDirection = (node: Node, direction: Direction, useBoundingBox: boolean = false) => {
  const coordinates = selectBox(node, useBoundingBox);

  if (direction === Direction.HORIZONTAL) {
    return new Line(coordinates.leftTop.y, coordinates.rightBot.y);
  }

  return new Line(coordinates.leftTop.x, coordinates.rightBot.x);
};


// getLineUsingRenderingBoxBasedOnDirection gets the rendering boundary of a node depending on the input direction.
export const getLineUsingRenderingBoxBasedOnDirection = (node: Node, direction: Direction, useBoundingBox: boolean = false) => {
  const coordinates = node.getAbsRenderingBox();

  if (direction === Direction.HORIZONTAL) {
    return new Line(coordinates.leftTop.y, coordinates.rightBot.y);
  }

  return new Line(coordinates.leftTop.x, coordinates.rightBot.x);
};

// Bricks nodes are bounded by a rectangular box.
// Line could be seen as a boundary of this rectangular box.
export class Line {
  readonly upper: number;
  readonly lower: number;

  constructor(pointA: number, pointB: number) {
    if (pointA >= pointB) {
      this.upper = pointA;
      this.lower = pointB;
      return;
    }

    this.upper = pointB;
    this.lower = pointA;
  }

  getLength(): number {
    return Math.abs(this.upper - this.lower);
  }

  getMid(): number {
    return (this.upper + this.lower) / 2;
  }

  contain(point: number): boolean {
    return point >= this.lower && point <= this.upper;
  }

  getRelativeLinePosition(point: number): RelativePoisition {
    if (this.lower > point) {
      return RelativePoisition.RIGHT;
    }

    if (this.upper < point) {
      return RelativePoisition.LEFT;
    }

    return RelativePoisition.CONTAIN;
  }

  getSymetricDifference = (point: number): number => {
    const distanceFromUpper = Math.abs(this.upper - point);
    const distanceFromLower = Math.abs(point - this.lower);
    return distanceFromUpper - distanceFromLower;
  };

  overlap(l: Line, buffer: number): boolean {
    if (this.lower + buffer > l.upper) {
      return false;
    }

    if (this.upper - buffer < l.lower) {
      return false;
    }

    return true;
  }
}

// getLinesFromNodes gets boundaries from nodes based on direction.
export const getLinesFromNodes = (
  nodes: Node[],
  direction: Direction
): Line[] => {
  const lines: Line[] = [];
  for (const node of nodes) {
    const renderingBox = selectBox(node, true);

    if (direction === Direction.VERTICAL) {
      lines.push(new Line(renderingBox.leftTop.x, renderingBox.rightBot.x));
      continue;
    }

    lines.push(new Line(renderingBox.leftTop.y, renderingBox.rightBot.y));
  }

  return lines;
};

// getContainerLineFromNodes gets an all encompassing Line from input nodes.
// the start of this line is the lowest directional x / y value from the nodes,
// and the end of this line is the highest directional x / y value from the nodes
export const getContainerLineFromNodes = (
  nodes: Node[],
  direction: Direction,
  useBoundingBox: boolean = false
): Line => {
  let lower: number = Infinity;
  let upper: number = -Infinity;
  if (direction === Direction.HORIZONTAL) {
    for (let i = 0; i < nodes.length; i++) {
      const renderingBox = selectBox(nodes[i], useBoundingBox);
      lower = renderingBox.leftTop.y < lower ? renderingBox.leftTop.y : lower;
      upper = renderingBox.rightBot.y > upper ? renderingBox.rightBot.y : upper;
    }

    return new Line(lower, upper);
  }

  for (let i = 0; i < nodes.length; i++) {
    const renderingBox = selectBox(nodes[i], useBoundingBox);
    lower = renderingBox.leftTop.x < lower ? renderingBox.leftTop.x : lower;
    upper = renderingBox.rightBot.x > upper ? renderingBox.rightBot.x : upper;
  }

  return new Line(lower, upper);
};

export const getContainerRenderingLineFromNodes = (
  nodes: Node[],
  direction: Direction,
  useBoundingBox: boolean = false
): Line => {
  let lower: number = Infinity;
  let upper: number = -Infinity;
  if (direction === Direction.HORIZONTAL) {
    for (let i = 0; i < nodes.length; i++) {
      const renderingBox = nodes[i].getAbsRenderingBox();
      lower = renderingBox.leftTop.y < lower ? renderingBox.leftTop.y : lower;
      upper = renderingBox.rightBot.y > upper ? renderingBox.rightBot.y : upper;
    }

    return new Line(lower, upper);
  }

  for (let i = 0; i < nodes.length; i++) {
    const renderingBox = nodes[i].getAbsRenderingBox();
    lower = renderingBox.leftTop.x < lower ? renderingBox.leftTop.x : lower;
    upper = renderingBox.rightBot.x > upper ? renderingBox.rightBot.x : upper;
  }

  return new Line(lower, upper);
};

