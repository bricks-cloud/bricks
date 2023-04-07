import base64js from "base64-js";
import {
  GroupNode as BricksGroupNode,
  ImageNode,
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
  doesNodeContainsAnImage,
} from "./util";
import { GoogleFontsInstance } from "../../../google/google-fonts";

const doTwoNodesHaveTheSameBoundingBox = (nodeA: Node, nodeB: Node) => {
  let boxA: BoxCoordinates = nodeA.getAbsBoundingBox();
  let boxB: BoxCoordinates = nodeB.getAbsBoundingBox();


  if (boxA.leftBot.x !== boxB.leftBot.x || boxA.leftBot.y !== boxB.leftBot.y) {
    return false;
  }

  if (boxA.rightBot.x !== boxB.rightBot.x || boxA.rightBot.y !== boxB.rightBot.y) {
    return false;
  }

  if (boxA.leftTop.x !== boxB.leftTop.x || boxA.leftTop.y !== boxB.leftTop.y) {
    return false;
  }

  if (boxA.rightTop.x !== boxB.rightTop.x || boxA.rightTop.y !== boxB.rightTop.y) {
    return false;
  }

  return true;
};

enum NodeType {
  GROUP = "GROUP",
  TEXT = "TEXT",
  VECTOR = "VECTOR",
  ELLIPSE = "ELLIPSE",
  FRAME = "FRAME",
  RECTANGLE = "RECTANGLE",
  INSTANCE = "INSTANCE",
  COMPONENT = "COMPONENT",
}

const addDropShadowCssProperty = (figmaNode: GroupNode | FrameNode | RectangleNode | InstanceNode | ComponentNode, attributes: Attributes) => {
  const dropShadowStrings: string[] = figmaNode.effects
    .filter(
      (effect) =>
        effect.visible &&
        (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"),
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
        attributes["justify-content"] = "start";
        break;
      case "CENTER":
        attributes["justify-content"] = "center";
        break;
      case "SPACE_BETWEEN":
        attributes["justify-content"] = "space-between";
        break;
      case "MAX":
        attributes["justify-content"] = "end";
        break;
    }

    switch (figmaNode.counterAxisAlignItems) {
      case "MIN":
        attributes["align-items"] = "start";
        break;
      case "CENTER":
        attributes["align-items"] = "center";
        break;
      case "MAX":
        attributes["align-items"] = "end";
        break;
    }

    if (figmaNode.children.length > 1) {
      // gap has no effects when only there is only one child
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
    // width
    attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;

    // height
    attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;
    addDropShadowCssProperty(figmaNode, attributes);
  }

  if (figmaNode.type === NodeType.VECTOR || figmaNode.type === NodeType.ELLIPSE) {
    if (!isEmpty(figmaNode.absoluteRenderBounds)) {
      // width
      attributes["width"] = `${figmaNode.absoluteRenderBounds.width}px`;

      // height
      attributes["height"] = `${figmaNode.absoluteRenderBounds.height}px`;
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
    if (borderColors.length > 0 && borderColors[0].visible && borderColors[0].type === "SOLID") {
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
    const { absoluteRenderBounds, absoluteBoundingBox } = figmaNode;

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

    // @ts-ignore
    if (isAutoLayout(figmaNode.parent)) {
      attributes["width"] = `${absoluteBoundingBox.width}px`;
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

  async export(exportFormat: ExportFormat): Promise<string> {
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

  async export(exportFormat: ExportFormat): Promise<string> {
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


export class FigmaImageNodeAdapter extends FigmaNodeAdapter {
  constructor(node: SceneNode) {
    super(node);
  }

  async export(exportFormat: ExportFormat): Promise<string> {
    let img: string = "";
    if (exportFormat === ExportFormat.PNG) {
      try {
        const buf = await this.node.exportAsync({ format: ExportFormat.PNG });
        img = base64js.fromByteArray(buf);
      } catch (error) {
        console.log(error);
      }
    }

    return img;
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

    if (figmaNode.visible) {
      if (
        !EXPORTABLE_NODE_TYPES.includes(figmaNode.type) &&
        !GROUP_NODE_TYPES.includes(figmaNode.type)
      ) {
        result.areAllNodesExportable = false;
      }

      let newNode: Node = new VisibleNode(new FigmaNodeAdapter(figmaNode));

      switch (figmaNode.type) {
        case NodeType.RECTANGLE:
          if (doesNodeContainsAnImage(figmaNode)) {
            newNode = new ImageNode(new FigmaImageNodeAdapter(figmaNode));
            result.areAllNodesExportable = false;
          }
          break;
        case NodeType.GROUP:
          newNode = new BricksGroupNode([], new FigmaNodeAdapter(figmaNode));
          break;
        case NodeType.INSTANCE:
        case NodeType.FRAME:
        case NodeType.COMPONENT:
          if (isFrameNodeTransparent(figmaNode)) {
            newNode = new BricksGroupNode([], new FigmaNodeAdapter(figmaNode));
          }
          break;
        case NodeType.TEXT:
          newNode = new BricksTextNode(new FigmaTextNodeAdapter(figmaNode));
          break;
        case NodeType.VECTOR:
          newNode = new BricksVector(new FigmaVectorNodeAdapter(figmaNode));
          break;
        case NodeType.ELLIPSE:
          if (doesNodeContainsAnImage(figmaNode)) {
            newNode = new ImageNode(new FigmaImageNodeAdapter(figmaNode));
            result.areAllNodesExportable = false;
            break;
          }

          newNode = new BricksVector(new FigmaVectorNodeAdapter(figmaNode));
      }

      //@ts-ignore
      if (!isEmpty(figmaNode?.children)) {
        //@ts-ignore
        const feedbacks = convertFigmaNodesToBricksNodes(figmaNode.children);

        if (feedbacks.areAllNodesExportable) {
          newNode = new VectorGroupNode(
            new FigmaVectorGroupNodeAdapter(figmaNode),
            feedbacks.nodes
          );
        }

        result.areAllNodesExportable =
          feedbacks.areAllNodesExportable && result.areAllNodesExportable;

        // merge parent and child if they have the same boundingbox
        if (feedbacks.nodes.length === 1 && doTwoNodesHaveTheSameBoundingBox(feedbacks.nodes[0], newNode)) {
          feedbacks.nodes[0].addCssAttributes(newNode.getCssAttributes());
          result.nodes = result.nodes.concat(feedbacks.nodes);
          continue;
        }

        newNode.setChildren(feedbacks.nodes);
      }

      result.nodes.push(newNode);
    }
  }

  return result;
};
