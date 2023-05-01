import { Node } from "./bricks/node";

export const isEmpty = (value: any): boolean => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const traverseNodes = async (
  node: Node,
  callback: (node: Node) => Promise<boolean>
) => {
  const shouldContinue = await callback(node);

  if (!shouldContinue) {
    return;
  }

  await Promise.all(
    node.children.map((child) => traverseNodes(child, callback))
  );
};
