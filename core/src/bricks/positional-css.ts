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

export const selectBox = (node: Node): BoxCoordinates => {
  if (node.getType() === NodeType.VISIBLE) {
    const visibleNode = node as VisibleNode;
    return visibleNode.getAbsBoundingBox();
  }

  if (node.getType() === NodeType.IMAGE) {
    const imageNode = node as ImageNode;
    return imageNode.getAbsBoundingBox();
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

// addPositionalCSSAttributesToNodes adds positional css information to a node and its children.
export const addPositionalCSSAttributesToNodes = (node: Node) => {
  const children = node.getChildren();
  if (isEmpty(children)) {
    return;
  }

  if (node.getType() === NodeType.VECTOR_GROUP) {
    return;
  }

  const direction = getDirection(node.children);
  reorderNodesBasedOnDirection(node.children, direction);
  node.addPositionalCssAttributes(getPositionalCSSAttributes(node, direction));

  for (const child of children) {
    addPositionalCSSAttributesToNodes(child);
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

// getPositionalCSSAttributes gets positional css information of a node in relation to its children.
export const getPositionalCSSAttributes = (
  node: Node,
  direction: Direction
): Attributes => {
  const attributes: Attributes = {};

  if (isEmpty(node.getChildren())) {
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
