import {
  Node,
} from "./node";
import { getLineBasedOnDirection } from "./line";

// Direction represents the way how elements are positioned within a Bricks node.
// VERTICAL direction means that elements are organized in row. It corresponds to the CSS property flex-direction: row.
// HORIZONTAL direction means that elements are organized in column. It corresponds to the CSS property flex-direction: column.
export enum Direction {
  VERTICAL = "VERTICAL",
  HORIZONTAL = "HORIZONTAL"
};

// getDirection figures out whether nodes are positioned using row vs column.
export const getDirection = (nodes: Node[]): Direction => {
  if (nodes.length <= 1) {
    return Direction.HORIZONTAL;
  }

  let noVerticalOverlap = true;
  for (let i = 0; i < nodes.length; i++) {
    const currentLine = getLineBasedOnDirection(nodes[i], Direction.HORIZONTAL);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) {
        continue;
      }
      const targetLine = getLineBasedOnDirection(nodes[j], Direction.HORIZONTAL);
      noVerticalOverlap = noVerticalOverlap && !currentLine.overlap(targetLine);
    }
  }

  if (noVerticalOverlap) {
    return Direction.HORIZONTAL;
  }

  return Direction.VERTICAL;
};

// reorderNodesBasedOnDirection reorders input nodes based on direction in ascending order.
export const reorderNodesBasedOnDirection = (nodes: Node[], direction: Direction) => {
  if (direction === Direction.VERTICAL) {
    nodes.sort((a: Node, b: Node): number => {
      const xa = a.getAbsRenderingBox().leftTop.x;
      const xb = b.getAbsRenderingBox().leftTop.x;

      return xa - xb;
    });
    return;
  }

  nodes.sort((a: Node, b: Node): number => {
    const ya = a.getAbsRenderingBox().leftTop.y;
    const yb = b.getAbsRenderingBox().leftTop.y;

    return ya - yb;
  });
};

export const getOppositeDirection = (direction: Direction) => {
  if (direction === Direction.VERTICAL) {
    return Direction.HORIZONTAL;
  }

  return Direction.VERTICAL;
};