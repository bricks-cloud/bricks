import { IBricksNode } from "../../IBricksNode";
import { groupNodes } from "./group-nodes";

export function groupTextNodes(nodes: IBricksNode[]): IBricksNode[] {
  const textNodes = nodes.filter((node) => node.type === "TEXT");
  const nonTextNodes = nodes.filter((node) => node.type !== "TEXT");

  if (textNodes.length === 0) {
    return nodes;
  }

  const groupedTextNodes = groupNodes(textNodes);

  return [
    // text nodes
    ...groupedTextNodes,
    // leave non-text nodes untouched
    ...nonTextNodes,
  ];
}
