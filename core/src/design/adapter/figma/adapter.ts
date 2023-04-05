import {
  GroupNode,
  Node,
  TextNode as BricksTextNode,
  VectorGroupNode,
  VectorNode as BricksVector,
  VisibleNode,
} from "../../../bricks/node";
import { isEmpty } from "../../../utils";
import { BoxCoordinates, Attributes, ExportFormat } from "../node";
import {
  colorToString,
  colorToStringWithOpacity,
  rgbaToString,
  isFrameNodeTransparent,
  doesRectangleNodeContainsAnImage,
} from "./util";
import { GoogleFontsInstance } from "../../../google/google-fonts";

enum NodeType {
  GROUP = "GROUP",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
  ELLIPSE = "ELLIPSE",
  FRAME = "FRAME",
  RECTANGLE = "RECTANGLE",
  INSTANCE = "INSTANCE",
}

// getCssAttributes extracts styling information from figmaNode to css attributes
const getCssAttributes = (figmaNode: SceneNode): Attributes => {
  const attributes: Attributes = {};

  if (figmaNode.type === NodeType.GROUP) {
    // width
    attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;

    // height
    attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;
  }

  if (
    figmaNode.type === NodeType.FRAME ||
    figmaNode.type === NodeType.RECTANGLE
  ) {
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

        const dropShadowString = `${offset.x}px ${offset.y}px ${radius}px ${
          spread ?? 0
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
      ] = `'${fontFamily}', ${GoogleFontsInstance.getGenericFontFamily(
        fontFamily
      )}`;
    }

    // font size
    if (figmaNode.fontSize !== figma.mixed) {
      attributes["font-size"] = `${figmaNode.fontSize}px`;
    }

    // width and height
    const { absoluteRenderBounds } = figmaNode;

    const boundingBoxWidth = figmaNode.absoluteBoundingBox.width;
    const renderBoundsWidth = figmaNode.absoluteRenderBounds.width;
    const renderBoundsHeight = figmaNode.absoluteRenderBounds.height;

    let moreThanOneRow: boolean = false;
    if (figmaNode.fontSize !== figma.mixed) {
      moreThanOneRow = renderBoundsHeight > figmaNode.fontSize;
    }

    if (!moreThanOneRow) {
      attributes["white-space"] = "nowrap";
    }

    let width = absoluteRenderBounds.width + 2;
    if (
      Math.abs(
        figmaNode.absoluteBoundingBox.width - absoluteRenderBounds.width
      ) /
        figmaNode.absoluteBoundingBox.width >
      0.2
    ) {
      width = absoluteRenderBounds.width + 4;
    }

    if (moreThanOneRow) {
      switch (figmaNode.textAutoResize) {
        case "NONE": {
          attributes["width"] = `${width}px`;
          attributes["height"] = `${absoluteRenderBounds.height}px`;
          break;
        }
        case "HEIGHT": {
          attributes["width"] = `${width}px`;
          break;
        }
        case "WIDTH_AND_HEIGHT": {
          // do nothing
          break;
        }
        case "TRUNCATE": {
          attributes["width"] = `${width}px`;
          attributes["height"] = `${absoluteRenderBounds.height}px`;
          attributes["text-overflow"] = "ellipsis";
          break;
        }
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

    const textContainingOnlyOneWord =
      figmaNode.characters.split(" ").length === 1;

    if (moreThanOneRow && textContainingOnlyOneWord) {
      attributes["overflow-wrap"] = "break-word";
    }

    // If bounding box and rendering box are similar in size, horizontal text alignment doesn't have any
    // actual effects therefore should be always considered as "text-align": "left" when there is only one row
    if (
      Math.abs(boundingBoxWidth - renderBoundsWidth) / boundingBoxWidth > 0.1 ||
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
};

export class FigmaNodeAdapter {
  node: SceneNode;
  private cssAttributes: Attributes;
  constructor(node: SceneNode) {
    this.node = node;
    this.cssAttributes = getCssAttributes(node);
  }

  getCssAttributes(): Attributes {
    return this.cssAttributes;
  }

  getType() {
    return this.node.type;
  }

  getOriginalId() {
    return this.node.id;
  }

  getAbsoluteBoundingBoxCoordinates(): BoxCoordinates {
    let boundingBox = this.node.absoluteBoundingBox;

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
    // @ts-ignore

    if (this.node.absoluteRenderBounds) {
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
}

export class FigmaVectorNodeAdapter extends FigmaNodeAdapter {
  node: VectorNode | EllipseNode;
  constructor(node: VectorNode | EllipseNode) {
    super(node);
    this.node = node;
  }

  async exportAsSvg(exportFormat: ExportFormat): Promise<string> {
    let svg: string = "";
    if (exportFormat === ExportFormat.SVG) {
      try {
        const buf = await this.node.exportAsync({ format: ExportFormat.SVG });
        svg = String.fromCharCode.apply(null, new Uint16Array(buf));
      } catch (error) {
        console.log(error);
      }
    }

    return svg;
  }
}

export class FigmaVectorGroupNodeAdapter extends FigmaNodeAdapter {
  constructor(node: SceneNode) {
    super(node);
  }

  async exportAsSvg(exportFormat: ExportFormat): Promise<string> {
    let svg: string = "";
    if (exportFormat === ExportFormat.SVG) {
      try {
        const buf = await this.node.exportAsync({ format: ExportFormat.SVG });
        svg = String.fromCharCode.apply(null, new Uint16Array(buf));
      } catch (error) {
        console.log(error);
      }
    }

    return svg;
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
}

const EXPORTABLE_NODE_TYPES: string[] = [
  NodeType.ELLIPSE,
  NodeType.VECTOR,
  NodeType.FRAME,
  NodeType.RECTANGLE,
];
const GROUP_NODE_TYPES: string[] = [NodeType.GROUP, NodeType.INSTANCE];

type Feedbacks = {
  nodes: Node[];
  areAllNodesExportable: boolean;
};

// convertFigmaNodesToBricksNodes converts Figma nodes to Bricks
export const convertFigmaNodesToBricksNodes = (
  figmaNodes: readonly SceneNode[]
): Feedbacks => {
  let reordered = [...figmaNodes];
  if (reordered.length > 1) {
    reordered.sort((a, b) => {
      if (a.parent.children.indexOf(a) < b.parent.children.indexOf(b)) {
        return -1;
      }

      return 1;
    });
  }

  let result: Feedbacks = {
    nodes: [],
    areAllNodesExportable: true,
  };

  for (let i = 0; i < reordered.length; i++) {
    const figmaNode = reordered[i];
    if (
      !EXPORTABLE_NODE_TYPES.includes(figmaNode.type) &&
      !GROUP_NODE_TYPES.includes(figmaNode.type)
    ) {
      result.areAllNodesExportable = false;
    }

    if (
      figmaNode.type === NodeType.RECTANGLE &&
      doesRectangleNodeContainsAnImage(figmaNode)
    ) {
      result.areAllNodesExportable = false;
    }

    if (figmaNode.visible) {
      const adaptedNode = new FigmaNodeAdapter(figmaNode);
      let newNode: Node = new VisibleNode(adaptedNode);

      switch (figmaNode.type) {
        case NodeType.GROUP:
          newNode = new GroupNode([]);
          break;
        case NodeType.FRAME:
          if (isFrameNodeTransparent(figmaNode)) {
            newNode = new GroupNode([]);
          }
          break;
        case NodeType.TEXT:
          newNode = new BricksTextNode(new FigmaTextNodeAdapter(figmaNode));
          break;
        case NodeType.VECTOR:
        case NodeType.ELLIPSE:
          newNode = new BricksVector(new FigmaVectorNodeAdapter(figmaNode));
      }

      //@ts-ignore
      if (!isEmpty(figmaNode?.children)) {
        //@ts-ignore
        const feedbacks = convertFigmaNodesToBricksNodes(figmaNode.children);
        if (feedbacks.nodes.length === 1 && figmaNode.type === NodeType.GROUP) {
          result.nodes = result.nodes.concat(feedbacks.nodes);
          continue;
        }

        if (feedbacks.areAllNodesExportable) {
          newNode = new VectorGroupNode(
            new FigmaVectorGroupNodeAdapter(figmaNode),
            feedbacks.nodes
          );
        }

        newNode.setChildren(feedbacks.nodes);

        result.areAllNodesExportable =
          feedbacks.areAllNodesExportable && result.areAllNodesExportable;
      }

      result.nodes.push(newNode);
    }
  }

  return result;
};
