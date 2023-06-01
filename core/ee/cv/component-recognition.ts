import parseColor from "color-parse";
import { ExportFormat } from "../../src/design/adapter/node";
import { Node, NodeType } from "../../src/bricks/node";
import {
  traverseNodes,
  getContainedText,
  getDescendants,
} from "../../src/utils";
import {
  AiApplication,
  aiApplicationRegistryGlobalInstance,
} from "../ui/ai-application-registry";
import { predictImage } from "../web/request";
import { calculateContrast } from "./utils";

export const annotateNodeForHtmlTag = async (startingNode: Node) => {
  try {
    const idImageMap: Record<string, string> = {};
    const buttonTextCandidates: { [originalId: string]: string } = {};
    const inputTextCandidates: { [originalId: string]: string } = {};

    await traverseNodes(startingNode, async (node) => {
      const originalId = node?.node?.getOriginalId();

      if (!originalId) {
        return true;
      }

      if (originalId && node?.getType() !== NodeType.TEXT) {
        const base64image = await node?.node?.export(ExportFormat.JPG);
        if (base64image) {
          idImageMap[originalId] = base64image;
        }
      }

      if (isButtonCandidate(node)) {
        const text = getContainedText(node);
        if (text.trim() && text.split(" ").length <= 5) {
          buttonTextCandidates[originalId] = text;
        }
      }

      if (isInputCandidate(node)) {
        const placeHolderText = getContainedText(node);
        if (placeHolderText.trim() && placeHolderText.split(" ").length <= 10) {
          inputTextCandidates[originalId] = placeHolderText;
        }
      }

      return true;
    });

    console.log("buttonTextCandidates", buttonTextCandidates);
    console.log("inputTextCandidates", inputTextCandidates);

    const [predictImagesResult] = await Promise.allSettled([
      predictImage(idImageMap),
    ]);

    console.log("predictImagesResult", predictImagesResult);

    // const imagePredictions =
    //   predictImagesResult.status === "fulfilled"
    //     ? predictImagesResult.value
    //     : {};

    if (predictImagesResult.status === "rejected") {
      console.error("Error with image prediction", predictImagesResult.reason);
    }

    // await traverseNodes(startingNode, async (node) => {
    //   if (node.node) {
    //     const originalId = node.node.getOriginalId();
    //     const predictedHtmlTag = imagePredictions[originalId];

    //     if (predictedHtmlTag) {
    //       aiApplicationRegistryGlobalInstance.addApplication(
    //         AiApplication.componentIdentification
    //       );
    //       node.addAnnotations("htmlTag", predictedHtmlTag);
    //       return predictedHtmlTag !== "button";
    //     }
    //   }

    //   return true;
    // });
  } catch (e) {
    console.error("Error with image or text detection", e);
  }
};

const isButtonCandidate = (node: Node) => {
  const nodeType = node?.getType();
  const textDecendants = getDescendants(
    node,
    (node) => node.getType() === NodeType.TEXT
  );

  // a button should be a group or visible node with only one text node with font size <= 20
  return (
    (nodeType === NodeType.GROUP || nodeType === NodeType.VISIBLE) &&
    textDecendants.length === 1 &&
    textDecendants[0]
      //@ts-ignore
      ?.getStyledTextSegments()
      ?.every((segment) => segment.fontSize <= 20)
  );
};

const isInputCandidate = (node: Node) => {
  const nodeType = node?.getType();
  const textDecendants = getDescendants(
    node,
    (node) => node.getType() === NodeType.TEXT
  );

  // only look for nodes with exactly one text child
  if (textDecendants.length !== 1) {
    return false;
  }

  const textColors = textDecendants[0]
    //@ts-ignore
    ?.getStyledTextSegments()
    ?.map((segment) => segment.color);

  const { averageR, averageG, averageB } = getAverageColor(textColors);

  // Check contrast of average font color with parent's color
  const parentColor = parseColor(
    node.getACssAttribute("background-color") ||
      node.getACssAttribute("border-color") ||
      ""
  );

  // Parent either has no color or has a non-rgb color
  // TODO: handle cases where parent has a non-rgb color
  if (parentColor.space !== "rgb") {
    return false;
  }

  const contrast = calculateContrast(
    [averageR, averageG, averageB],
    parentColor.values
  );

  //@ts-ignore
  // console.log("Text", textDecendants[0]?.getText(), "contrast", contrast);

  return (
    nodeType === NodeType.VISIBLE &&
    textDecendants[0]
      //@ts-ignore
      ?.getStyledTextSegments()
      ?.every((segment) => segment.fontSize <= 20) &&
    contrast <= 4
  );
};

function getAverageColor(rgbStrings: string[]) {
  let numOfColors = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  rgbStrings.forEach((color) => {
    const parsedColor = parseColor(color);
    if (parsedColor.space === "rgb") {
      const [r, g, b] = parsedColor.values;
      sumR += r;
      sumG += g;
      sumB += b;
      numOfColors += 1;
    }
  });
  const averageR = sumR / numOfColors;
  const averageG = sumG / numOfColors;
  const averageB = sumB / numOfColors;
  return { averageR, averageG, averageB };
}
