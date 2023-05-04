import { Node, NodeType } from "../../src/bricks/node";
import { ExportFormat } from "../../src/design/adapter/node";
import { traverseNodes } from "../../src/utils";
import { AiApplication, aiApplicationRegistryGlobalInstance } from "../ui/ai-application-registry";
import { predictImage, predictText } from "../web/request";

export const annotateNodeForHtmlTag = async (startingNode: Node) => {
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

    // console.log("idImageMap", idImageMap);
    // console.log("idTextMap", idTextMap);

    const [predictImagesResult, predictTextsResult] = await Promise.allSettled([
      predictImage(idImageMap),
      predictText(idTextMap),
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

    // console.log("imagePredictions", imagePredictions);
    // console.log("textPredictions", textPredictions);

    await traverseNodes(startingNode, async (node) => {
      if (node.node) {
        const originalId = node.node.getOriginalId();
        const predictedHtmlTag =
          imagePredictions[originalId] || textPredictions[originalId];

        if (predictedHtmlTag) {
          aiApplicationRegistryGlobalInstance.addApplication(AiApplication.componentIdentification);
          node.addAnnotations("htmlTag", predictedHtmlTag);
          return predictedHtmlTag !== "a" && predictedHtmlTag !== "button";
        }
      }

      return true;
    });
  } catch (e) {
    console.error("Error with image or text detection", e);
  }
};