import { Node } from "./bricks/node";

export const isEmpty = (value: any): boolean => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const traverseNodes = (
  node: Node,
  callback: (node: Node) => boolean
) => {
  const shouldContinue = callback(node);

  if (!shouldContinue) {
    return;
  }

  node.children.forEach((child) => {
    traverseNodes(child, callback);
  });
};
