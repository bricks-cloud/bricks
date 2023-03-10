import { Node, VisibleNode } from "../../bricks/node";
import { isEmpty } from "lodash";
import { BoundingBoxCoordinates } from "../node";

export class FigmaNodeAdapter {
  private node: SceneNode;
  constructor(node: SceneNode) {
    this.node = node;
  }

  getBoundingBoxCoordinates(): BoundingBoxCoordinates {
    const boundingBox = this.node.absoluteBoundingBox;

    return {
      leftTop: {
        x: boundingBox.x,
        y: boundingBox.y,
      },
      leftBot: {
        x: boundingBox.x,
        y: boundingBox.y + boundingBox.height,
      },
      rightTop: {
        x: boundingBox.x + boundingBox.width,
        y: boundingBox.y,
      },
      rightBot: {
        x: boundingBox.x + boundingBox.width,
        y: boundingBox.y + boundingBox.height,
      },
    };
  }
}

export const convertFigmaNodesToBricksNodes = (
  figmaNodes: readonly SceneNode[]
): Node[] => {
  if (isEmpty(figmaNodes)) {
    return [];
  }

  let result: Node[] = [];
  for (const figmaNode of figmaNodes) {
    if (figmaNode.visible) {
      const adaptedNode = new FigmaNodeAdapter(figmaNode);

      const newNode = new VisibleNode(adaptedNode);

      //@ts-ignore
      if (!isEmpty(figmaNode?.children)) {
        //@ts-ignore
        const childrenNode = convertFigmaNodesToBricksNodes(figmaNode.children);
        newNode.setChildren(childrenNode);
      }

      result.push(newNode);
    }
  }

  return result;
};
