import { Node, PostionalRelationship, GroupNode } from "./node";

const overlapAnnotation: string = "checkedForOverlap";
export const absolutePositioningAnnotation: string = "absolutePositioning";


// groupNodesByOverlap groups nodes if they have an overlap relationship.
export const groupNodesByOverlap = (nodes: Node[], parentNode: Node): Node[] => {
  if (parentNode.hasAnnotation(absolutePositioningAnnotation)) {
    return nodes;
  }

  if (nodes.length < 2) {
    return nodes;
  }

  const skippable = new Set<string>();
  const processed: Node[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];


    if (skippable.has(currentNode.getId())) {
      continue;
    }

    if (currentNode.hasAnnotation(overlapAnnotation)) {
      processed.push(currentNode);
      continue;
    }

    let currentPath: Set<string> = new Set<string>();
    findOverlappingNodes(
      i,
      currentNode,
      nodes,
      currentPath
    );

    if (currentPath.size === 0) {
      processed.push(currentNode);
      continue;
    }

    if (currentPath.size === nodes.length) {
      parentNode.addAnnotations(absolutePositioningAnnotation, true);
      return nodes;
    }

    let reordered: Node[] = [];
    for (let j = 0; j < nodes.length; j++) {
      let potentialNode: Node = nodes[j];
      if (currentPath.has(potentialNode.getId())) {
        potentialNode.addAnnotations(overlapAnnotation, true);
        skippable.add(potentialNode.getId());
        reordered.push(potentialNode);
      }
    }


    const newGroupNode = new GroupNode(reordered);
    newGroupNode.addAnnotations(absolutePositioningAnnotation, true);
    processed.push(newGroupNode);
  }

  return processed;
};

// findOverlappingNodes finds all the overlapping nodes given a starting node.
export const findOverlappingNodes = (
  startingIndex: number,
  startingNode: Node,
  targetNodes: Node[],
  currentPath: Set<string>
) => {
  for (let i = 0; i < targetNodes.length; i++) {
    let targetNode = targetNodes[i];

    if (currentPath.has(targetNode.getId())) {
      continue;
    }

    if (
      startingNode.getPositionalRelationship(targetNode) ===
      PostionalRelationship.OVERLAP || (startingNode.getPositionalRelationship(targetNode) ===
        PostionalRelationship.INCLUDE && startingIndex < i)
    ) {
      if (!currentPath.has(startingNode.getId())) {
        currentPath.add(startingNode.getId());
      }
      currentPath.add(targetNode.getId());

      findOverlappingNodes(
        i,
        targetNode,
        targetNodes,
        currentPath
      );
    }
  }
};
