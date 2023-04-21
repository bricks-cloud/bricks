import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode, NodeType } from "./bricks/node";
import { traverseNodes } from "./utils";

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
      const originalIds = [];

      // TODO: maybe don't get ALL ids?
      traverseNodes(startingNode, (node) => {
        if (node.node) {
          originalIds.push(node.node.getOriginalId());
        }
        return node.getType() !== NodeType.VECTOR_GROUP;
      });

      const response = await fetch(
        // "https://ml-backend-nfhyx3cm5q-uc.a.run.app/predict/universal",
        "http://localhost:8080/predict/universal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // TODO: allow users to pass in their own API key
            "X-API-KEY": process.env.ML_BACKEND_API_KEY,
          },
          body: JSON.stringify({
            ids: originalIds,

            // TODO: figure out workaround so users don't have to pass in figmatoken and filekey?
            figmaToken: process.env.FIGMA_TOKEN,
            fileKey: "6P3EluMjO1528T7OtthbI9",
          }),
        }
      );

      const predictions = await response.json(); // { <figma_node_id>: <predicted_html_tag> }

      traverseNodes(startingNode, (node) => {
        if (node.node) {
          const originalId = node.node.getOriginalId();
          const predictedHtmlTag = predictions[originalId];

          if (predictedHtmlTag) {
            node.addAnnotations("htmlTag", predictedHtmlTag);
            // stop traversing if tag is a or button because they cannot be nested
            return predictedHtmlTag === "a" || predictedHtmlTag === "button";
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
