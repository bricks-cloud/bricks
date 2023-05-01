import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode, NodeType } from "./bricks/node";
import { traverseNodes } from "./utils";
import { predictImages, predictTexts } from "./ml";
import { ExportFormat } from "./design/adapter/node";

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

      const [predictImagesResult, predictTextsResult] =
        await Promise.allSettled([
          predictImages(idImageMap),
          predictTexts(idTextMap),
        ]);

      const textPredictions =
        predictTextsResult.status === "fulfilled"
          ? predictTextsResult.value
          : {};

      const imagePredictions =
        predictImagesResult.status === "fulfilled"
          ? predictImagesResult.value
          : {};

      if (predictImagesResult.status === "rejected") {
        console.error(
          "Error with image prediction",
          predictImagesResult.reason
        );
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
