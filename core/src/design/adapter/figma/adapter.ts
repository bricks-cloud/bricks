import { GroupNode, Node, TextNode, VectorNode, VisibleNode } from "../../../bricks/node";
import { isEmpty } from "lodash";
import { BoundingBoxCoordinates, Attributes } from "../node";
import {
  colorToString,
  colorToStringWithOpacity,
  rgbaToString,
} from "./util";
import { GoogleFonts } from "../../../google/google-fonts";

const googleFontsMetadata = new GoogleFonts();

enum NodeType {
  GROUP = "GROUP",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
  ELLIPSE = "ELLIPSE",
  FRAME = "FRAME",
  RECTANGLE = "RECTANGLE"
}

const getCSSAttributes = (figmaNode: SceneNode): Attributes => {
  const attributes: Attributes = {};

  if (figmaNode.type === NodeType.FRAME || figmaNode.type === NodeType.RECTANGLE) {
    // corner radius
    if (figmaNode.cornerRadius !== figma.mixed) {
      attributes["border-radius"] = `${figmaNode.cornerRadius}px`;
    }

    // border
    const borderColors = figmaNode.strokes;
    if (borderColors.length > 0 && borderColors[0].type === "SOLID") {
      attributes["border-color"] = colorToString(borderColors[0].color);

      const {
        strokeWeight,
        strokeTopWeight,
        strokeBottomWeight,
        strokeLeftWeight,
        strokeRightWeight,
      } = figmaNode;

      if (strokeWeight !== figma.mixed) {
        attributes["border-width"] = `${strokeWeight}px`;
      } else {
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
      }

      attributes["border-style"] =
        figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
    }

    // width
    attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;

    // height
    attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;

    // box shadow
    const dropShadowStrings: string[] = figmaNode.effects
      .filter(
        (effect) =>
          effect.visible &&
          (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW")
      )
      .map((effect: DropShadowEffect | InnerShadowEffect) => {
        const { offset, radius, spread, color } = effect;

        const dropShadowString = `${offset.x}px ${offset.y}px ${radius}px ${spread ?? 0
          }px ${rgbaToString(color)}`;

        if (effect.type === "INNER_SHADOW") {
          return "inset " + dropShadowString;
        } else {
          return dropShadowString;
        }
      });

    if (dropShadowStrings.length > 0) {
      attributes["box-shadow"] = dropShadowStrings.join(",");
    }

    // filter: blur
    const layerBlur = figmaNode.effects.find(
      (effect) => effect.type === "LAYER_BLUR" && effect.visible
    );

    if (layerBlur) {
      attributes["filter"] = `blur(${layerBlur.radius}px)`;
    }

    // backdrop-filter: blur
    const backgroundBlur = figmaNode.effects.find(
      (effect) => effect.type === "BACKGROUND_BLUR" && effect.visible
    );

    if (backgroundBlur) {
      attributes["backdrop-filter"] = `blur(${backgroundBlur.radius}px)`;
    }

    const fills = figmaNode.fills;
    if (fills !== figma.mixed && fills.length > 0) {
      // background color
      const solidPaint = fills.find(
        (fill) => fill.type === "SOLID"
      ) as SolidPaint;
      if (solidPaint) {
        attributes["background-color"] = colorToStringWithOpacity(
          solidPaint.color,
          solidPaint.opacity
        );
      }
    }
  }

  if (figmaNode.type === NodeType.TEXT) {
    const fontFamily = (figmaNode.fontName as FontName).family;

    // source = computeURL([figmaNode]);

    // font family
    if (figmaNode.fontName !== figma.mixed) {
      attributes[
        "font-family"
      ] = `'${fontFamily}', ${googleFontsMetadata.getGenericFontFamily(
        fontFamily
      )}`;
    }

    // font size
    if (figmaNode.fontSize !== figma.mixed) {
      attributes["font-size"] = `${figmaNode.fontSize}px`;
    }

    // width and height
    const { absoluteRenderBounds } = figmaNode;

    switch (figmaNode.textAutoResize) {
      case "NONE": {
        attributes["width"] = `${absoluteRenderBounds.width}px`;
        attributes["height"] = `${absoluteRenderBounds.height}px`;
        break;
      }
      case "HEIGHT": {
        attributes["width"] = `${absoluteRenderBounds.width}px`;
        break;
      }
      case "WIDTH_AND_HEIGHT": {
        // do nothing
        break;
      }
      case "TRUNCATE": {
        attributes["width"] = `${absoluteRenderBounds.width}px`;
        attributes["height"] = `${absoluteRenderBounds.height}px`;
        attributes["text-overflow"] = "ellipsis";
        break;
      }
    }

    // text decoration
    switch (figmaNode.textDecoration) {
      case "STRIKETHROUGH":
        attributes["text-decoration"] = "line-through";
        break;
      case "UNDERLINE":
        attributes["text-decoration"] = "underline";
        break;
    }

    // font color
    const colors = figmaNode.fills;
    if (
      colors !== figma.mixed &&
      colors.length > 0 &&
      colors[0].type === "SOLID"
    ) {
      attributes["color"] = colorToStringWithOpacity(
        colors[0].color,
        colors[0].opacity
      );
    }

    // text alignment
    switch (figmaNode.textAlignHorizontal) {
      case "CENTER":
        attributes["text-align"] = "center";
        break;
      case "RIGHT":
        attributes["text-align"] = "right";
        break;
      case "JUSTIFIED":
        attributes["text-align"] = "justify";
        break;
    }

    // line height
    const lineHeight = figmaNode.lineHeight;
    if (lineHeight !== figma.mixed && lineHeight.unit !== "AUTO") {
      const unit = lineHeight.unit === "PIXELS" ? "px" : "%";
      attributes["line-height"] = `${lineHeight.value}${unit}`;
    }

    // text transform
    const textCase = figmaNode.textCase;
    if (textCase !== figma.mixed) {
      switch (textCase) {
        case "ORIGINAL":
          // do nothing
          break;
        case "UPPER":
          attributes["text-transform"] = "uppercase";
          break;
        case "LOWER":
          attributes["text-transform"] = "lowercase";
          break;
        case "TITLE":
          attributes["text-transform"] = "capitalize";
          break;
      }
    }

    // letter spacing
    const letterSpacing = figmaNode.letterSpacing;
    if (letterSpacing !== figma.mixed && letterSpacing.value !== 0) {
      const unit = letterSpacing.unit === "PIXELS" ? "px" : "em";
      const value =
        letterSpacing.unit === "PIXELS"
          ? letterSpacing.value
          : letterSpacing.value / 100;

      attributes["letter-spacing"] = `${value}${unit}`;
    }

    // font weight
    if (figmaNode.fontWeight !== figma.mixed) {
      attributes["font-weight"] = figmaNode.fontWeight.toString();
    }

    // font style
    if (
      figmaNode.fontName !== figma.mixed &&
      figmaNode.fontName.style.toLowerCase().includes("italic")
    ) {
      attributes["font-style"] = "italic";
    }
  }

  return attributes;
}

export class FigmaNodeAdapter {
  private node: SceneNode;
  private cssAttributes: Attributes;
  constructor(node: SceneNode) {
    this.node = node;
    this.cssAttributes = getCSSAttributes(node);
  }

  getCSSAttributes(): Attributes {
    return this.cssAttributes;
  }

  getType() {
    return this.node.type;
  }

  getText(): string {
    // @ts-ignore
    if (isEmpty(this.node.characters)) {
      return "";
    }

    // @ts-ignore
    return this.node.characters;
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
    console.log("figmaNode.type: ", figmaNode.type);
    console.log("figmaNode.visible: ", figmaNode.visible);
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
