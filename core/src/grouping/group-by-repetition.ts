import { BricksNode } from "../BricksNode";
import { isAutoLayout } from "../utils";
import { DBSCAN } from "./dbscan";
import {
  getBottomY,
  getBoundingBox,
  getCenterX,
  getCenterY,
  getLeftX,
  getRightX,
  getTopY,
  wrapInContainerNode,
} from "./group-by-similarity/utils";

export function groupByRepetition(
  nodes: BricksNode[],
  skipGrouping: boolean = false
): BricksNode[] {
  if (nodes.length === 0) {
    return [];
  }

  let result: BricksNode[] = nodes;

  if (!skipGrouping) {
    const nodesGroupedByRepetition: BricksNode[] = [];

    const assignedNodeIds = new Set<string>();

    for (const startingNode of nodes) {
      if (
        startingNode.layoutMode === "NONE" ||
        assignedNodeIds.has(startingNode.id)
      ) {
        continue;
      }

      // find all other unassigned nodes that have the same length and orientation
      const candidateNodes = nodes.filter(
        (node) =>
          node.id !== startingNode.id &&
          !assignedNodeIds.has(node.id) &&
          node.children.length === startingNode.children.length &&
          node.layoutMode === startingNode.layoutMode
      );

      // from those nodes, find all nodes that are aligned in counter axis
      let group = findNodesAlignedInCounterAxis([
        startingNode,
        ...candidateNodes,
      ]);

      if (group.length > 1) {
        // break up group if there's another node in between
        for (let i = 0; i < group.length - 1; i++) {
          if (isThereAnythingBetween(group[i], group[i + 1], nodes)) {
            group = group.slice(0, i + 1);
          }
        }

        if (group.length > 1) {
          nodesGroupedByRepetition.push(
            wrapInContainerNode(
              rearrangeNodes(group),
              //@ts-ignore
              group[0].layoutMode,
              // TODO: change MIN to something else
              "MIN"
            )
          );
        }

        // mark nodes as assigned
        group.map((n) => n.id).forEach((id) => assignedNodeIds.add(id));
      }
    }

    result = [
      ...nodesGroupedByRepetition,
      // unassigned nodes
      ...nodes.filter((n) => !assignedNodeIds.has(n.id)),
    ];
  }

  // recursively group by repetition
  nodes.forEach((node) => {
    node.children = groupByRepetition(
      node.children,
      // skip grouping if already has auto layout
      isAutoLayout(node)
    );
  });

  return result;
}

function findNodesAlignedInCounterAxis(nodes: BricksNode[]): BricksNode[] {
  const startingNode = nodes[0];

  if (startingNode.layoutMode === "NONE") {
    throw new Error("Shouldn't have layoutMode === NONE here!");
  }

  const counterAxisDirection =
    startingNode.layoutMode === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";

  for (let i = 0; i < startingNode.children.length; i++) {
    const nodesInCounterAxis = [...nodes.map((n) => n.children[i])];

    let assignedNodeIndices: Set<number>;

    if (counterAxisDirection === "VERTICAL") {
      const alignBottomNodeIndices = new DBSCAN(
        nodesInCounterAxis.map(getBottomY)
      )
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      const alignVerticalCentersNodeIndices = new DBSCAN(
        nodesInCounterAxis.map(getCenterY)
      )
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      const alignTopNodeIndices = new DBSCAN(nodesInCounterAxis.map(getTopY))
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      assignedNodeIndices = new Set<number>([
        ...alignBottomNodeIndices,
        ...alignVerticalCentersNodeIndices,
        ...alignTopNodeIndices,
      ]);
    } else {
      const alignLeftNodeIndices = new DBSCAN(nodesInCounterAxis.map(getLeftX))
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      const alignHorizontalCentersNodeIndices = new DBSCAN(
        nodesInCounterAxis.map(getCenterX)
      )
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      const alignRightNodeIndices = new DBSCAN(
        nodesInCounterAxis.map(getRightX)
      )
        .run({ epsilon: 3, minPts: 2 })
        .filter((group) => group.includes(0))
        .flat(1);

      assignedNodeIndices = new Set<number>([
        ...alignLeftNodeIndices,
        ...alignHorizontalCentersNodeIndices,
        ...alignRightNodeIndices,
      ]);
    }
    // only keep nodes that are aligned with startingNode
    nodes.filter((_, index) => assignedNodeIndices.has(index + 1));

    if (nodes.length <= 1) {
      break;
    }
  }

  return nodes;
}

function isThereAnythingBetween(
  me: BricksNode,
  you: BricksNode,
  otherNodes: BricksNode[]
): boolean {
  const ourBounds = getBoundingBox([
    me.absoluteRenderbounds,
    you.absoluteRenderbounds,
  ]);
  const possibleThirdWheels = otherNodes.filter(
    (node) => node.id !== me.id && node.id !== you.id
  );

  for (const thirdWheel of possibleThirdWheels) {
    const thirdWheelBounds = thirdWheel.absoluteRenderbounds;

    // If one rectangle is on left side of other, then there is no overlap
    if (
      ourBounds.x > thirdWheelBounds.x + thirdWheelBounds.width ||
      thirdWheelBounds.x > ourBounds.x + ourBounds.width
    ) {
      continue;
    }

    // If one rectangle is above other, then there is no overlap
    if (
      thirdWheelBounds.y > ourBounds.y + ourBounds.height ||
      ourBounds.y > thirdWheelBounds.y + thirdWheelBounds.height
    ) {
      continue;
    }

    // Otherwise, there is overlap
    return true;
  }

  return false;
}

function rearrangeNodes(nodes: BricksNode[]): BricksNode[] {
  const result = [];
  const newDirection =
    nodes[0].layoutMode === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";

  for (let i = 0; i < nodes[0].children.length; i++) {
    const children = nodes.map((node) => node.children[i]);
    // TODO: change MIN to something else
    result.push(wrapInContainerNode(children, newDirection, "MIN"));
  }

  return result;
}
