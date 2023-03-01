import { IBricksNode } from "../../IBricksNode";
import { DBSCAN } from "../dbscan";

export function resolveConflictByArea(
  node: IBricksNode,
  ...groups: IBricksNode[][]
): IBricksNode[][] {
  let groupToAssignTo = 0;
  let minDifferenceToGroupAvgArea = Infinity;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const diff = differenceToGroupAvgArea(node, group);

    // assign node to a group with a more similar average area
    // TODO: implement a more robust way of resolving conflicts by checking styles
    if (group.length > 1 && diff < minDifferenceToGroupAvgArea) {
      groupToAssignTo = i;
      minDifferenceToGroupAvgArea = diff;
    }
  }

  for (let i = 0; i < groups.length; i++) {
    if (i !== groupToAssignTo) {
      removeNodeFromGroup(node, groups[i]);
    }
  }

  return groups;
}

function differenceToGroupAvgArea(node: IBricksNode, group: IBricksNode[]) {
  const groupAvgArea =
    group.reduce((prev, cur) => {
      const { absoluteRenderbounds } = cur;
      return prev + absoluteRenderbounds.height * absoluteRenderbounds.width;
    }, 0) / group.length;

  const nodeArea =
    node.absoluteRenderbounds.height * node.absoluteRenderbounds.width;

  return Math.abs(nodeArea - groupAvgArea);
}

export function resolveConflictByDist(
  node: IBricksNode,
  direction: "VERTICAL" | "HORIZONTAL",
  ...groups: IBricksNode[][]
): IBricksNode[][] {
  let groupToAssignTo = 0;
  let minDistToGroup = Infinity;
  let maxGroupSize = -Infinity;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const diff = minDifferenceToGroup(node, group, direction);

    // assign node to the closer group, if difference is the same, assign to group with the most nodes
    if (group.length > 1) {
      if (diff < minDistToGroup) {
        groupToAssignTo = i;
        minDistToGroup = diff;
      } else if (diff === minDistToGroup && group.length > maxGroupSize) {
        groupToAssignTo = i;
      }

      if (group.length > maxGroupSize) {
        maxGroupSize = group.length;
      }
    }
  }

  for (let i = 0; i < groups.length; i++) {
    if (i !== groupToAssignTo) {
      removeNodeFromGroup(node, groups[i]);
    }
  }

  return groups;
}

function minDifferenceToGroup(
  node: IBricksNode,
  group: IBricksNode[],
  direction: "VERTICAL" | "HORIZONTAL"
) {
  return Math.min(
    ...group.map((n) => {
      if (n.id === node.id) return Infinity;

      if (direction === "VERTICAL") {
        return Math.min(
          Math.abs(
            n.absoluteBoundingBox.y -
              (node.absoluteBoundingBox.y + node.absoluteBoundingBox.height)
          ),
          Math.abs(
            node.absoluteBoundingBox.y -
              (n.absoluteBoundingBox.y + n.absoluteBoundingBox.height)
          )
        );
      }

      return Math.min(
        Math.abs(
          n.absoluteBoundingBox.x -
            (node.absoluteBoundingBox.x + node.absoluteBoundingBox.width)
        ),
        Math.abs(
          node.absoluteBoundingBox.x -
            (n.absoluteBoundingBox.x + n.absoluteBoundingBox.width)
        )
      );
    })
  );
}

function removeNodeFromGroup(node: IBricksNode, group: IBricksNode[]) {
  const indexToRemove = group.findIndex((n) => n.id === node.id);

  if (indexToRemove >= 0) {
    group.splice(indexToRemove, 1);
  }
}

export function intersection(
  groupsOne: IBricksNode[],
  groupsTwo: IBricksNode[]
): IBricksNode[] {
  return groupsOne.filter((node) =>
    groupsTwo.map((n) => n.id).includes(node.id)
  );
}

export function intersectionNum(...arrays: number[][]): number[] {
  // initialize
  const result = new Set(arrays[0]);

  // check if each element in set is in other arrays
  for (const array of arrays) {
    for (const el of Array.from(result)) {
      if (!array.includes(el)) {
        result.delete(el);
        if (result.size === 0) return [];
      }
    }
  }

  return Array.from(result);
}

export function groupWithId(id: string) {
  return (group: IBricksNode[]) => group.some((node) => node.id === id);
}

/**
 *  Groups nodes that have the same gap together. For example, if input looks like this:
 *  ( [node][node]         [node] )
 *  First create sub-arrays to group it up like this:
 *  ( ( [node][node] )     ([node]) )
 *  Then, for each sub-array with length > 1, wrap it in a container node.
 */
export function groupByGap(
  nodes: IBricksNode[],
  direction: "VERTICAL" | "HORIZONTAL",
  counterAxisAlignItems: "MIN" | "CENTER" | "MAX"
): IBricksNode[] {
  if (nodes.length === 1) {
    return nodes;
  }

  /**
   * Calculate nodes' "positions" so that the difference between two nodes' positions equal to the gap between them.
   * For example, in this layout
   * [Node A]--8--[Node B]----16----[Node C]
   * Nodes A, B, and C will have positions 0, 0+8=8, 8+16=24 respectively.
   */
  const positions: number[] = [0];

  let currentPosition = 0;
  let minGap = Infinity;

  for (let index = 0; index < nodes.length - 1; index++) {
    const currentNode = nodes[index];

    const currentNodeBounds = currentNode.absoluteBoundingBox;
    const nextNodeBounds = nodes[index + 1]?.absoluteBoundingBox;

    const gapToNext =
      index === nodes.length - 1
        ? Infinity
        : direction === "VERTICAL"
        ? nextNodeBounds.y - (currentNodeBounds.y + currentNodeBounds.height)
        : nextNodeBounds.x - (currentNodeBounds.x + currentNodeBounds.width);

    if (gapToNext < minGap) {
      minGap = gapToNext;
    }
    currentPosition += gapToNext;

    positions.push(currentPosition);
  }

  // cluster nodes
  const groups = new DBSCAN(positions.map((num) => [num]))
    .run({
      epsilon: minGap * 1.5,
      minPts: 1,
    })
    .map((group) => group.map((i) => nodes[i]))
    .map((group) =>
      wrapInContainerNode(group, direction, counterAxisAlignItems)
    );

  return groups;
}

export function wrapInContainerNode(
  nodes: IBricksNode[],
  layoutMode: "VERTICAL" | "HORIZONTAL",
  counterAxisAlignItems: "MIN" | "CENTER" | "MAX"
): IBricksNode {
  if (nodes.length === 0) {
    throw new Error("Cannot create a container for nothing!");
  }

  if (nodes.length === 1) {
    return nodes[0];
  }

  return {
    source: "bricks",
    children: nodes,
    // todo: implement a better id generator
    id: String(Math.floor(Math.random() * 10_000_000_000)),
    name: "container",
    type: "FRAME",
    layoutMode,
    counterAxisAlignItems,
    absoluteBoundingBox: getBoundingBox(
      nodes.map((node) => node.absoluteBoundingBox)
    ),
    absoluteRenderbounds: getBoundingBox(
      nodes.map((node) => node.absoluteRenderbounds)
    ),
  };
}

export function getBoundingBox(rects: Rect[]): Rect {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));

  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function ascendinglyByBoundingBoxXThenY(a: IBricksNode, b: IBricksNode) {
  return (
    a.absoluteBoundingBox.x - b.absoluteBoundingBox.x ||
    a.absoluteBoundingBox.y - b.absoluteBoundingBox.y
  );
}

export function getBottomY(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.y + node.absoluteBoundingBox.height];
}

export function getCenterY(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.y + node.absoluteBoundingBox.height / 2];
}

export function getTopY(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.y];
}

export function getLeftX(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.x];
}

export function getCenterX(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.x + node.absoluteBoundingBox.width / 2];
}

export function getRightX(node: IBricksNode): [number] {
  return [node.absoluteBoundingBox.x + node.absoluteBoundingBox.width];
}
