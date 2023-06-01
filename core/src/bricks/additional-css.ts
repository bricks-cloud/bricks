import { isEmpty } from "../utils";
import { Attributes, BoxCoordinates } from "../design/adapter/node";
import {
  Direction,
  getOppositeDirection,
  reorderNodesBasedOnDirection,
  getDirection,
} from "./direction";
import { Node, NodeType, PostionalRelationship, TextNode, computePositionalRelationship } from "./node";
import {
  getContainerLineFromNodes,
  getLinesFromNodes,
  Line,
  getLineBasedOnDirection,
  getContainerRenderingLineFromNodes,
  getLineUsingRenderingBoxBasedOnDirection,
} from "./line";
import { filterCssValue, shouldUseAsBackgroundImage } from "./util";
import { absolutePositioningAnnotation } from "./overlap";
import { nameRegistryGlobalInstance } from "../code/name-registry/name-registry";

export const selectBox = (
  node: Node,
  useBoundingBox: boolean = false
): BoxCoordinates => {
  const attributes: Attributes = node.getCssAttributes();
  if (!isEmpty(attributes["box-shadow"])) {
    return node.getAbsBoundingBox();
  }

  if (useBoundingBox) {
    return node.getAbsBoundingBox();
  }

  if (node.getType() === NodeType.VISIBLE) {
    return node.getAbsBoundingBox();
  }

  if (node.getType() === NodeType.IMAGE) {
    return node.getAbsBoundingBox();
  }

  return node.getAbsRenderingBox();
};

enum JustifyContent {
  FLEX_START = "flex-start",
  FLEX_END = "flex-end",
  CENTER = "center",
  SPACE_BETWEEN = "space-between",
}

enum AlignItems {
  FLEX_START = "flex-start",
  FLEX_END = "flex-end",
  CENTER = "center",
  SPACE_BETWEEN = "space-between",
}

enum RelativePoisition {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  CONTAIN = "CONTAIN",
}

// addAdditionalCssAttributesToNodes adds additional css information to a node and its children.
export const addAdditionalCssAttributesToNodes = (node: Node, startingNode: Node) => {
  if (isEmpty(node)) {
    return;
  }

  adjustNodeHeightAndWidthCssValue(node);
  addAdditionalCssAttributes(node);

  const children = node.getChildren();
  if (isEmpty(children)) {
    return;
  }

  const direction = getDirection(node);
  reorderNodesBasedOnDirection(node, direction);
  node.addPositionalCssAttributes(getPositionalCssAttributes(node, direction));
  adjustChildrenHeightAndWidthCssValue(node);
  adjustChildrenPositionalCssValue(node, direction);
  UpdateNodeWidthToMinWidth(node);

  for (const child of children) {
    setOverflowHiddenForStartingNode(child, startingNode);
    addAdditionalCssAttributesToNodes(child, startingNode);
  }
};

const setOverflowHiddenForStartingNode = (targetNode: Node, startingNode: Node) => {
  if (computePositionalRelationship(targetNode.getAbsBoundingBox(), startingNode.getAbsBoundingBox()) !== PostionalRelationship.INCLUDE) {
    startingNode.addCssAttributes({ "overflow": "hidden" });
  }
};

const UpdateNodeWidthToMinWidth = (node: Node) => {
  const positionalCssAttributes: Attributes = node.getPositionalCssAttributes();
  const cssAttributes: Attributes = node.getCssAttributes();
  if (
    positionalCssAttributes["flex-direction"] === "row" &&
    !isEmpty(positionalCssAttributes["padding-left"]) &&
    !isEmpty(positionalCssAttributes["padding-right"])
  ) {
    const children: Node[] = node.getChildren();

    for (const child of children) {
      if (!isEmpty(child.getACssAttribute("min-width"))) {
        const width: string = cssAttributes["width"];
        cssAttributes["min-width"] = width;
        delete cssAttributes["width"];
        node.setCssAttributes(cssAttributes);
        break;
      }
    }
  }
};

const adjustChildrenPositionalCssValue = (node: Node, direction: Direction) => {
  const children = node.getChildren();
  if (isEmpty(children)) {
    return;
  }

  const zIndexArr: string[] = ["10", "20", "30", "40", "50"];

  if (node.hasAnnotation(absolutePositioningAnnotation)) {
    if (children.length <= 5) {
      for (let i = children.length - 1; i >= 0; i--) {
        const current: Node = children[i];
        const zIndex: string = zIndexArr[children.length - 1 - i];
        current.addPositionalCssAttributes({
          "z-index": zIndex,
        });
      }
    }

    if (children.length > 5) {
      for (let i = children.length - 1; i >= 0; i--) {
        const current: Node = children[i];
        current.addPositionalCssAttributes({
          "z-index": `${children.length - 1 - i}`,
        });
      }
    }

    return;
  }

  let prevChild: Node = null;
  for (let i = 0; i < children.length; i++) {
    const child: Node = children[i];
    if (i === 0) {
      prevChild = child;
      continue;
    }

    const currentLine: Line = getLineUsingRenderingBoxBasedOnDirection(
      child,
      direction
    );
    const prevLine: Line = getLineUsingRenderingBoxBasedOnDirection(
      prevChild,
      direction
    );

    if (currentLine.overlap(prevLine, 2)) {
      if (child.getACssAttribute("box-shadow")) {
        child.addCssAttributes({
          "z-index": "10",
        });
      } else if (prevChild.getACssAttribute("box-shadow")) {
        prevChild.addCssAttributes({
          "z-index": "10",
        });
      }
    }
  }
};

// getPaddingInPixels calculates paddings given a node.
export const getPaddingInPixels = (
  node: Node,
  direction: Direction,
  justifyContentValue: JustifyContent,
  alignItemsValue: AlignItems
): number[] => {
  let paddingTop: number = 0;
  let paddingBot: number = 0;
  let paddingLeft: number = 0;
  let paddingRight: number = 0;

  const targetLine = getContainerLineFromNodes(
    node.getChildren(),
    direction,
    true
  );
  const parentLine = getContainerLineFromNodes([node], direction, true);

  const perpendicularTargetLine = getContainerLineFromNodes(
    node.getChildren(),
    getOppositeDirection(direction),
    true
  );

  // const boundingBoxPerpendicularTargetLine = getContainerLineFromNodes(node.getChildren(), direction, true);
  const perpendicularParentLine = getContainerLineFromNodes(
    [node],
    getOppositeDirection(direction),
    true
  );

  if (direction === Direction.VERTICAL) {
    let leftGap: number = targetLine.lower - parentLine.lower;
    let rightGap: number = parentLine.upper - targetLine.upper;

    let topGap: number =
      perpendicularTargetLine.lower - perpendicularParentLine.lower;
    let botGap: number =
      perpendicularParentLine.upper - perpendicularTargetLine.upper;

    switch (justifyContentValue) {
      case JustifyContent.SPACE_BETWEEN:
        paddingLeft = leftGap;
        paddingRight = rightGap;
        break;
      case JustifyContent.FLEX_START:
        paddingLeft = leftGap;
        break;
      case JustifyContent.FLEX_END:
        paddingRight = rightGap;
        break;
    }

    switch (alignItemsValue) {
      case AlignItems.FLEX_START:
        paddingTop = topGap;
        break;
      case AlignItems.FLEX_END:
        paddingBot = botGap;
        break;
    }

    return [paddingTop, paddingRight, paddingBot, paddingLeft];
  }

  let topGap: number = targetLine.lower - parentLine.lower;
  let botGap: number = parentLine.upper - targetLine.upper;

  let leftGap: number =
    perpendicularTargetLine.lower - perpendicularParentLine.lower;
  let rightGap: number =
    perpendicularParentLine.upper - perpendicularTargetLine.upper;

  switch (justifyContentValue) {
    case JustifyContent.SPACE_BETWEEN:
      paddingTop = topGap;
      paddingBot = botGap;
      break;
    case JustifyContent.FLEX_START:
      paddingTop = topGap;
      break;
    case JustifyContent.FLEX_END:
      paddingBot = botGap;
      break;
  }

  switch (alignItemsValue) {
    case AlignItems.FLEX_START:
      paddingLeft = leftGap;
      break;
    case AlignItems.FLEX_END:
      paddingRight = rightGap;
      break;
  }

  return [paddingTop, paddingRight, paddingBot, paddingLeft];
};

// setMarginsForChildren sets margins for a node's children.
const setMarginsForChildren = (
  parentNode: Node,
  direction: Direction,
  justifyContentValue: JustifyContent,
  alignItemsValue: AlignItems,
  paddings: number[]
) => {
  const children = parentNode.getChildren();

  const [paddingTop, paddingRight, paddingBot, paddingLeft] = paddings;

  for (let i = 0; i < children.length; i++) {
    const targetNode = children[i];

    let marginTop: number = 0;
    let marginBot: number = 0;
    let marginLeft: number = 0;
    let marginRight: number = 0;

    let topGap: number = 0;
    let botGap: number = 0;
    let leftGap: number = 0;
    let rightGap: number = 0;

    const targetLine = getLineBasedOnDirection(targetNode, direction, true);
    const parentLine = getLineBasedOnDirection(parentNode, direction, true);
    const perpendicularTargetLine = getLineBasedOnDirection(
      targetNode,
      getOppositeDirection(direction),
      true
    );
    const perpendicularParentLine = getLineBasedOnDirection(
      parentNode,
      getOppositeDirection(direction),
      true
    );

    let prevTarget = children[i];
    if (i > 0) {
      prevTarget = children[i - 1];
    }
    const prevTargetLine = getLineBasedOnDirection(prevTarget, direction, true);

    let nextTarget = children[i];
    if (i < children.length - 1) {
      nextTarget = children[i + 1];
    }
    const nextTargetLine = getLineBasedOnDirection(nextTarget, direction, true);

    if (direction === Direction.HORIZONTAL) {
      botGap =
        i === children.length - 1
          ? parentLine.upper - targetLine.upper - paddingBot
          : nextTargetLine.lower - targetLine.upper;
      topGap =
        i === 0
          ? targetLine.lower - parentLine.lower - paddingTop
          : targetLine.lower - prevTargetLine.upper;

      switch (justifyContentValue) {
        case JustifyContent.SPACE_BETWEEN:
          if (i === 0 && i === children.length - 1) {
            marginTop = topGap;
            marginBot = botGap;
            break;
          }

          if (i === 0) {
            marginTop = topGap;
            break;
          }

          if (i === children.length - 1) {
            marginBot = botGap;
          }
          break;
        case JustifyContent.FLEX_START:
          marginTop = topGap;
          break;
        case JustifyContent.FLEX_END:
          marginBot = botGap;
          break;
      }

      leftGap =
        perpendicularTargetLine.lower -
        perpendicularParentLine.lower -
        paddingLeft;
      rightGap =
        perpendicularParentLine.lower -
        perpendicularTargetLine.upper -
        paddingRight;

      switch (alignItemsValue) {
        case AlignItems.FLEX_START:
          marginLeft = leftGap;
          break;
        case AlignItems.FLEX_END:
          marginRight = rightGap;
          break;
      }

      targetNode.addPositionalCssAttributes({
        ...(marginTop > 0 && { "margin-top": `${marginTop}px` }),
        ...(marginLeft > 0 && { "margin-left": `${marginLeft}px` }),
        ...(marginBot > 0 && { "margin-bottom": `${marginBot}px` }),
        ...(marginRight > 0 && { "margin-right": `${marginRight}px` }),
      });
      continue;
    }

    rightGap =
      i === children.length - 1
        ? parentLine.upper - targetLine.upper - paddingRight
        : nextTargetLine.lower - targetLine.upper;
    leftGap =
      i === 0
        ? targetLine.lower - parentLine.lower - paddingLeft
        : targetLine.lower - prevTargetLine.upper;

    switch (justifyContentValue) {
      case JustifyContent.SPACE_BETWEEN:
        if (i === 0 && i === children.length - 1) {
          marginLeft = leftGap;
          marginRight = rightGap;
          break;
        }

        if (i === 0) {
          marginLeft = leftGap;
          break;
        }

        if (i === children.length - 1) {
          marginRight = rightGap;
          break;
        }
        break;
      case JustifyContent.FLEX_START:
        marginLeft = leftGap;
        break;
      case JustifyContent.FLEX_END:
        marginRight = rightGap;
        break;
    }

    topGap =
      perpendicularTargetLine.lower -
      perpendicularParentLine.lower -
      paddingTop;
    botGap =
      perpendicularParentLine.lower -
      perpendicularTargetLine.upper -
      paddingBot;

    switch (alignItemsValue) {
      case AlignItems.FLEX_START:
        marginTop = topGap;
        break;
      case AlignItems.FLEX_END:
        marginBot = botGap;
        break;
    }

    targetNode.addPositionalCssAttributes({
      ...(marginTop > 0 && { "margin-top": `${marginTop}px` }),
      ...(marginLeft > 0 && { "margin-left": `${marginLeft}px` }),
      ...(marginBot > 0 && { "margin-bottom": `${marginBot}px` }),
      ...(marginRight > 0 && { "margin-right": `${marginRight}px` }),
    });
  }
};

const isCssValueEmpty = (value: string): boolean => {
  return isEmpty(
    filterCssValue(value, {
      truncateNumbers: true,
    })
  );
};

export const addAdditionalCssAttributes = (node: Node) => {
  if (shouldUseAsBackgroundImage(node)) {
    const id: string = node.getId();
    const imageComponentName: string =
      nameRegistryGlobalInstance.getImageName(id);

    let extension: string = "png";
    if (node.getType() === NodeType.VECTOR) {
      extension = "svg";
    }

    node.addCssAttributes({
      "background-image": `url('./assets/${imageComponentName}.${extension}')`,
    });
  }

  if (node.getType() === NodeType.IMAGE) {
    if (!isEmpty(node.getACssAttribute("border-radius"))) {
      node.addCssAttributes({
        overflow: "hidden",
      });
    }
    return;
  }

  if (isEmpty(node.getChildren())) {
    return;
  }

  if (isEmpty(node.getACssAttribute("border-radius"))) {
    return;
  }

  const childrenContainerLineY = getContainerRenderingLineFromNodes(
    node.getChildren(),
    Direction.HORIZONTAL
  );
  const childrenHeight = Math.abs(
    childrenContainerLineY.upper - childrenContainerLineY.lower
  );
  const childrenContainerLineX = getContainerRenderingLineFromNodes(
    node.getChildren(),
    Direction.VERTICAL
  );
  const childrenWidth = Math.abs(
    childrenContainerLineX.upper - childrenContainerLineX.lower
  );

  const containerLineY = getContainerRenderingLineFromNodes(
    [node],
    Direction.HORIZONTAL
  );
  const height = Math.abs(containerLineY.upper - containerLineY.lower);
  const containerLineX = getContainerRenderingLineFromNodes(
    [node],
    Direction.VERTICAL
  );
  const width = Math.abs(containerLineX.upper - containerLineX.lower);

  const borderRadius: string = node.getACssAttribute("border-radius");
  if (!borderRadius.endsWith("px")) {
    return;
  }

  const borderRadiusNum: number = parseInt(borderRadius.slice(0, -2));
  if (
    childrenHeight < height - borderRadiusNum ||
    childrenWidth < width - borderRadiusNum
  ) {
    return;
  }

  node.addCssAttributes({
    overflow: "hidden",
  });
};

const adjustNodeHeightAndWidthCssValue = (node: Node) => {
  const attributes: Attributes = node.getCssAttributes();
  if (!isEmpty(attributes["box-shadow"])) {
    const width: number = Math.abs(
      node.getAbsBoundingBox().leftTop.x - node.getAbsBoundingBox().rightBot.x
    );
    const height: number = Math.abs(
      node.getAbsBoundingBox().leftTop.y - node.getAbsBoundingBox().rightBot.y
    );
    attributes["width"] = `${width}px`;
    attributes["height"] = `${height}px`;
  }

  if (node.getType() === NodeType.VECTOR) {
    const width: number = Math.abs(
      node.getAbsRenderingBox().leftTop.x - node.getAbsRenderingBox().rightBot.x
    );
    const height: number = Math.abs(
      node.getAbsRenderingBox().leftTop.y - node.getAbsRenderingBox().rightBot.y
    );
    attributes["width"] = `${width}px`;
    attributes["height"] = `${height}px`;
  }

  node.setCssAttributes(attributes);
};

const adjustChildrenHeightAndWidthCssValue = (node: Node) => {
  if (!isEmpty(node.getPositionalCssAttributes())) {
    const [maxWidth, maxHeight] = getAllowedMaxWidthAndHeight(node);

    const flexDir = node.getAPositionalAttribute("flex-direction");

    const alignItems = node.getAPositionalAttribute("align-items");

    let gap: number = 0;
    let gapCssVal: string = node.getACssAttribute("gap");
    if (!isCssValueEmpty(gapCssVal)) {
      gap = parseInt(gapCssVal.slice(0, -2), 10);
    }

    let currentRenderingWidth: number = 0;
    let currentRenderingHeight: number = 0;

    const children: Node[] = node.getChildren();
    for (const child of children) {
      const renderingBox = child.getAbsRenderingBox();
      const renderingWidth = Math.abs(
        renderingBox.rightBot.x - renderingBox.leftTop.x
      );
      const renderingHeight = Math.abs(
        renderingBox.rightBot.y - renderingBox.leftTop.y
      );

      currentRenderingWidth += renderingWidth;
      currentRenderingHeight += renderingHeight;
    }

    currentRenderingWidth += children.length - 1 * gap;
    currentRenderingHeight += children.length - 1 * gap;

    if (flexDir === "column") {
      for (const child of node.getChildren()) {
        const attributes: Attributes = {};

        let widthCssVal: string = child.getACssAttribute("width");
        let heightCssVal: string = child.getACssAttribute("height");

        const renderingBox = child.getAbsRenderingBox();
        const boundingBox = child.getAbsBoundingBox();

        const boundingWidth = Math.abs(
          boundingBox.rightBot.x - boundingBox.leftTop.x
        );

        const renderingHeight = Math.abs(
          renderingBox.rightBot.y - renderingBox.leftTop.y
        );
        const boundingHeight = Math.abs(
          boundingBox.rightBot.y - boundingBox.leftTop.y
        );
        let largerHeight =
          renderingHeight > boundingHeight ? renderingHeight : boundingHeight;

        if (!isCssValueEmpty(widthCssVal)) {
          const width = Math.trunc(parseInt(widthCssVal.slice(0, -2), 10));

          // if (width > maxWidth) {
          //   attributes["width"] = `${renderingWidth}px`;
          // }

          if (width < maxWidth && boundingWidth <= maxWidth) {
            attributes["width"] = `${boundingWidth}px`;
          }
        }

        if (!isCssValueEmpty(heightCssVal)) {
          const height = Math.trunc(parseInt(heightCssVal.slice(0, -2), 10));

          if (currentRenderingHeight - height + largerHeight <= maxHeight) {
            attributes["height"] = `${largerHeight}px`;
          }
        }

        child.addCssAttributes(attributes);

        if (alignItems === "center" && child.getType() === NodeType.TEXT) {
          let moreThanOneRow: boolean = false;
          const textNode: TextNode = child as TextNode;
          const childAttributes: Attributes = textNode.getCssAttributes();

          const [_, renderBoundsHeight] = child.getRenderingBoxWidthAndHeight();

          let fontSize: number = -Infinity;
          for (const segment of textNode.getStyledTextSegments()) {
            if (segment.fontSize > fontSize) {
              fontSize = segment.fontSize;
            }
          }

          moreThanOneRow = renderBoundsHeight > fontSize * 1.5;

          if (!moreThanOneRow) {
            delete childAttributes["width"];
            delete childAttributes["min-width"];
            child.setCssAttributes(childAttributes);
          }
        }
      }
    }

    if (flexDir === "row") {
      for (const child of node.getChildren()) {
        const attributes: Attributes = {};

        let heightCssVal: string = child.getACssAttribute("height");
        let widthCssVal: string = child.getACssAttribute("width");
        const renderingBox = child.getAbsRenderingBox();
        const boundingBox = child.getAbsBoundingBox();

        const boundingHeight = Math.abs(
          boundingBox.rightBot.y - boundingBox.leftTop.y
        );

        const renderingWidth = Math.abs(
          renderingBox.rightBot.x - renderingBox.leftTop.x
        );
        const boundingWidth = Math.abs(
          boundingBox.rightBot.x - boundingBox.leftTop.x
        );

        let largerWidth =
          renderingWidth > boundingWidth ? renderingWidth : boundingWidth;

        if (!isCssValueEmpty(heightCssVal)) {
          const height = parseInt(heightCssVal.slice(0, -2), 10);
          // if (height > maxHeight) {
          //   attributes["height"] = `${renderingHeight}px`;
          // }

          if (height < maxHeight && boundingHeight <= maxHeight) {
            attributes["height"] = `${boundingHeight}px`;
          }
        }

        if (!isCssValueEmpty(widthCssVal)) {
          const width = Math.trunc(parseInt(widthCssVal.slice(0, -2), 10));

          if (currentRenderingWidth - width + largerWidth <= maxWidth) {
            attributes["width"] = `${largerWidth}px`;
          }
        }

        child.addCssAttributes(attributes);
      }
    }
  }
};

const cssValueToNumber = (cssValue: string): number => {
  if (cssValue.endsWith("px")) {
    return parseInt(cssValue.slice(0, -2), 10);
  }

  return -Infinity;
};

const getAllowedMaxWidthAndHeight = (node: Node): number[] => {
  let pl: number = 0;
  let pt: number = 0;
  let pr: number = 0;
  let pb: number = 0;

  let width: number = 0;
  let height: number = 0;

  let widthCssValue: string = node.getACssAttribute("width");
  let heightCssValue: string = node.getACssAttribute("height");

  if (widthCssValue && heightCssValue) {
    width = cssValueToNumber(widthCssValue);
    height = cssValueToNumber(heightCssValue);
  }

  const plInPixels = node.getAPositionalAttribute("padding-left");
  if (!isCssValueEmpty(plInPixels)) {
    pl = parseInt(plInPixels.slice(0, -2), 10);
  }
  const prInPixels = node.getAPositionalAttribute("padding-right");
  if (!isCssValueEmpty(prInPixels)) {
    pr = parseInt(prInPixels.slice(0, -2), 10);
  }
  const ptInPixels = node.getAPositionalAttribute("padding-top");
  if (!isCssValueEmpty(ptInPixels)) {
    pt = parseInt(ptInPixels.slice(0, -2), 10);
  }
  const pbInPixels = node.getAPositionalAttribute("padding-bottom");
  if (!isCssValueEmpty(pbInPixels)) {
    pb = parseInt(pbInPixels.slice(0, -2), 10);
  }

  return [width - pl - pr, height - pt - pb];
};

// getPositionalCssAttributes gets positional css information of a node in relation to its children.
export const getPositionalCssAttributes = (
  node: Node,
  direction: Direction
): Attributes => {
  const positionalCssAttributes = node.getPositionalCssAttributes();
  // if autolayout has been set on this node
  if (!isEmpty(positionalCssAttributes["display"])) {
    if (doPaddingValuesExist(node)) {
      return positionalCssAttributes;
    }

    const attributes: Attributes = {};
    setPaddingAndMarginValues(node, direction, attributes);
    return {
      ...positionalCssAttributes,
      ...attributes,
    };
  }

  const attributes: Attributes = {};

  if (isEmpty(node.getChildren())) {
    return positionalCssAttributes;
  }

  if (node.hasAnnotation(absolutePositioningAnnotation)) {
    attributes["position"] = "relative";

    const currentBox = selectBox(node, true);
    for (const child of node.getChildren()) {
      const childAttributes: Attributes = {};
      const targetBox = selectBox(child, true);
      const vertical = Math.abs(currentBox.leftTop.y - targetBox.leftTop.y);
      const horizontal = Math.abs(currentBox.leftTop.x - targetBox.leftTop.x);
      // const right = Math.abs(currentBox.rightBot.x - targetBox.rightBot.x);

      childAttributes["position"] = "absolute";
      if (
        currentBox.leftTop.y < targetBox.leftTop.y &&
        currentBox.leftTop.y > targetBox.rightBot.y
      ) {
        childAttributes["top"] = `-${vertical}px`;
      } else {
        childAttributes["top"] = `${vertical}px`;
      }

      if (
        currentBox.leftTop.x < targetBox.rightTop.x &&
        currentBox.leftTop.x > targetBox.leftTop.x
      ) {
        childAttributes["left"] = `-${horizontal}px`;
      } else {
        childAttributes["left"] = `${horizontal}px`;
      }

      child.addPositionalCssAttributes(childAttributes);
    }

    return {
      ...positionalCssAttributes,
      ...attributes,
    };
  }

  attributes["display"] = "flex";
  if (direction === Direction.HORIZONTAL) {
    attributes["flex-direction"] = "column";
  }

  setPaddingAndMarginValues(node, direction, attributes);

  return {
    ...positionalCssAttributes,
    ...attributes,
  };
};

const doPaddingValuesExist = (node: Node): boolean => {
  const cssAttributes: Attributes = node.getCssAttributes();
  if (!isEmpty(cssAttributes["padding-top"]) || !isEmpty(cssAttributes["padding-bottom"]) || !isEmpty(cssAttributes["padding-left"]) || !isEmpty(cssAttributes["padding-right"])) {
    return true;
  }

  return false;
};

const setPaddingAndMarginValues = (node: Node, direction: Direction, attributes: Attributes) => {
  const justifyContentValue = getJustifyContentValue(node, direction);
  const alignItemsValue = getAlignItemsValue(
    node,
    getOppositeDirection(direction)
  );

  attributes["justify-content"] = justifyContentValue;
  attributes["align-items"] = alignItemsValue;

  const paddings = getPaddingInPixels(
    node,
    direction,
    justifyContentValue,
    alignItemsValue
  );
  const [paddingTop, paddingRight, paddingBot, paddingLeft] = paddings;

  attributes["padding-top"] = `${paddingTop}px`;
  attributes["padding-bottom"] = `${paddingBot}px`;
  attributes["padding-right"] = `${paddingRight}px`;
  attributes["padding-left"] = `${paddingLeft}px`;

  setMarginsForChildren(
    node,
    direction,
    justifyContentValue,
    alignItemsValue,
    paddings
  );
};

// getJustifyContentValue determines the value of justify-content css property given a node and flex-direction.
const getJustifyContentValue = (
  parentNode: Node,
  direction: Direction
): JustifyContent => {
  const children = parentNode.getChildren();
  const targetLines = getLinesFromNodes(children, direction);
  const [parentLine] = getLinesFromNodes([parentNode], direction);

  if (targetLines.length === 1) {
    const targetLine = targetLines[0];
    const mid = parentLine.getMid();

    const touchingStart: boolean =
      parentLine.lower + 2 >= targetLine.lower &&
      targetLine.lower >= parentLine.lower - 2;
    const touchingEnd: boolean =
      parentLine.upper + 2 >= targetLine.upper &&
      targetLine.upper >= parentLine.upper - 2;

    if (touchingStart && touchingEnd) {
      return JustifyContent.CENTER;
    }

    if (touchingStart) {
      return JustifyContent.FLEX_START;
    }

    if (touchingEnd) {
      return JustifyContent.FLEX_END;
    }

    switch (targetLine.getRelativeLinePosition(mid)) {
      case RelativePoisition.LEFT:
        return JustifyContent.FLEX_START;
      case RelativePoisition.RIGHT:
        return JustifyContent.FLEX_END;
      case RelativePoisition.CONTAIN:
        const diff = targetLine.getSymetricDifference(mid);
        if (Math.abs(diff) / parentLine.getLength() <= 0.2) {
          return JustifyContent.CENTER;
        }

        if (diff > 0) {
          return JustifyContent.FLEX_END;
        }

        return JustifyContent.FLEX_START;
    }
  }

  if (targetLines.length === 2) {
    return JustifyContent.SPACE_BETWEEN;
  }

  if (targetLines.length > 2) {
    const gaps: number[] = [];
    let prevLine: Line = null;
    for (let i = 0; i < targetLines.length; i++) {
      const targetLine: Line = targetLines[i];
      if (i === 0) {
        prevLine = targetLine;
        continue;
      }

      gaps.push(targetLine.lower - prevLine.upper);
      prevLine = targetLine;
    }

    const averageGap: number = gaps.reduce((a, b) => a + b) / gaps.length;
    let isJustifyCenter: boolean = true;
    for (let i = 0; i < targetLines.length; i++) {
      const targetLine: Line = targetLines[i];
      if (i === 0) {
        prevLine = targetLine;
        continue;
      }

      const gap: number = targetLine.lower - prevLine.upper;

      if (Math.abs(gap - averageGap) / averageGap > 0.1) {
        isJustifyCenter = false;
      }
      prevLine = targetLine;
    }

    if (isJustifyCenter) {
      return JustifyContent.SPACE_BETWEEN;
    }
  }

  return JustifyContent.FLEX_START;
};

// getAlignItemsValue determines the value of align-items css property given a node and flex-direction.
const getAlignItemsValue = (
  parentNode: Node,
  direction: Direction
): AlignItems => {
  const children = parentNode.getChildren();
  const targetLines = getLinesFromNodes(children, direction);
  const [parentLine] = getLinesFromNodes([parentNode], direction);
  const mid = parentLine.getMid();

  if (targetLines.length === 1) {
    const targetLine = targetLines[0];
    switch (targetLine.getRelativeLinePosition(mid)) {
      case RelativePoisition.LEFT:
        return AlignItems.FLEX_START;
      case RelativePoisition.RIGHT:
        return AlignItems.FLEX_END;
      case RelativePoisition.CONTAIN:
        const diff = targetLine.getSymetricDifference(mid);
        if (Math.abs(diff) / parentLine.getLength() <= 0.2) {
          return AlignItems.CENTER;
        }

        if (diff > 0) {
          return AlignItems.FLEX_END;
        }

        return AlignItems.FLEX_START;
    }
  }

  let numberOfItemsTippingLeft: number = 0;
  let numberOfItemsTippingLeftStrict: number = 0;
  let numberOfItemsTippingRight: number = 0;
  let numberOfItemsTippingRightStrict: number = 0;
  let numberOfItemsInTheMiddle: number = 0;
  let noGapItems: number = 0;

  for (const targetLine of targetLines) {
    switch (targetLine.getRelativeLinePosition(mid)) {
      case RelativePoisition.LEFT:
        numberOfItemsTippingLeft++;
        break;
      case RelativePoisition.RIGHT:
        numberOfItemsTippingRight++;
        break;
      case RelativePoisition.CONTAIN:
        const leftGap = Math.abs(parentLine.lower - targetLine.lower);
        const rightGap = Math.abs(parentLine.upper - targetLine.upper);

        let threshold: number = 0.15;
        if (parentLine.getLength() < 100) {
          threshold = 0.2;
        }

        if (
          leftGap / parentLine.getLength() <= 0.05 &&
          rightGap / parentLine.getLength() <= 0.05
        ) {
          noGapItems++;
          break;
        }

        if (leftGap / parentLine.getLength() <= 0.05) {
          numberOfItemsTippingLeft++;
          break;
        }

        if (rightGap / parentLine.getLength() <= 0.05) {
          numberOfItemsTippingRight++;
          break;
        }

        if (
          leftGap > rightGap &&
          (leftGap - rightGap) / parentLine.getLength() > threshold
        ) {
          numberOfItemsTippingRight++;
          break;
        }

        if (
          rightGap > leftGap &&
          (rightGap - leftGap) / parentLine.getLength() > threshold
        ) {
          numberOfItemsTippingLeft++;
          break;
        }

        numberOfItemsInTheMiddle++;
    }
  }

  if (noGapItems === targetLines.length) {
    for (const targetLine of targetLines) {
      const leftGap = Math.abs(parentLine.lower - targetLine.lower);
      const rightGap = Math.abs(parentLine.upper - targetLine.upper);
      if (leftGap > rightGap) {
        numberOfItemsTippingRightStrict++;
      }

      if (rightGap > leftGap) {
        numberOfItemsTippingLeftStrict++;
      }
    }
  }

  if (noGapItems !== 0 && numberOfItemsInTheMiddle === 0) {
    if (
      numberOfItemsTippingLeftStrict !== 0 &&
      numberOfItemsTippingRightStrict === 0
    ) {
      return AlignItems.FLEX_START;
    }

    if (
      numberOfItemsTippingRightStrict !== 0 &&
      numberOfItemsTippingLeftStrict === 0
    ) {
      return AlignItems.FLEX_END;
    }
  }

  if (noGapItems !== 0 && numberOfItemsInTheMiddle !== 0) {
    return AlignItems.CENTER;
  }

  if (numberOfItemsTippingLeft !== 0) {
    return AlignItems.FLEX_START;
  }

  if (numberOfItemsTippingRight !== 0) {
    return AlignItems.FLEX_END;
  }

  return AlignItems.CENTER;
};
