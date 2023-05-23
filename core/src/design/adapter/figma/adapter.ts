import base64js from "base64-js";
import {
  GroupNode as BricksGroupNode,
  ImageNode,
  Node,
  TextNode as BricksTextNode,
  VectorNode as BricksVector,
  VisibleNode,
  computePositionalRelationship,
  VectorNode,
} from "../../../bricks/node";
import { isEmpty } from "../../../utils";
import { BoxCoordinates, Attributes, ExportFormat } from "../node";
import {
  colorToString,
  colorToStringWithOpacity,
  rgbaToString,
  isFrameNodeTransparent,
  doesNodeContainsAnImage,
  getMostCommonFieldInString,
  getRgbaFromPaints,
  figmaLineHeightToCssString,
  figmaLetterSpacingToCssString,
  figmaFontNameToCssString,
  hasShadow,
} from "./util";
import { PostionalRelationship } from "../../../bricks/node";
import { Direction } from "../../../bricks/direction";
import { StyledTextSegment } from "../node";
import { Line } from "../../../bricks/line";

enum NodeType {
  GROUP = "GROUP",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VECTOR = "VECTOR",
  ELLIPSE = "ELLIPSE",
  FRAME = "FRAME",
  RECTANGLE = "RECTANGLE",
  INSTANCE = "INSTANCE",
  STAR = "STAR",
  SLICE = "SLICE",
  COMPONENT = "COMPONENT",
  BOOLEAN_OPERATION = "BOOLEAN_OPERATION",
}

const safelySetWidthAndHeight = (
  nodeType: string,
  figmaNode: SceneNode,
  attributes: Attributes
) => {
  // @ts-ignore
  if (!isEmpty(figmaNode.rotation) && figmaNode.rotation !== 0) {
    // @ts-ignore
    attributes["width"] = `${figmaNode.width}px`;
    // @ts-ignore
    attributes["height"] = `${figmaNode.height}px`;
    return;
  }

  // @ts-ignore
  if (!isEmpty(figmaNode?.effects)) {
    // @ts-ignore
    const dropShadowStrings: string[] = figmaNode.effects
      .filter(
        (effect) =>
          effect.visible &&
          (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"));


    if (dropShadowStrings.length > 0) {
      if (!isEmpty(figmaNode.absoluteBoundingBox)) {
        attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;
        attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;
      }

      return;
    }
  }

  if (
    nodeType === NodeType.FRAME ||
    nodeType === NodeType.IMAGE ||
    nodeType === NodeType.GROUP ||
    nodeType === NodeType.INSTANCE
  ) {
    if (!isEmpty(figmaNode.absoluteBoundingBox)) {
      attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;
      attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;
      // @ts-ignore
    } else if (!isEmpty(figmaNode.absoluteRenderBounds)) {
      // @ts-ignore
      attributes["width"] = `${figmaNode.absoluteRenderBounds.width}px`;
      // @ts-ignore
      attributes["height"] = `${figmaNode.absoluteRenderBounds.height}px`;
    }

    // @ts-ignore
    if (!isEmpty(figmaNode.absoluteRenderBounds)) {
      const boundingWidth: number = figmaNode.absoluteBoundingBox.width;
      const boundingHeight: number = figmaNode.absoluteBoundingBox.height;

      // @ts-ignore
      const renderingWidth: number = figmaNode.absoluteRenderBounds.width;
      // @ts-ignore
      const renderingHeight: number = figmaNode.absoluteRenderBounds.height;

      if (renderingWidth * 0.5 > boundingWidth || renderingHeight * 0.5 > boundingHeight) {
        // @ts-ignore
        attributes["width"] = `${figmaNode.absoluteRenderBounds.width}px`;
        // @ts-ignore
        attributes["height"] = `${figmaNode.absoluteRenderBounds.height}px`;
      }
    }

    return;
  }

  // @ts-ignore
  if (!isEmpty(figmaNode.absoluteRenderBounds)) {
    // @ts-ignore
    attributes["width"] = `${figmaNode.absoluteRenderBounds.width}px`;
    // @ts-ignore
    attributes["height"] = `${figmaNode.absoluteRenderBounds.height}px`;
  } else if (!isEmpty(figmaNode.absoluteBoundingBox)) {
    attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;
    attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;
  }
};

const addDropShadowCssProperty = (
  figmaNode:
    | GroupNode
    | FrameNode
    | RectangleNode
    | InstanceNode
    | ComponentNode,
  attributes: Attributes
) => {
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
};

export const isAutoLayout = (node: SceneNode): boolean => {
  return !!(
    node.type === "FRAME" &&
    node.layoutMode &&
    node.layoutMode !== "NONE"
  );
};

const getPositionalCssAttributes = (figmaNode: SceneNode): Attributes => {
  const attributes: Attributes = {};

  if (figmaNode.type === NodeType.FRAME && isAutoLayout(figmaNode)) {
    attributes["display"] = "flex";

    if (figmaNode.layoutMode === "HORIZONTAL") {
      attributes["flex-direction"] = "row";

      if (figmaNode.primaryAxisSizingMode === "AUTO") {
        delete attributes["width"];
      }

      if (figmaNode.counterAxisSizingMode === "AUTO") {
        delete attributes["height"];
      }
    }

    if (figmaNode.layoutMode === "VERTICAL") {
      attributes["flex-direction"] = "column";

      if (figmaNode.primaryAxisSizingMode === "AUTO") {
        delete attributes["height"];
      }

      if (figmaNode.counterAxisSizingMode === "AUTO") {
        delete attributes["width"];
      }
    }

    switch (figmaNode.primaryAxisAlignItems) {
      case "MIN":
        attributes["justify-content"] = "flex-start";
        break;
      case "CENTER":
        attributes["justify-content"] = "center";
        break;
      case "SPACE_BETWEEN":
        attributes["justify-content"] = "space-between";
        break;
      case "MAX":
        attributes["justify-content"] = "flex-end";
        break;
    }

    switch (figmaNode.counterAxisAlignItems) {
      case "MIN":
        attributes["align-items"] = "flex-start";
        break;
      case "CENTER":
        attributes["align-items"] = "center";
        break;
      case "MAX":
        attributes["align-items"] = "flex-end";
        break;
    }

    if (figmaNode.itemSpacing) {
      attributes["gap"] = `${figmaNode.itemSpacing}px`;
    }

    if (figmaNode.paddingTop) {
      attributes["padding-top"] = `${figmaNode.paddingTop}px`;
    }

    if (figmaNode.paddingRight) {
      attributes["padding-right"] = `${figmaNode.paddingRight}px`;
    }

    if (figmaNode.paddingBottom) {
      attributes["padding-bottom"] = `${figmaNode.paddingBottom}px`;
    }

    if (figmaNode.paddingLeft) {
      attributes["padding-left"] = `${figmaNode.paddingLeft}px`;
    }
  }

  return attributes;
};

// getCssAttributes extracts styling information from figmaNode to css attributes
const getCssAttributes = (figmaNode: SceneNode): Attributes => {
  const attributes: Attributes = {};

  if (figmaNode.type === NodeType.GROUP) {
    safelySetWidthAndHeight(figmaNode.type, figmaNode, attributes);

    addDropShadowCssProperty(figmaNode, attributes);
  }

  // @ts-ignore
  if (!isEmpty(figmaNode.rotation) && figmaNode.rotation !== 0) {
    // @ts-ignore
    attributes["transform"] = `rotate(${figmaNode.rotation}deg)`;
  }

  if (
    figmaNode.type === NodeType.VECTOR ||
    figmaNode.type === NodeType.ELLIPSE
  ) {
    safelySetWidthAndHeight(figmaNode.type, figmaNode, attributes);

    const fills = figmaNode.fills;
    if (fills !== figma.mixed && fills.length > 0 && fills[0].visible) {
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

  if (
    figmaNode.type === NodeType.FRAME ||
    figmaNode.type === NodeType.RECTANGLE ||
    figmaNode.type === NodeType.INSTANCE ||
    figmaNode.type === NodeType.COMPONENT
  ) {
    // corner radius
    if (figmaNode.cornerRadius !== figma.mixed) {
      attributes["border-radius"] = `${figmaNode.cornerRadius}px`;
    }

    // border
    const borderColors = figmaNode.strokes;
    if (
      borderColors.length > 0 &&
      borderColors[0].visible &&
      borderColors[0].type === "SOLID"
    ) {
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

      if (strokeTopWeight > 0 && strokeBottomWeight > 0 && strokeLeftWeight > 0 && strokeRightWeight > 0) {
        attributes["border-style"] =
          figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
      } else {
        if (strokeTopWeight > 0) {
          attributes["border-top"] =
            figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
        }

        if (strokeBottomWeight > 0) {
          attributes["border-bottom"] =
            figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
        }

        if (strokeLeftWeight > 0) {
          attributes["border-left"] =
            figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
        }

        if (strokeRightWeight > 0) {
          attributes["border-right"] =
            figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
        }
      }
    }

    safelySetWidthAndHeight(figmaNode.type, figmaNode, attributes);

    // box shadow
    addDropShadowCssProperty(figmaNode, attributes);

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
    if (fills !== figma.mixed && fills.length > 0 && fills[0].visible) {
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
    // font family
    if (figmaNode.fontName !== figma.mixed) {
      attributes["font-family"] = figmaFontNameToCssString(figmaNode.fontName);
    } else {
      const mostCommonFontName = getMostCommonFieldInString(
        figmaNode,
        "fontName",
        {
          areVariationsEqual: (fontName1, fontName2) => {
            return (
              fontName1.family === fontName2.family &&
              fontName1.style === fontName2.style
            );
          },
        }
      );

      if (mostCommonFontName) {
        attributes["font-family"] =
          figmaFontNameToCssString(mostCommonFontName);
      }
    }

    // font size
    if (figmaNode.fontSize !== figma.mixed) {
      attributes["font-size"] = `${figmaNode.fontSize}px`;
    } else {
      const fontSizeWithLongestLength = getMostCommonFieldInString(
        figmaNode,
        "fontSize"
      );

      if (fontSizeWithLongestLength) {
        attributes["font-size"] = `${fontSizeWithLongestLength}px`;
      }
    }

    // width and height
    const { absoluteRenderBounds, absoluteBoundingBox } = figmaNode;

    let width: number = absoluteRenderBounds
      ? absoluteRenderBounds.width + 2
      : absoluteBoundingBox.width;

    let moreThanOneRow: boolean = false;
    let fontSize: number = 0;

    if (!isEmpty(absoluteRenderBounds)) {
      const renderBoundsHeight = absoluteRenderBounds.height;

      if (figmaNode.fontSize !== figma.mixed) {
        fontSize = figmaNode.fontSize;
      } else {
        for (const segment of figmaNode.getStyledTextSegments(["fontSize"])) {
          if (segment.fontSize > fontSize) {
            fontSize = segment.fontSize;
          }
        }
      }


      moreThanOneRow = renderBoundsHeight > fontSize * 1.5;
    }

    if (!isEmpty(absoluteBoundingBox) && !isEmpty(absoluteRenderBounds)) {
      const renderBoundsWidth = absoluteRenderBounds.width;
      const boundingBoxWidth = absoluteBoundingBox.width;

      // If bounding box and rendering box are similar in size, horizontal text alignment doesn't have any
      // actual effects therefore should be always considered as "text-align": "left" when there is only one row
      if (
        Math.abs(boundingBoxWidth - renderBoundsWidth) / boundingBoxWidth >
        0.1 ||
        moreThanOneRow
      ) {
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
      }

      if (
        Math.abs(absoluteBoundingBox.width - absoluteRenderBounds.width) /
        absoluteBoundingBox.width >
        0.2
      ) {
        width = absoluteRenderBounds.width + 6;
      }
    }


    if (!moreThanOneRow) {
      attributes["min-width"] = `${absoluteBoundingBox.width}px`;
      attributes["white-space"] = "nowrap";
    } else {
      attributes["width"] = `${absoluteBoundingBox.width}px`;
    }

    // switch (figmaNode.textAutoResize) {
    //   case "NONE": {
    //     attributes["width"] = `${width}px`;
    //     attributes["height"] = `${absoluteRenderBounds.height}px`;
    //     break;
    //   }
    //   case "HEIGHT": {
    //     attributes["width"] = `${width}px`;
    //     break;
    //   }
    //   case "WIDTH_AND_HEIGHT": {
    //     attributes["width"] = `${width}px`;
    //     break;
    //   }
    //   case "TRUNCATE": {
    //     attributes["width"] = `${width}px`;
    //     attributes["height"] = `${absoluteRenderBounds.height}px`;
    //     attributes["text-overflow"] = "ellipsis";
    //     break;
    //   }
    // }

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
    const paints = figmaNode.fills;
    if (paints !== figma.mixed && paints.length > 0) {
      const finalColor = getRgbaFromPaints(paints);
      if (finalColor) {
        attributes["color"] = rgbaToString(finalColor);
      }
    } else if (paints === figma.mixed) {
      const mostCommonPaints = getMostCommonFieldInString(figmaNode, "fills", {
        areVariationsEqual: (paint1, paint2) =>
          JSON.stringify(paint1) === JSON.stringify(paint2),
        variationModifier: (paint) => {
          // don't consider non-solid paints for now
          const solidPaints = paint.filter((p) => p.type === "SOLID");
          return solidPaints.length > 0 ? solidPaints : null;
        },
      }) as SolidPaint[];

      const finalColor = getRgbaFromPaints(mostCommonPaints);
      if (finalColor) {
        attributes["color"] = rgbaToString(finalColor);
      }
    }

    const textContainingOnlyOneWord =
      figmaNode.characters.trim().split(" ").length === 1;

    if (moreThanOneRow && textContainingOnlyOneWord) {
      attributes["overflow-wrap"] = "break-word";
    }

    if (textContainingOnlyOneWord) {
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
    }

    /* 
    TODO: 
    This field is causing styling differences between Figma design and rendered Bricks components.
    Need a more comprehensive solution other than direct translation.
    */
    // switch (figmaNode.textAlignVertical) {
    //   case "CENTER":
    //     attributes["vertical-align"] = "middle";
    //     break;
    //   case "TOP":
    //     attributes["vertical-align"] = "top";
    //     break;
    //   case "BOTTOM":
    //     attributes["vertical-align"] = "bottom";
    //     break;
    // }

    // line height
    const lineHeight = figmaNode.lineHeight;
    if (lineHeight !== figma.mixed) {
      attributes["line-height"] = figmaLineHeightToCssString(lineHeight);
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
      attributes["letter-spacing"] =
        figmaLetterSpacingToCssString(letterSpacing);
    } else if (letterSpacing === figma.mixed) {
      const mostCommonLetterSpacing = getMostCommonFieldInString(
        figmaNode,
        "letterSpacing",
        {
          areVariationsEqual: (letterSpacing1, letterSpacing2) =>
            JSON.stringify(letterSpacing1.value) ===
            JSON.stringify(letterSpacing2.value),
        }
      );

      if (mostCommonLetterSpacing) {
        attributes["letter-spacing"] = figmaLetterSpacingToCssString(
          mostCommonLetterSpacing
        );
      }
    }

    // font weight
    if (figmaNode.fontWeight !== figma.mixed) {
      attributes["font-weight"] = figmaNode.fontWeight.toString();
    } else {
      const mostCommonFontWeight = getMostCommonFieldInString(
        figmaNode,
        "fontWeight"
      );

      if (mostCommonFontWeight) {
        attributes["font-weight"] = mostCommonFontWeight.toString();
      }
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
};

const getBoxCoordinatesFromFigmaNode = (figmaNode: SceneNode): BoxCoordinates => {
  let boundingBox = figmaNode.absoluteBoundingBox;
  // // @ts-ignore

  // if (figmaNode.absoluteRenderBounds) {
  //   // @ts-ignore
  //   boundingBox = figmaNode.absoluteRenderBounds;
  // }

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
};

export class FigmaNodeAdapter {
  node: SceneNode;
  private cssAttributes: Attributes;
  private positionalCssAttribtues: Attributes;

  constructor(node: SceneNode) {
    this.node = node;
    this.cssAttributes = getCssAttributes(node);

    this.positionalCssAttribtues = getPositionalCssAttributes(node);
  }

  getCssAttributes(): Attributes {
    return this.cssAttributes;
  }

  getPositionalCssAttributes(): Attributes {
    return this.positionalCssAttribtues;
  }

  getType() {
    return this.node.type;
  }

  getOriginalId() {
    return this.node.id;
  }

  getAbsoluteBoundingBoxCoordinates(): BoxCoordinates {
    let boundingBox = this.node.absoluteBoundingBox;

    // // @ts-ignore
    // if (!isEmpty(this.node.rotation)) {
    //   const leftTop: Coordinate = {
    //     x: this.node.absoluteTransform[0][2],
    //     y: this.node.absoluteTransform[1][2]
    //   };

    //   return {
    //     leftTop: {
    //       x: leftTop.x,
    //       y: leftTop.y,
    //     },
    //     leftBot: {
    //       x: leftTop.x,
    //       y: leftTop.y + this.node.height,
    //     },
    //     rightTop: {
    //       x: leftTop.x + this.node.width,
    //       y: leftTop.y,
    //     },
    //     rightBot: {
    //       x: leftTop.x + this.node.width,
    //       y: leftTop.y + this.node.height,
    //     },
    //   };
    // }

    // @ts-ignore
    if (!isEmpty(this.node.absoluteRenderBounds)) {
      const boundingWidth: number = this.node.absoluteBoundingBox.width;
      const boundingHeight: number = this.node.absoluteBoundingBox.height;

      // @ts-ignore
      const renderingWidth: number = this.node.absoluteRenderBounds.width;
      // @ts-ignore
      const renderingHeight: number = this.node.absoluteRenderBounds.height;

      if (renderingWidth * 0.5 > boundingWidth || renderingHeight * 0.5 > boundingHeight) {
        return this.getRenderingBoundsCoordinates();
      }
    }

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

  getRenderingBoundsCoordinates(): BoxCoordinates {
    let boundingBox = this.node.absoluteBoundingBox;

    // // @ts-ignore 
    // if (!isEmpty(this.node.rotation)) {
    //   return this.getAbsoluteBoundingBoxCoordinates();
    // }


    // @ts-ignore
    if (!isEmpty(this.node.absoluteRenderBounds)) {
      // @ts-ignore
      boundingBox = this.node.absoluteRenderBounds;
    }

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

  async export(exportFormat: ExportFormat): Promise<string> {
    try {
      switch (exportFormat) {
        case ExportFormat.JPG: {
          const buf = await this.node.exportAsync({ format: ExportFormat.JPG });
          return base64js.fromByteArray(buf);
        }
        case ExportFormat.SVG: {
          const buf = await this.node.exportAsync({ format: ExportFormat.SVG });
          return String.fromCharCode.apply(null, new Uint16Array(buf));
        }
        case ExportFormat.PNG:
        default: {
          const buf = await this.node.exportAsync({ format: ExportFormat.PNG });
          return base64js.fromByteArray(buf);
        }
      }
    } catch (e) {
      console.error("Error exporting node:", this.getOriginalId(), e);
      return "";
    }
  }
}

export class FigmaVectorNodeAdapter extends FigmaNodeAdapter {
  node: SceneNode;
  constructor(node: SceneNode) {
    super(node);
    this.node = node;
  }
}

export class FigmaVectorGroupNodeAdapter extends FigmaNodeAdapter {
  constructor(node: SceneNode) {
    super(node);
  }
}

export class FigmaImageNodeAdapter extends FigmaNodeAdapter {
  constructor(node: SceneNode) {
    super(node);
  }
}

export class FigmaTextNodeAdapter extends FigmaNodeAdapter {
  node: TextNode;
  constructor(node: TextNode) {
    super(node);
    this.node = node;
  }

  getFamilyName(): string {
    // @ts-ignore
    if (this.node.fontName.family) {
      // @ts-ignore
      return this.node.fontName.family;
    }

    return "";
  }

  isItalic(): boolean {
    // @ts-ignore
    return !!this.node.fontName?.style.toLowerCase().includes("italic");
  }

  getText(): string {
    // @ts-ignore
    if (isEmpty(this.node.characters)) {
      return "";
    }

    // @ts-ignore
    return this.node.characters;
  }

  getStyledTextSegments(): StyledTextSegment[] {
    const styledTextSegments = this.node.getStyledTextSegments([
      "fontSize",
      "fontName",
      "fontWeight",
      "textDecoration",
      "textCase",
      "fills",
      "letterSpacing",
      "listOptions",
      "indentation",
      "hyperlink",
    ]);

    // for converting figma textDecoration to css textDecoration
    const figmaTextDecorationToCssMap = {
      STRIKETHROUGH: "line-through",
      UNDERLINE: "underline",
      NONE: "normal",
    } as const;

    const figmaTextCaseToCssTextTransformMap = {
      ORIGINAL: "none",
      SMALL_CAPS: "none", // TODO: support CSS font-variant-caps property
      SMALL_CAPS_FORCED: "none", // TODO: support CSS font-variant-caps property
      UPPER: "uppercase",
      LOWER: "lowercase",
      TITLE: "capitalize",
    } as const;

    const figmaListOptionsToHtmlTagMap = {
      NONE: "none",
      UNORDERED: "ul",
      ORDERED: "ol",
    } as const;

    return styledTextSegments.map((segment) => {
      const rgba = getRgbaFromPaints(segment.fills);
      return {
        ...segment,
        fontFamily: figmaFontNameToCssString(segment.fontName),
        textDecoration: figmaTextDecorationToCssMap[segment.textDecoration],
        textTransform: figmaTextCaseToCssTextTransformMap[segment.textCase],
        color: rgba ? rgbaToString(rgba) : "",
        letterSpacing: figmaLetterSpacingToCssString(segment.letterSpacing),
        listType: figmaListOptionsToHtmlTagMap[segment.listOptions.type],
        href: segment?.hyperlink?.type === "URL" ? segment.hyperlink.value : "",
      };
    });
  }
}

const EXPORTABLE_NODE_TYPES: string[] = [
  NodeType.ELLIPSE,
  NodeType.VECTOR,
  NodeType.IMAGE,
  NodeType.INSTANCE,
  NodeType.GROUP,
  NodeType.STAR,
  NodeType.FRAME,
  NodeType.RECTANGLE,
  NodeType.BOOLEAN_OPERATION,
];

const VECTOR_NODE_TYPES: string[] = [
  NodeType.ELLIPSE,
  NodeType.VECTOR,
  NodeType.STAR,
  NodeType.BOOLEAN_OPERATION,
  NodeType.RECTANGLE,
];

type Feedback = {
  nodes: Node[];
  areAllNodesExportable: boolean;
  doNodesContainImage: boolean;
  doNodesHaveNonOverlappingChildren: boolean;
  isSingleRectangle: boolean;
};

// convertFigmaNodesToBricksNodes converts Figma nodes to Bricks
export const convertFigmaNodesToBricksNodes = (
  figmaNodes: readonly SceneNode[]
): Feedback => {
  let reordered = [];

  for (let i = 0; i < figmaNodes.length; i++) {
    const figmaNode: SceneNode = figmaNodes[i];
    if (figmaNode.visible) {
      reordered.push(figmaNode);
    }
  }

  if (reordered.length > 1) {
    reordered.sort((a, b) => {
      let wrappedNodeA: Node = new VisibleNode(new FigmaNodeAdapter(a));
      let wrappedNodeB: Node = new VisibleNode(new FigmaNodeAdapter(b));

      if (
        computePositionalRelationship(
          wrappedNodeA.getAbsRenderingBox(),
          wrappedNodeB.getAbsRenderingBox()
        ) === PostionalRelationship.INCLUDE
      ) {
        return 1;
      }

      if (
        computePositionalRelationship(
          wrappedNodeB.getAbsRenderingBox(),
          wrappedNodeA.getAbsRenderingBox()
        ) === PostionalRelationship.INCLUDE
      ) {
        return -1;
      }

      if (a.parent.children.indexOf(a) < b.parent.children.indexOf(b)) {
        return -1;
      }

      return 1;
    });
  }

  let result: Feedback = {
    nodes: [],
    areAllNodesExportable: true,
    doNodesContainImage: false,
    doNodesHaveNonOverlappingChildren: false,
    isSingleRectangle: false,
  };

  let sliceNode: SceneNode = null;
  let allNodesAreOfVectorNodeTypes: boolean = true;

  if (reordered.length === 1) {
    const figmaNode = reordered[0];
    if ((figmaNode.type === NodeType.RECTANGLE) && !doesNodeContainsAnImage(figmaNode)) {
      result.isSingleRectangle = true;
    }
  }

  const newNodes: Node[] = [];

  for (let i = 0; i < reordered.length; i++) {
    const figmaNode = reordered[i];

    if (figmaNode.visible) {
      if (!EXPORTABLE_NODE_TYPES.includes(figmaNode.type)) {
        result.areAllNodesExportable = false;
      }

      if (hasShadow(figmaNode)) {
        result.areAllNodesExportable = false;
      }

      if (!VECTOR_NODE_TYPES.includes(figmaNode.type)) {
        allNodesAreOfVectorNodeTypes = false;
      }

      if (figmaNode.type === NodeType.SLICE) {
        sliceNode = figmaNode;
      }

      let newNode: Node = new VisibleNode(new FigmaNodeAdapter(figmaNode));
      switch (figmaNode.type) {
        case NodeType.RECTANGLE:
          if (doesNodeContainsAnImage(figmaNode)) {
            newNode = new ImageNode(new FigmaImageNodeAdapter(figmaNode));
            result.doNodesContainImage = true;
          }
          break;
        case NodeType.GROUP:
          newNode = new BricksGroupNode([], new FigmaNodeAdapter(figmaNode));
          break;
        case NodeType.FRAME:
          if (doesNodeContainsAnImage(figmaNode)) {
            newNode = new ImageNode(new FigmaImageNodeAdapter(figmaNode));
            result.doNodesContainImage = true;
            break;
          }

          if (isFrameNodeTransparent(figmaNode)) {
            newNode = new BricksGroupNode([], new FigmaNodeAdapter(figmaNode));
          }

          break;
        case NodeType.INSTANCE:
        case NodeType.COMPONENT:
          if (isFrameNodeTransparent(figmaNode)) {
            newNode = new BricksGroupNode([], new FigmaNodeAdapter(figmaNode));
            break;
          }
          break;
        case NodeType.TEXT:
          newNode = new BricksTextNode(new FigmaTextNodeAdapter(figmaNode));
          break;
        case NodeType.VECTOR:
        case NodeType.STAR:
          newNode = new BricksVector(new FigmaVectorNodeAdapter(figmaNode));
          break;
        case NodeType.ELLIPSE:
          if (doesNodeContainsAnImage(figmaNode)) {
            newNode = new ImageNode(new FigmaImageNodeAdapter(figmaNode));
            result.doNodesContainImage = true;
            break;
          }

          if (!isEmpty(figmaNode.rotation)) {
            newNode = new VectorNode(new FigmaImageNodeAdapter(figmaNode));
            break;
          }
      }


      newNodes.push(newNode);
    }
  }

  for (let i = 0; i < reordered.length; i++) {
    const figmaNode = reordered[i];

    let newNode: Node = newNodes[i];

    //@ts-ignore
    if (!isEmpty(figmaNode?.children)) {
      let isExportableNode: boolean = false;
      //@ts-ignore
      const feedback: Feedback = convertFigmaNodesToBricksNodes(figmaNode.children);

      let doNodesHaveNonOverlappingChildren: boolean = true;
      let horizontalOverlap: boolean = areThereOverlappingByDirection(
        //@ts-ignore
        figmaNode?.children,
        Direction.HORIZONTAL
      );

      //@ts-ignore
      let verticalOverlap: boolean = areThereOverlappingByDirection(
        //@ts-ignore
        figmaNode?.children,
        Direction.VERTICAL
      );

      doNodesHaveNonOverlappingChildren =
        !horizontalOverlap || !verticalOverlap || feedback.doNodesHaveNonOverlappingChildren;

      if (allNodesAreOfVectorNodeTypes) {
        doNodesHaveNonOverlappingChildren = false;
      }

      if (feedback.areAllNodesExportable && !feedback.isSingleRectangle) {
        if (!doNodesHaveNonOverlappingChildren) {
          isExportableNode = true;
          if (feedback.doNodesContainImage) {
            newNode = new ImageNode(
              new FigmaVectorGroupNodeAdapter(figmaNode)
            );
          } else {
            newNode = new BricksVector(
              new FigmaVectorGroupNodeAdapter(figmaNode)
            );
          }
        }
      }

      result.areAllNodesExportable =
        feedback.areAllNodesExportable && result.areAllNodesExportable;

      result.doNodesContainImage =
        feedback.doNodesContainImage || result.doNodesContainImage;

      result.doNodesHaveNonOverlappingChildren = doNodesHaveNonOverlappingChildren;

      if (!isExportableNode) {
        newNode.setChildren(feedback.nodes);
      }

      newNodes[i] = newNode;
    }
  }

  result.nodes = newNodes;

  if (!isEmpty(sliceNode)) {
    result.nodes = [new BricksVector(new FigmaVectorNodeAdapter(sliceNode))];
    result.doNodesHaveNonOverlappingChildren = false;
    result.areAllNodesExportable = false;
  }

  return result;
};

const areThereOverlappingByDirection = (
  nodes: readonly SceneNode[],
  direction: Direction
): boolean => {

  for (let i = 0; i < nodes.length; i++) {
    const currentNode: SceneNode = nodes[i];
    let currentLine = getFigmaLineBasedOnDirection(currentNode, direction);

    for (let j = 0; j < nodes.length; j++) {
      const targetNode: SceneNode = nodes[j];
      if (i === j) {
        continue;
      }

      const targetLine = getFigmaLineBasedOnDirection(targetNode, direction);

      if (currentLine.overlap(targetLine, -4)) {
        return true;
      }
    }
  }

  return false;
};


// getFigmaLineBasedOnDirection gets the boundary of a node depending on the input direction.
export const getFigmaLineBasedOnDirection = (figmaNode: SceneNode, direction: Direction) => {
  const coordinates = getBoxCoordinatesFromFigmaNode(figmaNode);

  if (direction === Direction.HORIZONTAL) {
    return new Line(coordinates.leftTop.y, coordinates.rightBot.y);
  }

  return new Line(coordinates.leftTop.x, coordinates.rightBot.x);
};
