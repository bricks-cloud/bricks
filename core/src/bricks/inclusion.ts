import { PostionalRelationship, Node } from "./node";

// groupNodesByInclusion groups nodes if they have an inclusion relationship
// input nodes are ordered by z-index
export const groupNodesByInclusion = (nodes: Node[]): Node[] => {
  let removedNodes = new Set<string>();
  let processed: Node[] = [];

  // starting from the first index because we want to find inclusion relationship from its closest node
  // in terms of z-index
  for (let i = 0; i < nodes.length; i++) {
    let currentNode = nodes[i];

    if (removedNodes.has(currentNode.getId())) {
      continue;
    }

    for (let j = i - 1; j >= 0; j--) {
      let targetNode = nodes[j];

      if (removedNodes.has(targetNode.getId())) {
        continue;
      }

      switch (currentNode.getPositionalRelationship(targetNode)) {
        case PostionalRelationship.COMPLETE_OVERLAP:
        case PostionalRelationship.INCLUDE:
          removedNodes.add(targetNode.getId());
          currentNode.addChildrenToFront([targetNode]);
      }
    }

  }

  for (let i = 0; i < nodes.length; i++) {
    let currentNode = nodes[i];

    if (removedNodes.has(currentNode.getId())) {
      continue;
    }

    processed.push(currentNode);
  }

  return processed;
};
