import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode } from "./bricks/node";
import { instantiateNameRegistryGlobalInstance } from "./code/name-registry/name-registry";
import { instantiateOptionRegistryGlobalInstance } from "./code/option-registry/option-registry";
import { instantiateFontsRegistryGlobalInstance } from "./code/generator/tailwindcss/fonts-registry";
import {
  removeChildrenNode,
  removeCompletelyOverlappingNodes,
  removeNode,
} from "./bricks/remove-node";
import { removeCssFromNode } from "./bricks/remove-css";
import { instantiateAssetRegistryGlobalInstance } from "./code/asset-registry/asset-registry";
import { generateAssets } from "./code/generator/assets";

export const convertToCode = async (
  figmaNodes: readonly SceneNode[],
  option: Option
): Promise<File[]> => {
  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  const dedupedNodes: Node[] = [];
  for (const node of converted) {
    let newNode: Node = removeNode(node);
    removeCompletelyOverlappingNodes(newNode, null);
    removeChildrenNode(newNode);
    dedupedNodes.push(newNode);
  }

  let startingNode: Node =
    dedupedNodes.length > 1 ? new GroupNode(converted) : converted[0];

  groupNodes(startingNode);

  startingNode = removeNode(startingNode);
  removeCompletelyOverlappingNodes(startingNode, null);
  removeChildrenNode(startingNode);

  instantiateRegistries(startingNode, option);

  await generateAssets(startingNode);
  addAdditionalCssAttributesToNodes(startingNode, startingNode);
  removeCssFromNode(startingNode);

  return await generateCodingFiles(startingNode, option);
};

const instantiateRegistries = (startingNode: Node, option: Option) => {
  instantiateOptionRegistryGlobalInstance(option);
  instantiateFontsRegistryGlobalInstance(startingNode);
  instantiateNameRegistryGlobalInstance();
  instantiateAssetRegistryGlobalInstance();
};
