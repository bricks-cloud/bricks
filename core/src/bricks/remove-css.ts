import { cssStrToNum } from "../code/generator/util";
import { Attributes } from "../design/adapter/node";
import { isEmpty } from "../utils";
import { Node } from "./node";

// addAdditionalCssAttributesToNodes adds additional css information to a node and its children.
export const removeCssFromNode = (node: Node) => {
  if (isEmpty(node)) {
    return;
  }

  const children = node.getChildren();
  if (isEmpty(children)) {
    return;
  }

  const positionalAttributes: Attributes = node.getPositionalCssAttributes();
  let cssAttributes: Attributes = node.getCssAttributes();

  if (
    isEmpty(positionalAttributes["position"]) &&
    positionalAttributes["justify-content"] !== "space-between" &&
    !isEmpty(cssAttributes["width"])
  ) {
    const actualChildrenWidth: number = calculateActualChildrenWidth(positionalAttributes, children);
    const width: number = cssStrToNum(cssAttributes["width"]);

    if (
      Math.abs(actualChildrenWidth - width) <= 5 &&
      isEmpty(positionalAttributes["position"])
    ) {
      delete cssAttributes["width"];
    }
  }

  for (const child of children) {
    const childAttributes: Attributes = child.getCssAttributes();
    if (
      isEmpty(positionalAttributes["position"]) &&
      positionalAttributes["justify-content"] !== "space-between"
    ) {
      if (
        !isEmpty(childAttributes["width"]) &&
        !isEmpty(cssAttributes["width"]) &&
        childAttributes["width"] === cssAttributes["width"]
      ) {
        delete cssAttributes["width"];
      }

      if (
        !isEmpty(childAttributes["height"]) &&
        !isEmpty(cssAttributes["height"]) &&
        childAttributes["height"] === cssAttributes["height"]
      ) {
        delete cssAttributes["height"];
      }
    }

    removeCssFromNode(child);
  }

  node.setCssAttributes(cssAttributes);
  node.setPositionalCssAttributes(positionalAttributes);
};

const calculateActualChildrenWidth = (positionalAttributes: Attributes, children: Node[]): number => {
  let paddingCum: number = 0;
  let gapCum: number = 0;
  let widthCum: number = 0;

  paddingCum += cssStrToNum(positionalAttributes["padding-left"]);
  paddingCum += cssStrToNum(positionalAttributes["padding-right"]);

  if (positionalAttributes["gap"]) {
    gapCum += cssStrToNum(positionalAttributes["gap"]) * children.length - 1;
  }

  for (let i = 0; i < children.length; i++) {
    const child: Node = children[i];
    const childAttributes: Attributes = child.getCssAttributes();
    const childPositionalAttributes: Attributes =
      child.getPositionalCssAttributes();

    if (childAttributes["width"]) {
      widthCum += cssStrToNum(childAttributes["width"]);
    } else if (childAttributes["min-width"]) {
      widthCum += cssStrToNum(childAttributes["min-width"]);
    }

    if (isEmpty(positionalAttributes["gap"])) {
      if (childPositionalAttributes["margin-left"]) {
        gapCum += cssStrToNum(childPositionalAttributes["margin-left"]);
      }

      if (childPositionalAttributes["margin-right"]) {
        gapCum += cssStrToNum(childPositionalAttributes["margin-right"]);
      }
    }
  }

  return paddingCum + gapCum + widthCum;
};
