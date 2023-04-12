import { isEmpty } from "../utils";
import { Node, PostionalRelationship, GroupNode } from "./node";

const overlapAnnotation: string = "checkedForOverlap";
export const absolutePositioningAnnotation: string = "absolutePositioning";

// groupNodesByOverlap groups nodes if they have an overlap relationship.
export const groupNodesByOverlap = (nodes: Node[]): Node[] => {
  if (nodes.length < 2) {
    return nodes;
  }

  const skippable = new Set<string>();
  const processed: Node[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];

    if (currentNode.hasAnnotation(overlapAnnotation)) {
      return nodes;
    }

    if (skippable.has(currentNode.getId())) {
      continue;
    }

    const overlappingNodes = findOverlappingNodes(
      currentNode,
      nodes,
      new Set<string>()
    );

    if (isEmpty(overlappingNodes)) {
      processed.push(currentNode);
      continue;
    }

    overlappingNodes.forEach((overlappingNode) => {
      overlappingNode.addAnnotations(overlapAnnotation, true);
      skippable.add(overlappingNode.getId());
    });


    const newGroupNode = new GroupNode(overlappingNodes);
    newGroupNode.addAnnotations(absolutePositioningAnnotation, true);
    processed.push(newGroupNode);
    currentNode.addAnnotations(overlapAnnotation, true);
  }


  return processed;
};

// findOverlappingNodes finds all the overlapping nodes given a starting node.
export const findOverlappingNodes = (
  startingNode: Node,
  targetNodes: Node[],
  currentPath: Set<string>
): Node[] => {
  for (let i = 0; i < targetNodes.length; i++) {
    let targetNode = targetNodes[i];

    if (currentPath.has(targetNode.getId())) {
      continue;
    }

    const overlappingNodes = [];

    if (
      startingNode.getPositionalRelationship(targetNode) ===
      PostionalRelationship.OVERLAP
    ) {
      overlappingNodes.push(targetNode);

      if (!currentPath.has(startingNode.getId())) {
        overlappingNodes.push(startingNode);
        currentPath.add(startingNode.getId());
      }
      currentPath.add(targetNode.getId());
    }

    let completePath = [...overlappingNodes];
    for (const overlappingNode of overlappingNodes) {
      const result = findOverlappingNodes(
        overlappingNode,
        targetNodes,
        currentPath
      );
      completePath = completePath.concat(...result);
    }

    if (completePath.length !== 0) {
      return completePath;
    }
  }

  return [];
};
