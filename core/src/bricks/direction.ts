import { Node } from "./node";
import { getContainerLineFromNodes, getLineBasedOnDirection } from "./line";
import { BoxCoordinates } from "../design/adapter/node";
import { selectBox } from "./additional-css";
import { absolutePositioningAnnotation } from "./overlap";

// Direction represents the way how elements are positioned within a Bricks node.
// VERTICAL direction means that elements are organized in row. It corresponds to the CSS property flex-direction: row.
// HORIZONTAL direction means that elements are organized in column. It corresponds to the CSS property flex-direction: column.
export enum Direction {
  VERTICAL = "VERTICAL",
  HORIZONTAL = "HORIZONTAL",
}

// getDirection figures out whether nodes are positioned using row vs column.
export const getDirection = (node: Node): Direction => {
  const children: Node[] = node.getChildren();
  if (children.length <= 1) {
    const targetLine = getContainerLineFromNodes(
      children,
      Direction.HORIZONTAL
    );
    const parentLine = getContainerLineFromNodes([node], Direction.HORIZONTAL);

    const counterTargetLine = getContainerLineFromNodes(
      children,
      Direction.VERTICAL
    );
    const counterParentLine = getContainerLineFromNodes(
      [node],
      Direction.VERTICAL
    );

    let useHorizontal: boolean =
      Math.abs(
        parentLine.upper -
          parentLine.lower -
          (targetLine.upper - targetLine.lower)
      ) >
      Math.abs(
        counterParentLine.upper -
          counterParentLine.lower -
          (counterTargetLine.upper - counterTargetLine.lower)
      );

    if (useHorizontal) {
      return Direction.HORIZONTAL;
    }

    return Direction.VERTICAL;
  }

  let noVerticalOverlap = true;
  for (let i = 0; i < children.length; i++) {
    const currentLine = getLineBasedOnDirection(
      children[i],
      Direction.HORIZONTAL
    );
    for (let j = 0; j < children.length; j++) {
      if (i === j) {
        continue;
      }
      const targetLine = getLineBasedOnDirection(
        children[j],
        Direction.HORIZONTAL
      );
      noVerticalOverlap =
        noVerticalOverlap && !currentLine.overlap(targetLine, 2);
    }
  }

  if (noVerticalOverlap) {
    return Direction.HORIZONTAL;
  }

  return Direction.VERTICAL;
};

// reorderNodesBasedOnDirection reorders input nodes based on direction in ascending order.
export const reorderNodesBasedOnDirection = (node, direction: Direction) => {
  if (node.hasAnnotation(absolutePositioningAnnotation)) {
    return;
  }

  const children: Node[] = node.getChildren();

  if (direction === Direction.VERTICAL) {
    children.sort((a: Node, b: Node): number => {
      const abox: BoxCoordinates = selectBox(a);
      const bbox: BoxCoordinates = selectBox(b);

      const xa = abox.leftTop.x;
      const xb = bbox.leftTop.x;

      return xa - xb;
    });
    return;
  }

  children.sort((a: Node, b: Node): number => {
    const abox: BoxCoordinates = selectBox(a);
    const bbox: BoxCoordinates = selectBox(b);

    const ya = abox.leftTop.y;
    const yb = bbox.leftTop.y;

    return ya - yb;
  });
};

export const getOppositeDirection = (direction: Direction) => {
  if (direction === Direction.VERTICAL) {
    return Direction.HORIZONTAL;
  }

  return Direction.VERTICAL;
};
