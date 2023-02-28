import { isAutoLayout } from "../utils";
import { BricksNode } from "../BricksNode";

export async function convertToBricksNodes(
  figmaNodes: SceneNode[]
): Promise<BricksNode[]> {
  let nodesGroupedByAutolayout: BricksNode[] = [];

  for (let i = 0; i < figmaNodes.length; i++) {
    const currentNode = figmaNodes[i];

    if (isAutoLayout(currentNode)) {
      // if the node has auto layout, we know that it is of type FRAME
      const currentFrameNode = currentNode as FrameNode;

      const newNode: BricksNode = {
        source: "figma",
        children: [],
        id: currentFrameNode.id,
        name: currentFrameNode.name,
        type: "FRAME",
        layoutMode: currentFrameNode.layoutMode || "NONE",
        primaryAxisAlignItems: currentFrameNode.primaryAxisAlignItems,
        counterAxisAlignItems: currentFrameNode.counterAxisAlignItems,
        absoluteBoundingBox: currentFrameNode.absoluteBoundingBox,
        absoluteRenderbounds: currentFrameNode.absoluteRenderBounds,
      };

      // need to get all descendents instead of direct children because we ignored nodes of type GROUP
      const descendents = getAllDescendents(currentFrameNode);

      descendents.forEach((child: SceneNode) => {
        // nodesGroupedByAutolayout should already have current node's children because figmaNodes is sorted in post-order (i.e. child to parent)
        const indexOfChild = nodesGroupedByAutolayout.findIndex(
          (node) => node.id === child.id
        );

        if (indexOfChild < 0) return;

        newNode.children.push(
          nodesGroupedByAutolayout.splice(indexOfChild, 1)[0]
        );
      });

      nodesGroupedByAutolayout.push(newNode);
    } else if (
      //@ts-ignore
      currentNode.children &&
      //@ts-ignore
      currentNode.children.every((child) => child.type === "VECTOR")
    ) {
      const buf = await currentNode.exportAsync({ format: "SVG" });
      const svg = String.fromCharCode.apply(null, new Uint16Array(buf));
      nodesGroupedByAutolayout.push({
        source: "figma",
        children: [],
        id: currentNode.id,
        name: currentNode.name,
        type: "VECTOR",
        layoutMode: "NONE",
        //@ts-ignore
        absoluteBoundingBox: currentNode.absoluteBoundingBox,
        //@ts-ignore
        absoluteRenderbounds: currentNode.absoluteRenderBounds,
        svg,
      });
      // only process nodes that are visible
      //@ts-ignore
    } else if (currentNode.absoluteRenderBounds) {
      nodesGroupedByAutolayout.push({
        source: "figma",
        children: [],
        id: currentNode.id,
        name: currentNode.name,
        type: currentNode.type,
        layoutMode: "NONE",
        //@ts-ignore
        absoluteBoundingBox: currentNode.absoluteBoundingBox,
        //@ts-ignore
        absoluteRenderbounds: currentNode.absoluteRenderBounds,
      });
    }
  }

  return nodesGroupedByAutolayout;
}

function getAllDescendents(root: SceneNode): SceneNode[] {
  let results: SceneNode[] = [];

  //@ts-ignore
  if (root.children) {
    //@ts-ignore
    root.children.forEach((child) => {
      results.push(...getAllDescendents(child));
    });

    //@ts-ignore
    results.push(...root.children);
  }

  return results;
}
