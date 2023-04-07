import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode } from "./bricks/node";

export const convertToCode = async (
  figmaNodes: readonly SceneNode[],
  option: Option,
): Promise<File[]> => {
  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  let startingNode: Node =
    converted.length > 1 ? new GroupNode(converted) : converted[0];


  console.log("startingNode: ", startingNode);


  groupNodes(startingNode);


  console.log("groupNodes: ", startingNode);


  // this is not a great fix
  setStartingNodeWidth(startingNode);

  addAdditionalCssAttributesToNodes(startingNode);

  return generateCodingFiles(startingNode, option);
};

const setStartingNodeWidth = (node: Node) => {
  const boundingBox = node.getAbsBoundingBox();
  node.addCssAttributes({
    "width": `${boundingBox.rightBot.x - boundingBox.leftTop.x}px`,
    "height": `${boundingBox.rightBot.y - boundingBox.leftTop.y}px`,
  });
};
