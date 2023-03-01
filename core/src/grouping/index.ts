import { BricksNode } from "../BricksNode";
import { isAutoLayout } from "../utils";
import { convertToBricksNodes } from "./group-by-autolayout";
import { groupByContainers } from "./group-by-containers";
// import { groupByRepetition } from "./group-by-repetition";
import { groupBySimilarity } from "./group-by-similarity";

export async function generateBricksNode(
  figmaNodes: readonly SceneNode[]
): Promise<BricksNode[]> {
  // post order needed for convertToBricksNodes() to work
  const ungroupedFigmaNodes = figmaNodes.map(extractNodesInPostOrder).flat(1);

  // if autolayout is already set up, respect the existing grouping
  let bricksNodes = await convertToBricksNodes(ungroupedFigmaNodes);
  console.log("groupByAutolayout", JSON.parse(JSON.stringify(bricksNodes)));

  // if a node overlaps with another, group them together
  bricksNodes = groupByContainers(bricksNodes);
  console.log("groupByContainers", JSON.parse(JSON.stringify(bricksNodes)));

  // group nodes by visual cues
  bricksNodes = groupBySimilarity(bricksNodes);
  console.log("groupBySimilarity", JSON.parse(JSON.stringify(bricksNodes)));

  // group nodes by repetition, commenting out for now as we don't see much use case and we want to simply the code
  // bricksNodes = groupByRepetition(bricksNodes);
  // console.log("groupByRepetition", JSON.parse(JSON.stringify(bricksNodes)));

  return bricksNodes;
}

function extractNodesInPostOrder(root: SceneNode): SceneNode[] {
  let results: SceneNode[] = [];

  // only process visible nodes
  if (!root.visible) {
    return [];
  }

  // SVG icons
  if (
    //@ts-ignore
    root?.children?.every((child) => child.type === "VECTOR")
  ) {
    return [root];
  }

  //@ts-ignore
  root?.children?.forEach((child: SceneNode) => {
    results = results.concat(extractNodesInPostOrder(child));
  });

  if (
    // ignore GROUPs and FRAMEs made by designers because they're not always reliable, unless it has autolayout set up
    root.type !== "GROUP" &&
    (root.type !== "FRAME" || isAutoLayout(root)) &&
    // ignore COMPONENTs and INSTANCEs because they don't need to be converted to code
    root.type !== "COMPONENT" &&
    root.type !== "INSTANCE"
  ) {
    results.push(root);
  }

  return results;
}
