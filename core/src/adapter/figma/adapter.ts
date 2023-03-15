
import { Node, VisibleNode } from "../../bricks/node";
import { isEmpty } from "lodash";
import { BoundingBoxCoordinates } from "../node";

export class FigmaNodeAdapter {
    private node: SceneNode;
    constructor(node: SceneNode) {
        this.node = node;
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
        }
    }
}

enum NodeType {
    GROUP = "GROUP",
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
    for (const figmaNode of reordered) {
        if (figmaNode.visible) {
            const adaptedNode = new FigmaNodeAdapter(figmaNode);

            let newNode = new VisibleNode(adaptedNode);

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