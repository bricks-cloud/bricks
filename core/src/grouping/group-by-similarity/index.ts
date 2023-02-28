import { BricksNode } from "../../BricksNode";
import { isAutoLayout } from "../../utils";
import { groupNodes } from "./group-nodes";

export function groupBySimilarity(
  nodes: BricksNode[],
  skipGrouping: boolean = false
): BricksNode[] {
  let result: BricksNode[] = nodes;

  if (!skipGrouping) {
    let textNodes = nodes.filter((n) => n.type === "TEXT");

    while (true) {
      const originalNumberOfNodes = textNodes.length;
      textNodes = groupNodes(textNodes);
      if (textNodes.length === originalNumberOfNodes) {
        break;
      }
    }

    let groupedNodes = [
      ...textNodes,
      ...nodes.filter((n) => n.type !== "TEXT"),
    ];

    while (true) {
      const originalNumberOfNodes = groupedNodes.length;
      groupedNodes = groupNodes(groupedNodes);
      if (groupedNodes.length === originalNumberOfNodes) {
        break;
      }
    }

    result = groupedNodes;
  }

  // recursively group by similarity
  nodes.forEach((node) => {
    node.children = groupBySimilarity(
      node.children,
      // skip grouping if already has auto layout
      isAutoLayout(node)
    );
  });

  return result;
}
