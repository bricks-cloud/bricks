
import uuid from "react-native-uuid";
import { Node, NodeType, TextNode } from "../../src/bricks/node";
import { isEmpty } from "../../src/utils";
import { Component, gatherPropsFromSimilarNodes } from "./component";
import { componentRegistryGlobalInstance } from "./component-registry";
import { optionRegistryGlobalInstance } from "../../src/code/option-registry/option-registry";
import { UiFramework } from "../../src/code/code";

export const vectorGroupAnnotation: string = "vectorGroup";
export const registerRepeatedComponents = (node: Node) => {
  if (optionRegistryGlobalInstance.getOption().uiFramework === UiFramework.react) {
    annotateVectorGroupNodes(node);
    registerComponentFromNodes(node);
  }
};

export const detectWhetherSimilarNodesExist = (node: Node): boolean => {
  if (optionRegistryGlobalInstance.getOption().uiFramework === UiFramework.react) {
    annotateVectorGroupNodes(node);
    return doSimilarNodesExist(node);
  }

  return false;
};

export const registerComponentFromNodes = (node: Node) => {
  if (node.getType() === NodeType.VECTOR_GROUP) {
    return;
  }

  registerComponentFromSimilarChildrenNodes(node);
  const children: Node[] = node.getChildren();

  for (const child of children) {
    if (!isEmpty(componentRegistryGlobalInstance.getComponentByNodeId(child.getId()))) {
      return;
    }

    registerComponentFromNodes(child);
  }
};

export const doSimilarNodesExist = (node: Node): boolean => {
  if (node.getType() === NodeType.VECTOR_GROUP) {
    return false;
  }

  const result: boolean = areChildrenSimilarNodes(node);
  if (result) {
    return result;
  }

  const children: Node[] = node.getChildren();
  for (const child of children) {
    if(doSimilarNodesExist(child)) {
      return true;
    };
  }

  return false;
};

export const annotateVectorGroupNodes = (node: Node): boolean => {
  if (node.getType() === NodeType.TEXT || node.getType() === NodeType.IMAGE) {
    return false;
  }

  if (node.getType() === NodeType.VECTOR_GROUP) {
    return true;
  }

  let result: boolean = true;
  const children: Node[] = node.getChildren();
  for (const child of children) {
    const childResult: boolean = annotateVectorGroupNodes(child);
    if (childResult) {
      child.addAnnotations(vectorGroupAnnotation, true);
    }

    result = result && childResult;
  }

  if (result) {
    node.addAnnotations(vectorGroupAnnotation, true);
  }

  return result;
};

const registerComponentForConsecutiveNodes = (nodes: Node[]): boolean => {
  const component: Component = new Component();

  const instanceIds: string[] = nodes.map((node) => {
    const instanceId: string = uuid.v1() as string;

    component.addIdtoInstanceIdMapping(node.getId(), instanceId);

    return instanceId;
  });

  const [result, bindings] = gatherPropsFromSimilarNodes(nodes, instanceIds);

  if (!result) {
    return false;
  }

  component.setBindings(bindings);
  for (const node of nodes) {
    componentRegistryGlobalInstance.addNodeIdToComponentMapping(node.getId(), component);
  }

  componentRegistryGlobalInstance.registerComponent(component);
  return true;
};

export const registerComponentFromSimilarChildrenNodes = (node: Node) => {
  const children = node.getChildren();
  if (children.length === 0) {
    return;
  }

  if (children.length === 1) {
    return;
  }

  let modelNode: Node = children[0];
  const consecutiveNodeIds: Set<string> = new Set<string>();
  let consecutiveNodes: Node[] = [];
  for (let i = 0; i < children.length; i++) {
    const currentNode = children[i];
    if (currentNode.getId() === modelNode.getId()) {
      continue;
    }

    const [result, _]: [boolean, string] = areTwoNodesSimilar(currentNode, modelNode);

    if (!result) {

      modelNode = currentNode;

      if (consecutiveNodes.length > 2) {
        if (!registerComponentForConsecutiveNodes(consecutiveNodes)) {
          return;
        }
      }

      consecutiveNodes = [];
      continue;
    }

    if (!consecutiveNodeIds.has(modelNode.getId())) {
      consecutiveNodeIds.add(modelNode.getId());
      consecutiveNodes.push(modelNode);
    }

    consecutiveNodeIds.add(currentNode.getId());
    consecutiveNodes.push(currentNode);
  }

  if (consecutiveNodes.length > 2) {
    if (!registerComponentForConsecutiveNodes(consecutiveNodes)) {
      return;
    }
  }

  return;
};

export const areChildrenSimilarNodes = (node: Node): boolean => {
  const children = node.getChildren();
  if (children.length === 0) {
    return false;
  }

  if (children.length === 1) {
    return false;
  }

  let modelNode: Node = children[0];
  const consecutiveNodeIds: Set<string> = new Set<string>();
  let consecutiveNodes: Node[] = [];
  for (let i = 0; i < children.length; i++) {
    const currentNode = children[i];
    if (currentNode.getId() === modelNode.getId()) {
      continue;
    }

    const [result, _]: [boolean, string] = areTwoNodesSimilar(currentNode, modelNode);

    if (!result) {

      modelNode = currentNode;

      if (consecutiveNodes.length > 2) {
        if (registerComponentForConsecutiveNodes(consecutiveNodes)) {
          return true;
        }
      }

      consecutiveNodes = [];
      continue;
    }

    if (!consecutiveNodeIds.has(modelNode.getId())) {
      consecutiveNodeIds.add(modelNode.getId());
      consecutiveNodes.push(modelNode);
    }

    consecutiveNodeIds.add(currentNode.getId());
    consecutiveNodes.push(currentNode);
  }

  if (consecutiveNodes.length > 2) {
    if (registerComponentForConsecutiveNodes(consecutiveNodes)) {
      return true;
    }
  }

  return false;
};

export const areAllNodesSimilar = (nodes: Node[]): boolean => {
  if (nodes.length < 2) {
    return false;
  }

  const prevNode: Node = nodes[0];
  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) {
      continue;
    }

    const [result, _]: [boolean, string] = areTwoNodesSimilar(prevNode, nodes[i]);

    if (!result) {
      return false;
    }
  }

  return true;
};

const areTwoNodesSimilar = (currentNode: Node, targetNode: Node): [boolean, string] => {
  if (currentNode.getACssAttribute("display") !== targetNode.getACssAttribute("display")) {
    return [false, "display not the same"];
  }

  if (currentNode.getACssAttribute("flex-direction") !== targetNode.getACssAttribute("flex-direction")) {
    return [false, "flex direction not the same"];
  }

  if (currentNode.getACssAttribute("justify-content") !== targetNode.getACssAttribute("justify-content")) {
    return [false, "justify content not the same"];
  }

  if (currentNode.getACssAttribute("align-items") !== targetNode.getACssAttribute("align-items")) {
    return [false, "align-items not the same"];
  }

  const currentChildren = currentNode.getChildren();
  const targetChildren = targetNode.getChildren();

  if (currentNode.hasAnnotation(vectorGroupAnnotation)) {
    return [targetNode.hasAnnotation(vectorGroupAnnotation), "both are vector groups"];
  }


  const [result, reason]: [boolean, string] = doTwoNodesHaveTheSameType(currentNode, targetNode);
  if (!result) {
    return [false, reason];
  }

  if (currentChildren.length !== targetChildren.length) {
    return [false, "children length are not the same"];
  }

  for (let i = 0; i < currentChildren.length; i++) {
    const currentNode = currentChildren[i];
    const targetNode = targetChildren[i];

    const [result, reason]: [boolean, string] = doTwoNodesHaveTheSameType(currentNode, targetNode);
    if (!result) {
      return [false, "children nodes do not have the same type: " + reason];
    }
  }

  const [currentWidth, currentHeight] = currentNode.getAbsBoundingBoxWidthAndHeights();
  const [targetWidth, taregtHeight] = currentNode.getAbsBoundingBoxWidthAndHeights();

  if (currentWidth === targetWidth) {
    return [true, "similar widths"];
  }

  if (currentHeight === taregtHeight) {
    return [true, "similar heights"];
  }

  return [true, "passes all the checks"];
};

const doTwoNodesHaveTheSameType = (currentNode: Node, targetNode: Node): [boolean, string] => {
  if (currentNode.getType() === NodeType.TEXT) {
    if (targetNode.getType() !== NodeType.TEXT) {
      return [false, "text node type mismatch"];
    }
    return detectTextNodeSimilarities(currentNode as TextNode, targetNode as TextNode);
  }

  if (currentNode.getType() === NodeType.IMAGE) {
    if (currentNode.getType() === targetNode.getType()) {
      return [true, "both are image types"];
    }
    return [false, "image types mismatch"];
  }

  return [true, "similar types"];
};


const isVectorGroup = (node: Node): boolean => {
  if (node.getType() === NodeType.VECTOR_GROUP) {
    return true;
  }

  if (node.getType() === NodeType.TEXT || node.getType() === NodeType.IMAGE) {
    return false;
  }

  let result: boolean = true;
  for (const child of node.getChildren()) {
    if (child.getType() === NodeType.TEXT || child.getType() === NodeType.IMAGE) {
      return false;
    }

    result = isVectorGroup(child) && result;
  }

  return result;
};

const detectTextNodeSimilarities = (currentNode: TextNode, targetNode: TextNode): [boolean, string] => {
  if (currentNode.getACssAttribute("font-family") !== targetNode.getACssAttribute("font-family")) {
    return [false, "font family not the same"];
  }

  if (currentNode.getACssAttribute("font-size") !== targetNode.getACssAttribute("font-size")) {
    return [false, "font size not the same"];
  }

  return [true, "similar text nodes"];;
};

export const extractDataFromRepeatedComponents = (nodes: Node[]): any => {
  return {};
};