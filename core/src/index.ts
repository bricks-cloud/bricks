import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addPositionalCSSAttributesToNodes } from "./bricks/positional-css";
import { Node, GroupNode } from "./bricks/node";

export const convertToCode = async (
  figmaNodes: readonly SceneNode[],
  option: Option
): Promise<File[]> => {
  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  let startingNode: Node =
    converted.length > 1 ? new GroupNode(converted) : converted[0];

  console.log("converted: ", converted);

  groupNodes(startingNode);
  addPositionalCSSAttributesToNodes(startingNode);

  return generateCodingFiles(startingNode, option);
};
