import { IBricksNode } from "./IBricksNode";
import {
  colorToString,
  colorToStringWithOpacity,
  isAutoLayout,
  rgbaToString,
} from "./utils";
import { computeURL, GoogleFontsInstance } from "./google/google-fonts";
import base64js from "base64-js";

export type StyledBricksNode =
  | BricksElementNode
  | BricksTextNode
  | BricksSvgNode;

export class BricksElementNode {
  readonly type = "element";
  tagName: string = "div";
  attributes: Attributes = {};
  children: StyledBricksNode[] = [];
  base64image?: string;

  async generateStylesFromFigmaNode(
    bricksNode: IBricksNode,
    figmaNode: SceneNode
  ) {
    if (figmaNode.type === "FRAME" || figmaNode.type === "RECTANGLE") {
      // corner radius
      if (figmaNode.cornerRadius !== figma.mixed) {
        this.attributes["border-radius"] = `${figmaNode.cornerRadius}px`;
      }

      // border
      const borderColors = figmaNode.strokes;
      if (borderColors.length > 0 && borderColors[0].type === "SOLID") {
        this.attributes["border-color"] = colorToString(borderColors[0].color);

        const {
          strokeWeight,
          strokeTopWeight,
          strokeBottomWeight,
          strokeLeftWeight,
          strokeRightWeight,
        } = figmaNode;

        if (strokeWeight !== figma.mixed) {
          this.attributes["border-width"] = `${strokeWeight}px`;
        } else {
          if (strokeTopWeight > 0) {
            this.attributes["border-top-width"] = `${strokeTopWeight}px`;
          }

          if (strokeBottomWeight > 0) {
            this.attributes["border-bottom-width"] = `${strokeBottomWeight}px`;
          }

          if (strokeLeftWeight > 0) {
            this.attributes["border-left-width"] = `${strokeLeftWeight}px`;
          }

          if (strokeRightWeight > 0) {
            this.attributes["border-right-width"] = `${strokeRightWeight}px`;
          }
        }

        this.attributes["border-style"] =
          figmaNode.dashPattern.length === 0 ? "solid" : "dashed";
      }

      // width
      this.attributes["width"] = `${figmaNode.absoluteBoundingBox.width}px`;

      // height
      this.attributes["height"] = `${figmaNode.absoluteBoundingBox.height}px`;

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
        this.attributes["box-shadow"] = dropShadowStrings.join(",");
      }

      // filter: blur
      const layerBlur = figmaNode.effects.find(
        (effect) => effect.type === "LAYER_BLUR" && effect.visible
      );

      if (layerBlur) {
        this.attributes["filter"] = `blur(${layerBlur.radius}px)`;
      }

      // backdrop-filter: blur
      const backgroundBlur = figmaNode.effects.find(
        (effect) => effect.type === "BACKGROUND_BLUR" && effect.visible
      );

      if (backgroundBlur) {
        this.attributes["backdrop-filter"] = `blur(${backgroundBlur.radius}px)`;
      }

      const fills = figmaNode.fills;
      if (fills !== figma.mixed && fills.length > 0) {
        // background color
        const solidPaint = fills.find(
          (fill) => fill.type === "SOLID"
        ) as SolidPaint;
        if (solidPaint) {
          this.attributes["background-color"] = colorToStringWithOpacity(
            solidPaint.color,
            solidPaint.opacity
          );
        }

        // image
        const imagePaint = fills.find(
          (fill) => fill.type === "IMAGE"
        ) as ImagePaint;
        if (imagePaint) {
          this.tagName = "img";

          // export image
          let bytes: Uint8Array;
          switch (imagePaint.scaleMode) {
            case "FILL": {
              this.attributes["object-fit"] = "cover";
              bytes = await figma
                .getImageByHash(imagePaint.imageHash)
                .getBytesAsync();
              break;
            }
            case "FIT": {
              this.attributes["object-fit"] = "contain";
              bytes = await figma
                .getImageByHash(imagePaint.imageHash)
                .getBytesAsync();
              break;
            }
            case "CROP": {
              // clone node so we won't modify the original one
              const clonedNode = figmaNode.clone();

              // remove styles that we don't want exported
              clonedNode.cornerRadius = 0;
              clonedNode.strokes = [];
              clonedNode.effects = [];

              bytes = await clonedNode.exportAsync({
                format: "PNG",
              });

              clonedNode.remove();
              break;
            }
            case "TILE":
              // Not supported
              break;
          }

          this.base64image = base64js.fromByteArray(bytes);

          // if an image has children, it means there are overlapping nodes
          if (this.children.length > 0) {
            // make a clone
            const newImageNode = new BricksElementNode();
            newImageNode.tagName = "img";
            newImageNode.attributes = this.attributes;
            newImageNode.base64image = this.base64image;

            // create container to hold all overlapping nodes
            const containerNode = new BricksElementNode();
            containerNode.tagName = "div";
            containerNode.attributes = {
              position: "absolute",
              top: "0",
            };
            containerNode.children = this.children;
            containerNode.generateSpacingStyles(bricksNode);

            // transform current node to a hold the image and the container
            this.tagName = "div";
            this.attributes = {
              position: "relative",
            };
            this.children = [newImageNode, containerNode];
            this.base64image = undefined;

            // skip spacing style generation
            return;
          }
        }
      }

      if (isAutoLayout(figmaNode)) {
        this.generateAutoLayoutStyles(figmaNode as FrameNode);
      } else {
        this.generateSpacingStyles(bricksNode);
      }
    }
  }

  generateSpacingStyles(bricksNode: IBricksNode) {
    if (bricksNode.layoutMode !== "NONE") {
      this.attributes["display"] = "flex";
    }

    if (bricksNode.layoutMode === "VERTICAL") {
      this.attributes["flex-direction"] = "column";
    }

    if (bricksNode.layoutMode === "HORIZONTAL") {
      // do nothing, as flex-direction is "row" by default
    }

    if (bricksNode.children.length > 1) {
      // children already have equal gaps because nodes were processed by groupByGap()
      // so only need to calucalte one gap
      const currentNodeBounds = bricksNode.children[0]?.absoluteBoundingBox;
      const nextNodeBounds = bricksNode.children[1]?.absoluteBoundingBox;

      if (currentNodeBounds && nextNodeBounds) {
        const gap =
          bricksNode.layoutMode === "VERTICAL"
            ? nextNodeBounds.y -
              (currentNodeBounds.y + currentNodeBounds.height)
            : nextNodeBounds.x -
              (currentNodeBounds.x + currentNodeBounds.width);

        this.attributes["gap"] = `${gap}px`;
      }
    }

    // Paddings smaller than than the threshold are ignored. This allows for a small margin of error in the design file.
    const paddingThreshold = 2;

    const containerNodeBounds = bricksNode.absoluteBoundingBox;

    const paddingTop = Math.min(
      ...bricksNode.children.map(
        (child) => child.absoluteBoundingBox.y - containerNodeBounds.y
      )
    );
    const paddingRight = Math.min(
      ...bricksNode.children.map(
        (child) =>
          containerNodeBounds.x +
          containerNodeBounds.width -
          (child.absoluteBoundingBox.x + child.absoluteBoundingBox.width)
      )
    );
    const paddingBottom = Math.min(
      ...bricksNode.children.map(
        (child) =>
          containerNodeBounds.y +
          containerNodeBounds.height -
          (child.absoluteBoundingBox.y + child.absoluteBoundingBox.height)
      )
    );
    const paddingLeft = Math.min(
      ...bricksNode.children.map(
        (child) => child.absoluteBoundingBox.x - containerNodeBounds.x
      )
    );

    if (Math.abs(paddingRight - paddingLeft) <= paddingThreshold) {
      // element is centered along the horizontal axis
      this.attributes["display"] = "flex";
      this.attributes["justify-content"] = "center";
    } else {
      // element has different left and right paddings
      if (paddingLeft > paddingThreshold) {
        this.attributes["padding-left"] = `${paddingLeft}px`;
      }
      if (paddingRight > paddingThreshold) {
        this.attributes["padding-right"] = `${paddingRight}px`;
      }
    }

    if (Math.abs(paddingTop - paddingBottom) <= paddingThreshold) {
      // element is centered along the vertical axis
      this.attributes["display"] = "flex";
      this.attributes["align-items"] = "center";
    } else {
      // element has different top and bottom paddings
      if (paddingTop > paddingThreshold) {
        this.attributes["padding-top"] = `${paddingTop}px`;
      }
      if (paddingBottom > paddingThreshold) {
        this.attributes["padding-bottom"] = `${paddingBottom}px`;
      }
    }
  }

  private generateAutoLayoutStyles(figmaNode: FrameNode) {
    this.attributes["display"] = "flex";

    if (figmaNode.layoutMode === "HORIZONTAL") {
      this.attributes["flex-direction"] = "row";

      if (figmaNode.primaryAxisSizingMode === "AUTO") {
        delete this.attributes["width"];
      }

      if (figmaNode.counterAxisSizingMode === "AUTO") {
        delete this.attributes["height"];
      }
    }

    if (figmaNode.layoutMode === "VERTICAL") {
      this.attributes["flex-direction"] = "column";

      if (figmaNode.primaryAxisSizingMode === "AUTO") {
        delete this.attributes["height"];
      }

      if (figmaNode.counterAxisSizingMode === "AUTO") {
        delete this.attributes["width"];
      }
    }

    switch (figmaNode.primaryAxisAlignItems) {
      case "MIN":
        this.attributes["justify-content"] = "start";
        break;
      case "CENTER":
        this.attributes["justify-content"] = "center";
        break;
      case "SPACE_BETWEEN":
        this.attributes["justify-content"] = "space-between";
        break;
      case "MAX":
        this.attributes["justify-content"] = "end";
        break;
    }

    switch (figmaNode.counterAxisAlignItems) {
      case "MIN":
        this.attributes["align-items"] = "start";
        break;
      case "CENTER":
        this.attributes["align-items"] = "center";
        break;
      case "MAX":
        this.attributes["align-items"] = "end";
        break;
    }

    if (this.children.length > 1) {
      // gap has to effect when only there is only one child
      this.attributes["gap"] = `${figmaNode.itemSpacing}px`;
    }

    if (figmaNode.paddingTop) {
      this.attributes["padding-top"] = `${figmaNode.paddingTop}px`;
    }

    if (figmaNode.paddingRight) {
      this.attributes["padding-right"] = `${figmaNode.paddingRight}px`;
    }

    if (figmaNode.paddingBottom) {
      this.attributes["padding-bottom"] = `${figmaNode.paddingBottom}px`;
    }

    if (figmaNode.paddingLeft) {
      this.attributes["padding-left"] = `${figmaNode.paddingLeft}px`;
    }
  }
}

export class BricksTextNode {
  readonly type = "text";
  tagName: string = "p";
  attributes: Attributes = {};
  text: string = "";
  source: string = "";

  constructor(text: string) {
    this.text = text;
  }

  generateStyles(figmaNode: TextNode) {
    const fontFamily = (figmaNode.fontName as FontName).family;

    this.source = computeURL([figmaNode]);

    // font family
    if (figmaNode.fontName !== figma.mixed) {
      this.attributes[
        "font-family"
      ] = `'${fontFamily}', ${GoogleFontsInstance.getGenericFontFamily(
        fontFamily
      )}`;
    }

    // font size
    if (figmaNode.fontSize !== figma.mixed) {
      this.attributes["font-size"] = `${figmaNode.fontSize}px`;
    }

    // width and height
    const { absoluteRenderBounds } = figmaNode;

    switch (figmaNode.textAutoResize) {
      case "NONE": {
        this.attributes["width"] = `${absoluteRenderBounds.width}px`;
        this.attributes["height"] = `${absoluteRenderBounds.height}px`;
        break;
      }
      case "HEIGHT": {
        this.attributes["width"] = `${absoluteRenderBounds.width}px`;
        break;
      }
      case "WIDTH_AND_HEIGHT": {
        // do nothing
        break;
      }
      case "TRUNCATE": {
        this.attributes["width"] = `${absoluteRenderBounds.width}px`;
        this.attributes["height"] = `${absoluteRenderBounds.height}px`;
        this.attributes["text-overflow"] = "ellipsis";
        break;
      }
    }

    // text decoration
    switch (figmaNode.textDecoration) {
      case "STRIKETHROUGH":
        this.attributes["text-decoration"] = "line-through";
        break;
      case "UNDERLINE":
        this.attributes["text-decoration"] = "underline";
        break;
    }

    // font color
    const colors = figmaNode.fills;
    if (
      colors !== figma.mixed &&
      colors.length > 0 &&
      colors[0].type === "SOLID"
    ) {
      this.attributes["color"] = colorToStringWithOpacity(
        colors[0].color,
        colors[0].opacity
      );
    }

    // text alignment
    switch (figmaNode.textAlignHorizontal) {
      case "CENTER":
        this.attributes["text-align"] = "center";
        break;
      case "RIGHT":
        this.attributes["text-align"] = "right";
        break;
      case "JUSTIFIED":
        this.attributes["text-align"] = "justify";
        break;
    }

    // line height
    const lineHeight = figmaNode.lineHeight;
    if (lineHeight !== figma.mixed && lineHeight.unit !== "AUTO") {
      const unit = lineHeight.unit === "PIXELS" ? "px" : "%";
      this.attributes["line-height"] = `${lineHeight.value}${unit}`;
    }

    // text transform
    const textCase = figmaNode.textCase;
    if (textCase !== figma.mixed) {
      switch (textCase) {
        case "ORIGINAL":
          // do nothing
          break;
        case "UPPER":
          this.attributes["text-transform"] = "uppercase";
          break;
        case "LOWER":
          this.attributes["text-transform"] = "lowercase";
          break;
        case "TITLE":
          this.attributes["text-transform"] = "capitalize";
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

      this.attributes["letter-spacing"] = `${value}${unit}`;
    }

    // font weight
    if (figmaNode.fontWeight !== figma.mixed) {
      this.attributes["font-weight"] = figmaNode.fontWeight.toString();
    }

    // font style
    if (
      figmaNode.fontName !== figma.mixed &&
      figmaNode.fontName.style.toLowerCase().includes("italic")
    ) {
      this.attributes["font-style"] = "italic";
    }
  }
}

export class BricksSvgNode {
  readonly type = "svg";
  attributes: Attributes = {};
  svg: string;

  constructor(svg: string) {
    this.svg = svg;
  }
}

export type Attributes = { [key: string]: string };

export async function generateStyledBricksNode(
  bricksNode: IBricksNode
): Promise<StyledBricksNode> {
  const figmaNode = figma.currentPage.findOne(
    (figmaNode) => figmaNode.id === bricksNode.id
  );

  if (bricksNode.type === "VECTOR") {
    return new BricksSvgNode(bricksNode.svg);
  }

  if (bricksNode.source === "figma") {
    switch (figmaNode.type) {
      case "TEXT": {
        const newNode = new BricksTextNode(figmaNode.characters);
        newNode.generateStyles(figmaNode);
        return newNode;
      }
      // Figma node that has children
      case "RECTANGLE":
      case "FRAME": {
        const newNode = new BricksElementNode();
        newNode.children = await Promise.all(
          bricksNode.children.map(generateStyledBricksNode)
        );
        await newNode.generateStylesFromFigmaNode(bricksNode, figmaNode);
        return newNode;
      }
      // Figma node that does not have children
      default: {
        const newNode = new BricksElementNode();
        await newNode.generateStylesFromFigmaNode(bricksNode, figmaNode);
        return newNode;
      }
    }
  } else {
    const newNode = new BricksElementNode();
    newNode.children = await Promise.all(
      bricksNode.children.map(generateStyledBricksNode)
    );
    newNode.generateSpacingStyles(bricksNode);
    return newNode;
  }
}
