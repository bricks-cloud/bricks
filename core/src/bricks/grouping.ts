import { Node, NodeType } from "./node";
import { Direction } from "./direction";
import {
  decideBetweenDirectionalOverlappingNodes,
  groupNodesByDirectionalOverlap,
} from "./directional-overlap";
import { groupNodesByOverlap, absolutePositioningAnnotation } from "./overlap";
import { groupNodesByInclusion } from "./inclusion";
import { isEmpty } from "../utils";

export const groupNodes = (parentNode: Node) => {
  const children = parentNode.getChildren();
  if (isEmpty(children)) {
    return;
  }

  if (parentNode.getType() === NodeType.VECTOR_GROUP) {
    return;
  }

  let unexploredNodes: Node[] = [];
  for (const child of children) {
    unexploredNodes.push(child);
  }


  let groupedNodes = groupNodesByInclusion(children);

  groupedNodes = groupNodesByOverlap(groupedNodes, parentNode);

  const horizontalSegmentedNodes = groupNodesByDirectionalOverlap(
    groupedNodes,
    Direction.HORIZONTAL
  );

  const verticalSegmentedNodes = groupNodesByDirectionalOverlap(
    groupedNodes,
    Direction.VERTICAL
  );

  const decided = decideBetweenDirectionalOverlappingNodes(
    horizontalSegmentedNodes,
    verticalSegmentedNodes
  );

  if (!isEmpty(decided)) {
    groupedNodes = decided;
  }

  if (groupedNodes.length > 1 && isEmpty(decided)) {
    parentNode.addAnnotations(absolutePositioningAnnotation, true);
  }

  for (const node of groupedNodes) {
    groupNodes(node);
  }

  parentNode.setChildren(groupedNodes);
};
