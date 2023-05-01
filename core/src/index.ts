import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode, NodeType } from "./bricks/node";
import { traverseNodes } from "./utils";
import { predictImages, predictTexts } from "./ml";

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

  // this is not a great fix
  // setStartingNodeWidth(startingNode);

  addAdditionalCssAttributesToNodes(startingNode);

  const enableAi = true;
  if (enableAi) {
    try {
      const nonTextNodesIds = [];
      const idTextPairs: [string, string][] = [];

      traverseNodes(startingNode, (node) => {
        const originalId = node?.node?.getOriginalId();

        if (originalId && node?.getType() !== NodeType.TEXT) {
          nonTextNodesIds.push(originalId);
        }

        //@ts-ignore
        const text = node?.getText?.();
        if (
          originalId &&
          node?.getType?.() === NodeType.TEXT &&
          text?.split(" ")?.length <= 5 // only check text nodes with 5 words or less
        ) {
          idTextPairs.push([originalId, text]);
        }

        return node?.getType() !== NodeType.VECTOR_GROUP;
      });

      console.log("nonTextNodesIds", nonTextNodesIds);
      console.log("idTextPairs", idTextPairs);

      const [predictImagesResult, predictTextsResult] =
        await Promise.allSettled([
          predictImages(nonTextNodesIds),
          predictTexts(idTextPairs.map(([_, text]) => text)),
        ]);

      const textPredictions =
        predictTextsResult.status === "fulfilled"
          ? predictTextsResult.value.predictions.reduce(
              (acc, prediction, index) => {
                const id = idTextPairs[index][0];
                acc[id] = prediction;
                return acc;
              },
              {}
            )
          : {};

      const imagePredictions =
        predictImagesResult.status === "fulfilled"
          ? predictImagesResult.value
          : {};

      console.log("imagePredictions", imagePredictions);
      console.log("textPredictions", textPredictions);

      traverseNodes(startingNode, (node) => {
        if (node.node) {
          const originalId = node.node.getOriginalId();
          const predictedHtmlTag = imagePredictions[originalId];
          const isLink = textPredictions[originalId] === 1;

          if (predictedHtmlTag) {
            // only predicting <button> for now
            node.addAnnotations("htmlTag", predictedHtmlTag);
            return false;
          }

          if (isLink) {
            node.addAnnotations("htmlTag", "a");
            return false;
          }
        }
        return true;
      });
    } catch (e) {
      console.error("Error with AI", e);
    }
  }

  return generateCodingFiles(startingNode, option);
};

// const setStartingNodeWidth = (node: Node) => {
//   const boundingBox = node.getAbsBoundingBox();
//   node.addCssAttributes({
//     "width": `${boundingBox.rightBot.x - boundingBox.leftTop.x}px`,
//     "height": `${boundingBox.rightBot.y - boundingBox.leftTop.y}px`,
//   });
// };
