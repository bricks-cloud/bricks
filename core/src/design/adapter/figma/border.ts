import { Attributes } from "../node";
import { NodeType } from "./adapter";
import { colorToString } from "./util";

export const setBorderColor = (
    figmaNode:
        | FrameNode
        | RectangleNode
        | InstanceNode
        | ComponentNode
        | EllipseNode
        | VectorNode,
    attributes: Attributes
) => {
    const borderColors = figmaNode.strokes;
    // TODO: if multiple solid border colors exist with opacity<100%, add them together to get final border color
    if (
        borderColors.length > 0 &&
        borderColors[0].visible &&
        borderColors[0].type === "SOLID"
    ) {
        attributes["border-color"] = colorToString(borderColors[0].color);
    }
};

export const setBorderStyleAttributes = (figmaNode: | FrameNode
    | RectangleNode
    | InstanceNode
    | ComponentNode
    | EllipseNode
    | VectorNode
    , attributes) => {
    // border-color
    setBorderColor(figmaNode, attributes);

    // border
    const borderColors = figmaNode.strokes;
    if (
        borderColors.length > 0 &&
        borderColors[0].visible &&
        borderColors[0].type === "SOLID"
    ) {
        if (
            figmaNode.type === NodeType.FRAME ||
            figmaNode.type === NodeType.RECTANGLE ||
            figmaNode.type === NodeType.INSTANCE ||
            figmaNode.type === NodeType.COMPONENT
        ) {
            const {
                strokeTopWeight,
                strokeBottomWeight,
                strokeLeftWeight,
                strokeRightWeight,
            } = figmaNode;

            if (strokeTopWeight > 0) {
                attributes["border-top-width"] = `${strokeTopWeight}px`;
            }

            if (strokeBottomWeight > 0) {
                attributes["border-bottom-width"] = `${strokeBottomWeight}px`;
            }

            if (strokeLeftWeight > 0) {
                attributes["border-left-width"] = `${strokeLeftWeight}px`;
            }

            if (strokeRightWeight > 0) {
                attributes["border-right-width"] = `${strokeRightWeight}px`;
            }

            if (
                strokeTopWeight > 0 &&
                strokeBottomWeight > 0 &&
                strokeLeftWeight > 0 &&
                strokeRightWeight > 0
            ) {
                attributes["border-style"] =
                    figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
            } else {
                if (strokeTopWeight > 0) {
                    attributes["border-top-style"] =
                        figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
                }

                if (strokeBottomWeight > 0) {
                    attributes["border-bottom-style"] =
                        figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
                }

                if (strokeLeftWeight > 0) {
                    attributes["border-left-style"] =
                        figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
                }

                if (strokeRightWeight > 0) {
                    attributes["border-right-style"] =
                        figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
                }
            }
        }

        const {
            strokeWeight,
        } = figmaNode;

        if (strokeWeight !== figma.mixed) {
            attributes["border-width"] = `${strokeWeight}px`;
        }
    }
};