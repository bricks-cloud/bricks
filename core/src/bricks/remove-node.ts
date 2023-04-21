import { Node, computePositionalRelationship, PostionalRelationship, NodeType } from "./node";
import { Attributes } from "../design/adapter/node";
import { isEmpty } from "../utils";

export const removeNode = (node: Node): Node => {
    const children: Node[] = node.getChildren();
    if (children.length === 1) {
      const child = children[0];
      if (child.getType() !== NodeType.VISIBLE && child.getType() !== NodeType.GROUP) {
        return node;
      }
  
      if (computePositionalRelationship(node.getAbsBoundingBox(), child.getAbsBoundingBox()) === PostionalRelationship.COMPLETE_OVERLAP) {
        const cssAttributes: Attributes = {
          ...node.getCssAttributes(),
          ...child.getCssAttributes(),
        };
  
        child.setCssAttributes(cssAttributes);
  
        return removeNode(child);
      }
    }
  
    return node;
  };
  
  
  export const removeCompletelyOverlappingNodes = (node: Node, parentNode: Node) => {
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
    parentNode.setChildren(parentChildren);
    removeCompletelyOverlappingNodes(pruned, parentNode);
  };
  