import { PostionalRelationship, Node } from "./node";

const inclusionAnnotation: string = "checkedForInclusion";

// groupNodesByInclusion groups nodes if they have an inclusion relationship
// input nodes are ordered by z-index
export const groupNodesByInclusion = (nodes: Node[]): Node[] => {
  let removedNodes = new Set<string>();
  let processed: Node[] = [];

  console.log("nodes: ", nodes);

  // starting from the last index because we want to find inclusion relationship from its closest node
  // in terms of z-index
  for (let i = nodes.length - 1; i >= 0; i--) {
    let currentNode = nodes[i];

    if (currentNode.getAnnotation(inclusionAnnotation)) {
      return nodes;
    }

    if (removedNodes.has(currentNode.getId())) {
      continue;
    }

    for (let j = i + 1; j < nodes.length; j++) {
      let targetNode = nodes[j];

      if (removedNodes.has(targetNode.getId())) {
        continue;
      }

      switch (currentNode.getPositionalRelationship(targetNode)) {
        case PostionalRelationship.COMPLETE_OVERLAP:
        case PostionalRelationship.INCLUDE:
          removedNodes.add(targetNode.getId());
          currentNode.addChildren([targetNode]);
      }
    }

    for (let j = 0; j < i; j++) {
      let targetNode = nodes[j];

      if (removedNodes.has(targetNode.getId())) {
        continue;
      }

      switch (currentNode.getPositionalRelationship(targetNode)) {
        case PostionalRelationship.COMPLETE_OVERLAP:
        case PostionalRelationship.INCLUDE:
          removedNodes.add(targetNode.getId());
          currentNode.addChildren([targetNode]);
      }
    }

    console.log("currentNode: ", currentNode);
  }

  for (let i = 0; i < nodes.length; i++) {
    let currentNode = nodes[i];

    currentNode.addAnnotations(inclusionAnnotation, true);
    if (removedNodes.has(currentNode.getId())) {
      continue;
    }

    processed.push(currentNode);
  }

  console.log("processed: ", processed);
  return processed;
};
