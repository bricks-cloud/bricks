import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File, NameMap } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { registerRepeatedComponents } from "../ee/loop/loop";
import { Node, GroupNode } from "./bricks/node";
import { getNameMap } from "../ee/web/request";
import { instantiateNameRegistryGlobalInstance } from "./code/name-registry/name-registry";
import { instantiateOptionRegistryGlobalInstance } from "./code/option-registry/option-registry";
import { instantiateFontsRegistryGlobalInstance } from "./code/generator/tailwindcss/fonts-registry";
import {
  removeChildrenNode,
  removeCompletelyOverlappingNodes,
  removeNode,
} from "./bricks/remove-node";
import { isEmpty, replaceVariableNameWithinFile, trackEvent } from "./utils";
import { instantiateCodeSampleRegistryGlobalInstance } from "../ee/loop/code-sample-registry";
import { instantiateDataArrRegistryGlobalInstance } from "../ee/loop/data-array-registry";
import { instantiatePropRegistryGlobalInstance } from "../ee/loop/prop-registry";
import { instantiateComponentRegistryGlobalInstance } from "../ee/loop/component-registry";
import { annotateNodeForHtmlTag } from "../ee/cv/component-recognition";
import {
  instantiateAiApplicationRegistryGlobalInstance,
  AiApplication,
  aiApplicationRegistryGlobalInstance,
} from "../ee/ui/ai-application-registry";
import {
  EVENT_AI_CODE_GEN_SUCCESS,
  EVENT_AI_COMPONENT_IDENTIFICATION_SUCCESS,
  EVENT_AI_GET_NAME_SUCCESS,
} from "./analytic/amplitude";
import { removeCssFromNode } from "./bricks/remove-css";
// import { instantiateRadialRadientRegistryGlobalInstance } from "./code/generator/tailwindcss/radient-registry";

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

  addAdditionalCssAttributesToNodes(startingNode, startingNode);
  removeCssFromNode(startingNode);

  return await generateCodingFiles(startingNode, option);
};

export const convertToCodeWithAi = async (
  figmaNodes: readonly SceneNode[],
  option: Option
): Promise<[File[], AiApplication[]]> => {
  let start: number = Date.now();
  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [[], []];
  }

  const dedupedNodes: Node[] = [];
  for (const node of converted) {
    let newNode: Node = removeNode(node);
    removeCompletelyOverlappingNodes(newNode, null);
    removeChildrenNode(newNode);
    dedupedNodes.push(newNode);
  }

  let startingNode: Node =
    dedupedNodes.length > 1 ? new GroupNode(dedupedNodes) : dedupedNodes[0];

  groupNodes(startingNode);

  startingNode = removeNode(startingNode);
  removeCompletelyOverlappingNodes(startingNode, null);
  removeChildrenNode(startingNode);

  instantiateRegistries(startingNode, option);

  addAdditionalCssAttributesToNodes(startingNode, startingNode);
  removeCssFromNode(startingNode);

  // ee features
  let startAnnotateHtmlTag: number = Date.now();
  await annotateNodeForHtmlTag(startingNode);
  registerRepeatedComponents(startingNode);
  let endAnnotateHtmlTag: number = Date.now();
  trackEvent(EVENT_AI_COMPONENT_IDENTIFICATION_SUCCESS, {
    duration: endAnnotateHtmlTag - startAnnotateHtmlTag,
  });

  const files: File[] = await generateCodingFiles(startingNode, option);

  // ee features
  let startGetNameMap: number = Date.now();
  const nameMap: NameMap = await getNameMap();
  let endGetNameMap: number = Date.now();
  trackEvent(EVENT_AI_GET_NAME_SUCCESS, {
    duration: endGetNameMap - startGetNameMap,
  });

  if (!isEmpty(Object.values(nameMap))) {
    aiApplicationRegistryGlobalInstance.addApplication(
      AiApplication.autoNaming
    );
  }
  replaceVariableNameWithinFile(files, nameMap);

  let end: number = Date.now();
  trackEvent(EVENT_AI_CODE_GEN_SUCCESS, {
    duration: end - start,
  });

  return [files, aiApplicationRegistryGlobalInstance.getApplications()];
};

const instantiateRegistries = (startingNode: Node, option: Option) => {
  instantiateOptionRegistryGlobalInstance(option);
  instantiateFontsRegistryGlobalInstance(startingNode);
  // instantiateRadialRadientRegistryGlobalInstance(startingNode);
  instantiateNameRegistryGlobalInstance();
  instantiateAiApplicationRegistryGlobalInstance();

  instantiateCodeSampleRegistryGlobalInstance();
  instantiateDataArrRegistryGlobalInstance();
  instantiatePropRegistryGlobalInstance();
  instantiateComponentRegistryGlobalInstance();
};
