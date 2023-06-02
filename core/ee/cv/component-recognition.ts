import { Node, NodeType } from "../../src/bricks/node";
import {
  traverseNodes,
  getContainedText,
  getTextDescendants,
} from "../../src/utils";
import {
  AiApplication,
  aiApplicationRegistryGlobalInstance,
} from "../ui/ai-application-registry";
import { predictText } from "../web/request";

export const annotateNodeForHtmlTag = async (startingNode: Node) => {
  try {
    // const idImageMap: Record<string, string> = {};
    const buttonTextCandidates: { [id: string]: string } = {};
    const inputTextCandidates: { [id: string]: string } = {};

    await traverseNodes(startingNode, async (node) => {
      // if (node.id && node.getType() !== NodeType.TEXT) {
      //   const base64image = await node?.node?.export(ExportFormat.JPG);
      //   if (base64image) {
      //     idImageMap[node.id] = base64image;
      //   }
      // }

      if (isButtonCandidate(node)) {
        const text = getContainedText(node);
        buttonTextCandidates[node.id] = text;
      }

      if (isInputCandidate(node)) {
        const placeHolderText = getContainedText(node);
        inputTextCandidates[node.id] = placeHolderText;
      }

      return true;
    });

    console.log("buttonTextCandidates", buttonTextCandidates);
    console.log("inputTextCandidates", inputTextCandidates);

    const [
      predictTextResult,
      // predictImagesResult,
    ] = await Promise.allSettled([
      predictText({
        ...buttonTextCandidates,
        ...inputTextCandidates,
      }),
      // predictImage(idImageMap),
    ]);

    console.log("predictTextResult", predictTextResult);
    const textPredictions =
      predictTextResult.status === "fulfilled" ? predictTextResult.value : {};

    if (predictTextResult.status === "rejected") {
      console.error("Error with text prediction", predictTextResult.reason);
    }

    // const imagePredictions =
    //   predictImagesResult.status === "fulfilled"
    //     ? predictImagesResult.value
    //     : {};
    // if (predictImagesResult.status === "rejected") {
    //   console.error("Error with image prediction", predictImagesResult.reason);
    // }

    await traverseNodes(startingNode, async (node) => {
      const predictedHtmlTag = textPredictions[node.id];

      if (predictedHtmlTag) {
        aiApplicationRegistryGlobalInstance.addApplication(
          AiApplication.componentIdentification
        );
        node.addAnnotations("htmlTag", predictedHtmlTag);
        return predictedHtmlTag !== "button";
      }

      return true;
    });
  } catch (e) {
    console.error("Error with image or text detection", e);
  }
};

const isButtonCandidate = (node: Node) => {
  const textDecendants = getTextDescendants(node);
  const hasColor =
    node.getACssAttribute("background-color") ||
    node.getACssAttribute("border-color");
  const text = textDecendants[0]?.getText();

  return (
    node.getType() === NodeType.VISIBLE &&
    textDecendants.length === 1 &&
    hasColor &&
    text?.trim() &&
    text?.split(" ")?.length <= 5
  );
};

const isInputCandidate = (node: Node) => {
  const textDecendants = getTextDescendants(node);
  const hasColor =
    node.getACssAttribute("background-color") ||
    node.getACssAttribute("border-color");
  const text = textDecendants[0]?.getText();

  return (
    node.getType() === NodeType.VISIBLE &&
    textDecendants.length === 1 &&
    hasColor &&
    text?.trim() &&
    text?.split(" ")?.length <= 10
  );
};
