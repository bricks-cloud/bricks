import { getLineBasedOnDirection } from "./line";
import { Direction } from "./direction";
import { Node, GroupNode } from "./node";

// groupNodesByDirectionalOverlap groups nodes by finding one directional overlap
export const groupNodesByDirectionalOverlap = (
  nodes: Node[],
  direction: Direction
): Node[] => {
  if (nodes.length < 2) {
    return nodes;
  }

  const skippable = new Set<string>();
  const segmentedNodes: Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];

    if (skippable.has(currentNode.getId())) {
      continue;
    }

    const nodesToBeMerged = findDirectionalOverlappingNodes(
      currentNode,
      nodes,
      new Set<string>(),
      direction
    );

    if (nodesToBeMerged.length <= 1) {
      segmentedNodes.push(currentNode);
      continue;
    }

    nodesToBeMerged.forEach((node) => {
      skippable.add(node.getId());
    });

    segmentedNodes.push(new GroupNode(nodesToBeMerged));
  }

  return segmentedNodes;
};

// decideBetweenDirectionalOverlappingNodes decides between two sets of grouped directional overlapping nodes.
export const decideBetweenDirectionalOverlappingNodes = (
  horizontalSegmentedNodes: Node[],
  verticalSegmentedNodes: Node[]
): Node[] => {
  // when the length of segmented nodes is less than 2, it means that nodes cannot be grouped.
  if (
    horizontalSegmentedNodes.length < 2 &&
    verticalSegmentedNodes.length >= 2
  ) {
    return verticalSegmentedNodes;
  }

  if (
    verticalSegmentedNodes.length < 2 &&
    horizontalSegmentedNodes.length >= 2
  ) {
    return horizontalSegmentedNodes;
  }

  // when nodes can be both horizontally and vertically segmented, choose the nodes with lesser segmentations.
  // An array of segmented nodes has an length - 1 number of segmentations
  if (
    horizontalSegmentedNodes.length >= 2 &&
    verticalSegmentedNodes.length >= 2
  ) {
    return horizontalSegmentedNodes.length < verticalSegmentedNodes.length
      ? horizontalSegmentedNodes
      : verticalSegmentedNodes;
  }

  return [];
};

// findDirectionalOverlappingNodes finds all the directional overlapping nodes given a starting node
export const findDirectionalOverlappingNodes = (
  startingNode: Node,
  targetNodes: Node[],
  currentPath: Set<string>,
  direction: Direction
): Node[] => {
  let line = getLineBasedOnDirection(startingNode, direction);

  let completePath: Node[] = [];
  for (let i = 0; i < targetNodes.length; i++) {
    let targetNode = targetNodes[i];
    if (currentPath.has(targetNode.getId())) {
      continue;
    }

    if (targetNode.getId() === startingNode.getId()) {
      continue;
    }

    const targetLine = getLineBasedOnDirection(targetNode, direction);
    if (line.overlap(targetLine)) {
      completePath.push(targetNode);
      currentPath.add(targetNode.getId());

      if (!currentPath.has(startingNode.getId())) {
        completePath.push(startingNode);
        currentPath.add(startingNode.getId());
      }
    }
  }

  for (const overlappingNode of completePath) {
    const result = findDirectionalOverlappingNodes(
      overlappingNode,
      targetNodes,
      currentPath,
      direction
    );
    completePath = completePath.concat(...result);
  }

  if (completePath.length !== 0) {
    return completePath;
  }

  return [];
};
