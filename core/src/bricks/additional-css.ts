import { isEmpty } from "../utils";
import { Attributes, BoxCoordinates } from "../design/adapter/node";
import {
  Direction,
  getOppositeDirection,
  reorderNodesBasedOnDirection,
  getDirection,
} from "./direction";
import { ImageNode, Node, NodeType, VisibleNode } from "./node";
import {
  getContainerLineFromNodes,
  getLinesFromNodes,
  getLineBasedOnDirection,
} from "./line";
import { filterCssValue } from "./util";
import { absolutePositioningAnnotation } from "./overlap";

export const selectBox = (
  node: Node,
  useBoundingBox: boolean = false
): BoxCoordinates => {
  if (node.getType() === NodeType.VISIBLE) {
    const visibleNode = node as VisibleNode;
    return visibleNode.getAbsBoundingBox();
  }

  if (node.getType() === NodeType.IMAGE) {
    const imageNode = node as ImageNode;
    return imageNode.getAbsBoundingBox();
  }

  if (useBoundingBox) {
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
export const addAdditionalCssAttributesToNodes = (node: Node) => {
  const children = node.getChildren();
  if (isEmpty(children)) {
    return;
  }

  const direction = getDirection(node.children);
  reorderNodesBasedOnDirection(node.children, direction);
  node.addCssAttributes(getAdditionalCssAttributes(node));
  node.addPositionalCssAttributes(getPositionalCssAttributes(node, direction));
  adjustChildrenHeightAndWidthCssValue(node);

  for (const child of children) {
    addAdditionalCssAttributesToNodes(child);
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

  const targetLine = getContainerLineFromNodes(node.getChildren(), direction);
  const parentLine = getContainerLineFromNodes([node], direction);

  const perpendicularTargetLine = getContainerLineFromNodes(
    node.getChildren(),
    getOppositeDirection(direction)
  );

  // const boundingBoxPerpendicularTargetLine = getContainerLineFromNodes(node.getChildren(), direction, true);
  const perpendicularParentLine = getContainerLineFromNodes(
    [node],
    getOppositeDirection(direction)
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

    const targetLine = getLineBasedOnDirection(targetNode, direction);
    const parentLine = getLineBasedOnDirection(parentNode, direction);
    const perpendicularTargetLine = getLineBasedOnDirection(
      targetNode,
      getOppositeDirection(direction)
    );
    const perpendicularParentLine = getLineBasedOnDirection(
      parentNode,
      getOppositeDirection(direction)
    );

    let prevTarget = children[i];
    if (i > 0) {
      prevTarget = children[i - 1];
    }
    const prevTargetLine = getLineBasedOnDirection(prevTarget, direction);

    let nextTarget = children[i];
    if (i < children.length - 1) {
      nextTarget = children[i + 1];
    }
    const nextTargetLine = getLineBasedOnDirection(nextTarget, direction);

    if (direction === Direction.HORIZONTAL) {
      botGap =
        i === children.length - 1
          ? parentLine.upper - targetLine.upper - paddingBot
          : nextTargetLine.lower - targetLine.upper;
      topGap =
        i === 0
          ? targetLine.lower - parentLine.lower - paddingTop
          : prevTargetLine.upper - targetLine.lower;

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
        "margin-top": `${marginTop}px`,
        "margin-bottom": `${marginBot}px`,
        "margin-right": `${marginRight}px`,
        "margin-left": `${marginLeft}px`,
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
      "margin-top": `${marginTop}px`,
      "margin-bottom": `${marginBot}px`,
      "margin-right": `${marginRight}px`,
      "margin-left": `${marginLeft}px`,
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

// getAdditionalCssAttributes gets additioanl css information of a node in relation to its children.
export const getAdditionalCssAttributes = (node: Node): Attributes => {
  const attributes: Attributes = {};

  if (
    (!isCssValueEmpty(node.getACssAttribute("border-radius")) ||
      !isCssValueEmpty(node.getACssAttribute("border-width"))) &&
    node.areThereOverflowingChildren()
  ) {
    attributes["overflow"] = "hidden";
  }

  return attributes;
};

const adjustChildrenHeightAndWidthCssValue = (node: Node) => {
  if (!isEmpty(node.getPositionalCssAttributes())) {
    const [maxWidth, maxHeight] = getAllowedMaxWidthAndHeight(node);

    const flexDir = node.getAPositionalAttribute("flex-direction");

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

        const renderingWidth = Math.abs(
          renderingBox.rightBot.x - renderingBox.leftTop.x
        );
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

          if (width > maxWidth) {
            attributes["width"] = `${renderingWidth}px`;
          }

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
      }
    }

    if (flexDir === "row") {
      for (const child of node.getChildren()) {
        const attributes: Attributes = {};

        let heightCssVal: string = child.getACssAttribute("height");
        let widthCssVal: string = child.getACssAttribute("width");
        const renderingBox = child.getAbsRenderingBox();
        const boundingBox = child.getAbsBoundingBox();

        const renderingHeight = Math.abs(
          renderingBox.rightBot.y - renderingBox.leftTop.y
        );
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
          if (height > maxHeight) {
            attributes["height"] = `${renderingHeight}px`;
          }

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
  if (positionalCssAttributes["display"]) {
    return positionalCssAttributes;
  }

  const attributes: Attributes = {};

  if (isEmpty(node.getChildren())) {
    return attributes;
  }

  if (node.hasAnnotation(absolutePositioningAnnotation)) {
    attributes["position"] = "relative";

    const currentBox = node.getAbsRenderingBox();
    for (const child of node.getChildren()) {
      const childAttributes: Attributes = {};
      const targetBox = child.getAbsRenderingBox();
      const top = Math.abs(currentBox.leftTop.y - targetBox.leftTop.y);
      const bottom = Math.abs(currentBox.rightBot.y - targetBox.rightBot.y);
      const left = Math.abs(currentBox.leftTop.x - targetBox.leftTop.x);
      const right = Math.abs(currentBox.rightBot.x - targetBox.rightBot.x);

      childAttributes["position"] = "absolute";
      childAttributes["top"] = `${top}px`;
      childAttributes["bottom"] = `${bottom}px`;
      childAttributes["right"] = `${right}px`;
      childAttributes["left"] = `${left}px`;

      child.addPositionalCssAttributes(childAttributes);
    }

    return attributes;
  }

  attributes["display"] = "flex";
  if (direction === Direction.HORIZONTAL) {
    attributes["flex-direction"] = "column";
  }

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

  return attributes;
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

  return JustifyContent.SPACE_BETWEEN;
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
  let numberOfItemsTippingRight: number = 0;
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
