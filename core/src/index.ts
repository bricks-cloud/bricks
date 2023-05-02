import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File, NameMap, UiFramework } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode, NodeType } from "./bricks/node";
import { detectWhetherSimilarNodesExist, registerRepeatedComponents } from "../ee/loop/loop";
import { traverseNodes } from "./utils";
import { predictImages, predictTexts } from "./ml";
import { ExportFormat } from "./design/adapter/node";
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
  try {
    const idImageMap: Record<string, string> = {};
    const idTextMap: Record<string, string> = {};

    await traverseNodes(startingNode, async (node) => {
      const originalId = node?.node?.getOriginalId();

      if (originalId && node?.getType() !== NodeType.TEXT) {
        const base64image = await node?.node?.export(ExportFormat.JPG);
        if (base64image) {
          idImageMap[originalId] = base64image;
        }
      }

      //@ts-ignore
      const text = node?.getText?.();
      if (
        originalId &&
        node?.getType?.() === NodeType.TEXT &&
        text?.split(" ")?.length <= 5 // only check text nodes with 5 words or less
      ) {
        idTextMap[originalId] = text;
      }

      return node?.getType() !== NodeType.VECTOR_GROUP;
    });

    console.log("idImageMap", idImageMap);
    console.log("idTextMap", idTextMap);

    const [predictImagesResult, predictTextsResult] = await Promise.allSettled([
      predictImages(idImageMap),
      predictTexts(idTextMap),
    ]);

    const textPredictions =
      predictTextsResult.status === "fulfilled" ? predictTextsResult.value : {};

    const imagePredictions =
      predictImagesResult.status === "fulfilled"
        ? predictImagesResult.value
        : {};

    if (predictImagesResult.status === "rejected") {
      console.error("Error with image prediction", predictImagesResult.reason);
    }

    if (predictTextsResult.status === "rejected") {
      console.error("Error with image prediction", predictTextsResult.reason);
    }

    console.log("imagePredictions", imagePredictions);
    console.log("textPredictions", textPredictions);

    await traverseNodes(startingNode, async (node) => {
      if (node.node) {
        const originalId = node.node.getOriginalId();
        const predictedHtmlTag =
          imagePredictions[originalId] || textPredictions[originalId];

        if (predictedHtmlTag) {
          node.addAnnotations("htmlTag", predictedHtmlTag);
          return predictedHtmlTag !== "a" && predictedHtmlTag !== "button";
        }
      }

      return true;
    });
  } catch (e) {
    console.error("Error with image or text detection", e);
  }

  registerRepeatedComponents(startingNode);

  const files: File[] = await generateCodingFiles(startingNode, option);

  const nameMap: NameMap = await getNameMap();
  replaceVariableNameWithinFile(files, nameMap);

  return files;
};
