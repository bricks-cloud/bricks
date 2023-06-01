import { Node, NodeType } from "./node";
import { Attributes } from "../design/adapter/node";
import { isEmpty } from "../utils";
import { cssStrToNum } from "../code/generator/util";
import {
  replacedParentAnnotation,
  replacedChildAnnotation,
} from "./annotation";

export const removeNode = (node: Node): Node => {
  const children: Node[] = node.getChildren();
  if (children.length === 1) {
    const child = children[0];

    if (haveSimlarWidthAndHeight(node, child)) {
      if (
        node.getType() === NodeType.IMAGE ||
        node.getType() === NodeType.VECTOR
      ) {
        const cssAttributes: Attributes = {
          ...node.getCssAttributes(),
          ...child.getCssAttributes(),
        };

        const positionalCssAttributes: Attributes = mergePositionalAttributes(
          node.getPositionalCssAttributes(),
          child.getPositionalCssAttributes()
        );

        node.setCssAttributes(cssAttributes);
        node.setPositionalCssAttributes(positionalCssAttributes);
        node.addAnnotations(replacedChildAnnotation, true);
        node.setChildren([]);

        return removeNode(node);
      }

      const cssAttributes: Attributes = {
        ...node.getCssAttributes(),
        ...child.getCssAttributes(),
      };

      const positionalCssAttributes: Attributes = mergePositionalAttributes(
        node.getPositionalCssAttributes(),
        child.getPositionalCssAttributes()
      );

      child.setCssAttributes(cssAttributes);
      child.setPositionalCssAttributes(positionalCssAttributes);
      child.addAnnotations(replacedParentAnnotation, true);

      return removeNode(child);
    }

    if (isNodeTransparent(node)) {
      child.addAnnotations(replacedParentAnnotation, true);
      return removeNode(child);
    }
  }

  return node;
};

export const removeChildrenNode = (node: Node): Node => {
  const children: Node[] = node.getChildren();
  let newChildren: Node[] = [];
  for (let i = 0; i < children.length; i++) {
    const child: Node = children[i];
    if (
      child.getType() === NodeType.IMAGE ||
      child.getType() === NodeType.VECTOR
    ) {
      newChildren.push(child);
      continue;
    }

    if (haveSimlarWidthAndHeight(node, child) && isEmpty(child.getChildren())) {
      const cssAttributes: Attributes = {
        ...node.getCssAttributes(),
        ...child.getCssAttributes(),
      };

      const positionalCssAttributes: Attributes = mergePositionalAttributes(
        node.getPositionalCssAttributes(),
        node.getPositionalCssAttributes()
      );

      node.setCssAttributes(cssAttributes);
      node.setPositionalCssAttributes(positionalCssAttributes);
      continue;
    }

    const newChildNode: Node = removeChildrenNode(child);
    newChildren.push(newChildNode);
  }

  node.setChildren(newChildren);
  return node;
};

const haveSimlarWidthAndHeight = (
  currentNode: Node,
  targetNode: Node
): boolean => {
  const currentWidth: string = currentNode.getACssAttribute("width");
  const targetWidth: string = targetNode.getACssAttribute("width");
  let similarWidth: boolean = false;

  if (isEmpty(currentWidth) || isEmpty(targetWidth)) {
    return false;
  }

  let diffInWidth: number = Math.abs(
    cssStrToNum(currentWidth) - cssStrToNum(targetWidth)
  );
  if (diffInWidth <= 1) {
    similarWidth = true;
  }

  const currentHeight: string = currentNode.getACssAttribute("height");
  const targetHeight: string = targetNode.getACssAttribute("height");

  if (isEmpty(currentHeight) || isEmpty(targetHeight)) {
    return false;
  }

  let similarHeight: boolean = false;
  let diffInHeight: number = Math.abs(
    cssStrToNum(currentHeight) - cssStrToNum(targetHeight)
  );
  if (diffInHeight <= 1) {
    similarHeight = true;
  }

  return similarHeight && similarWidth;
};

const isNodeTransparent = (node: Node): boolean => {
  if (
    node.getType() === NodeType.GROUP ||
    node.getType() === NodeType.VISIBLE
  ) {
    if (
      isEmpty(node.getACssAttribute("background-color")) &&
      isEmpty(node.getACssAttribute("background")) &&
      isEmpty(node.getACssAttribute("border-color"))
    ) {
      return true;
    }
  }

  return false;
};

const filterAttributes = (attribtues: Attributes): Attributes => {
  const result = {};

  Object.entries(attribtues).forEach(([key, value]) => {
    if (
      key === "flex-direction" ||
      key === "display" ||
      key === "justify-content" ||
      key === "align-items"
    ) {
      return;
    }

    result[key] = value;
  });

  return result;
};

const mergePositionalAttributes = (
  parentPosAttributes: Attributes,
  childPosAttributes: Attributes
): Attributes => {
  if (
    parentPosAttributes["display"] !== childPosAttributes["display"] ||
    parentPosAttributes["flex-direction"] !==
      childPosAttributes["flex-direction"] ||
    parentPosAttributes["align-items"] !== childPosAttributes["align-items"] ||
    parentPosAttributes["justify-content"] !==
      childPosAttributes["justify-content"]
  ) {
    return {
      ...filterAttributes(parentPosAttributes),
      ...childPosAttributes,
    };
  }

  return {
    ...parentPosAttributes,
    ...childPosAttributes,
  };
};

export const removeCompletelyOverlappingNodes = (
  node: Node,
  parentNode: Node
) => {
  if (isEmpty(node)) {
    return;
  }

  let children: Node[] = node.getChildren();
  if (children.length === 0) {
    return;
  }

  if (children.length > 1) {
    for (const child of children) {
      removeCompletelyOverlappingNodes(child, node);
    }

    return;
  }

  const child: Node = children[0];
  const pruned: Node = removeNode(node);
  if (pruned.getId() === node.getId()) {
    removeCompletelyOverlappingNodes(child, pruned);
    return;
  }

  if (isEmpty(parentNode)) {
    return;
  }

  const parentChildren = parentNode.getChildren();
  let nodeToReplace: number = 0;
  for (let i = 0; i < parentChildren.length; i++) {
    if (parentChildren[i].getId() === node.getId()) {
      nodeToReplace = i;
    }
  }

  parentChildren[nodeToReplace] = pruned;
  removeCompletelyOverlappingNodes(pruned, parentNode);
};
