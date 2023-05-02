import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File, NameMap, UiFramework } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode } from "./bricks/node";
import { detectWhetherSimilarNodesExist, registerRepeatedComponents } from "../ee/loop/loop";
import { getNameMap } from "../ee/web/request";
import { instantiateNameRegistryGlobalInstance } from "./code/name-registry/name-registry";
import { instantiateOptionRegistryGlobalInstance } from "./code/option-registry/option-registry";
import { instantiateFontsRegistryGlobalInstance } from "./code/generator/tailwindcss/fonts-registry";
import { removeCompletelyOverlappingNodes, removeNode } from "./bricks/remove-node";
import { isEmpty, replaceVariableNameWithinFile } from "./utils";
import { instantiateCodeSampleRegistryGlobalInstance } from "../ee/loop/code-sample-registry";
import { instantiateDataArrRegistryGlobalInstance } from "../ee/loop/data-array-registry";
import { instantiatePropRegistryGlobalInstance } from "../ee/loop/prop-registry";
import { instantiateComponentRegistryGlobalInstance } from "../ee/loop/component-registry";

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

  groupNodes(startingNode);

  startingNode = removeNode(startingNode);
  removeCompletelyOverlappingNodes(startingNode, null);

  addAdditionalCssAttributesToNodes(startingNode);

  instantiateOptionRegistryGlobalInstance(option);
  instantiateFontsRegistryGlobalInstance(startingNode);
  instantiateNameRegistryGlobalInstance();

  instantiateCodeSampleRegistryGlobalInstance();
  instantiateDataArrRegistryGlobalInstance();
  instantiatePropRegistryGlobalInstance();
  instantiateComponentRegistryGlobalInstance();

  return await generateCodingFiles(startingNode, option);
};


export const scanCodeForSimilarNodes = (
  figmaNodes: readonly SceneNode[],
  option: Option
): boolean => {
  if (isEmpty(option.uiFramework) || option.uiFramework !== UiFramework.react) {
    return false;
  }

  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return false;
  }


  let startingNode: Node =
    converted.length > 1 ? new GroupNode(converted) : converted[0];

  groupNodes(startingNode);

  startingNode = removeNode(startingNode);
  removeCompletelyOverlappingNodes(startingNode, null);

  addAdditionalCssAttributesToNodes(startingNode);

  instantiateOptionRegistryGlobalInstance(option);
  instantiateFontsRegistryGlobalInstance(startingNode);
  instantiateNameRegistryGlobalInstance();

  instantiateCodeSampleRegistryGlobalInstance();
  instantiateDataArrRegistryGlobalInstance();
  instantiatePropRegistryGlobalInstance();
  instantiateComponentRegistryGlobalInstance();

  return detectWhetherSimilarNodesExist(startingNode);
};


export const convertToCodeWithAi = async (
  figmaNodes: readonly SceneNode[],
  option: Option
): Promise<File[]> => {

  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  let startingNode: Node =
    converted.length > 1 ? new GroupNode(converted) : converted[0];

  groupNodes(startingNode);

  startingNode = removeNode(startingNode);
  removeCompletelyOverlappingNodes(startingNode, null);

  addAdditionalCssAttributesToNodes(startingNode);

  instantiateOptionRegistryGlobalInstance(option);
  instantiateFontsRegistryGlobalInstance(startingNode);
  instantiateNameRegistryGlobalInstance();

  instantiateCodeSampleRegistryGlobalInstance();
  instantiateDataArrRegistryGlobalInstance();
  instantiatePropRegistryGlobalInstance();
  instantiateComponentRegistryGlobalInstance();

  // ee features
  registerRepeatedComponents(startingNode);

  const files: File[] = await generateCodingFiles(startingNode, option);

  const nameMap: NameMap = await getNameMap();
  replaceVariableNameWithinFile(files, nameMap);

  return files;
};
