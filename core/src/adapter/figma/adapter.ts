import { GroupNode, Node, TextNode, VectorNode, VisibleNode } from "../../bricks/node";
import { isEmpty } from "lodash";
import { BoundingBoxCoordinates } from "../node";

export class FigmaNodeAdapter {
  private node: SceneNode;
  constructor(node: SceneNode) {
    this.node = node;
  }

  getType() {
    return this.node.type;
  }

  getOriginalId() {
    return this.node.id;
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

enum NodeType {
  GROUP = "GROUP",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
  ELLIPSE = "ELLIPSE"
}

export const convertFigmaNodesToBricksNodes = (figmaNodes: readonly SceneNode[]): Node[] => {
  let reordered = [...figmaNodes];
  if (reordered.length > 1) {
    reordered.sort((a, b) => {
      if (a.parent.children.indexOf(a) < b.parent.children.indexOf(b)) {
        return -1;
      }

      return 1;
    });

  }

  let result: Node[] = [];
  for (let i = 0; i < reordered.length; i++) {
    const figmaNode = reordered[i];
    if (figmaNode.visible) {
      const adaptedNode = new FigmaNodeAdapter(figmaNode);

      let newNode: Node = new VisibleNode(adaptedNode);
      switch (figmaNode.type) {
        case NodeType.GROUP:
          newNode = new GroupNode([]);
          break;
        case NodeType.TEXT:
          newNode = new TextNode(adaptedNode)
          break;
        case NodeType.VECTOR:
        case NodeType.ELLIPSE:
          newNode = new VectorNode(adaptedNode);
      }

      //@ts-ignore
      if (!isEmpty(figmaNode?.children)) {

        //@ts-ignore
        const childrenNode = convertFigmaNodesToBricksNodes(figmaNode.children);

        if (childrenNode.length === 1 && figmaNode.type === NodeType.GROUP) {
          result = result.concat(childrenNode);
          continue;
        }

        newNode.setChildren(childrenNode);
      }

      result.push(newNode);
    }
  }

  return result;
}
