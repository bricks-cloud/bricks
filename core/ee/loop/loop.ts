
import { Node, NodeType, TextNode } from "../../src/bricks/node";
import { createId, isEmpty } from "../../src/utils";
import { Component, gatherPropsFromSimilarNodes } from "./component";
import { componentRegistryGlobalInstance } from "./component-registry";
import { optionRegistryGlobalInstance } from "../../src/code/option-registry/option-registry";
import { UiFramework } from "../../src/code/code";
import { replacedParentAnnotation } from "../../src/bricks/annotation";
import { StyledTextSegment } from "../../src/design/adapter/node";

export const registerRepeatedComponents = (node: Node) => {
  if (optionRegistryGlobalInstance.getOption().uiFramework === UiFramework.react) {
    registerComponentFromNodes(node);
  }
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


const registerComponentForConsecutiveNodes = (nodes: Node[]): boolean => {
  const component: Component = new Component();

  const instanceIds: string[] = nodes.map((node) => {
    const instanceId: string = createId();
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

const checkWhetherTwoNodesAreSimilarAccountingForRemovedNodes = (currentNode: Node, modelNode: Node): [boolean, string, Node[]] => {
  let [result, reason]: [boolean, string] = areTwoNodesSimilar(currentNode, modelNode);

  const modelNodeChildren: Node[] = modelNode.getChildren();
  const currentNodeChildren: Node[] = currentNode.getChildren();

  if (currentNode.hasAnnotation(replacedParentAnnotation) && modelNode.hasAnnotation(replacedParentAnnotation) && modelNodeChildren.length === 1 && currentNodeChildren.length === 1) {
    const [altResult, altReason] = areTwoNodesSimilar(currentNodeChildren[0], modelNodeChildren[0]);
    if (altResult) {
      return [altResult, altReason, [modelNodeChildren[0], currentNodeChildren[0]]];
    }
  }


  if (!result && currentNode.hasAnnotation(replacedParentAnnotation) && modelNodeChildren.length === 1) {
    const [altResult, altReason] = areTwoNodesSimilar(currentNode, modelNodeChildren[0]);
    if (altResult) {
      return [altResult, altReason, [modelNodeChildren[0], currentNode]];
    }
  }

  if (!result && modelNode.hasAnnotation(replacedParentAnnotation) && currentNodeChildren.length === 1) {
    const [altResult, altReason] = areTwoNodesSimilar(currentNodeChildren[0], modelNode);
    if (altResult) {
      return [altResult, altReason, [modelNode, currentNodeChildren[0]]];
    }
  }

  return [result, reason, [modelNode, currentNode]];
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

    const [result, _]: [boolean, string, Node[]] = checkWhetherTwoNodesAreSimilarAccountingForRemovedNodes(currentNode, modelNode);

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

export const areAllNodesSimilar = (nodes: Node[]): [boolean, Node[]] => {
  if (nodes.length < 2) {
    return [false, []];
  }

  const prevNode: Node = nodes[0];
  let firstPassFailed: boolean = false;

  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) {
      continue;
    }

    const [result, _]: [boolean, string] = areTwoNodesSimilar(prevNode, nodes[i]);

    if (!result) {
      firstPassFailed = true;
      break;
    }
  }

  if (!firstPassFailed) {
    return [true, nodes];
  }

  let similarNodes: Node[] = [];
  const id: Set<string> = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) {
      continue;
    }

    const [result, _, [modelNode, currentNode]]: [boolean, string, Node[]] = checkWhetherTwoNodesAreSimilarAccountingForRemovedNodes(prevNode, nodes[i]);

    if (!result) {
      return [false, []];
    }

    if (!id.has(modelNode.getId())) {
      id.add(modelNode.getId());
      similarNodes.push(modelNode);
    }

    if (!id.has(currentNode.getId())) {
      id.add(currentNode.getId());
      similarNodes.push(currentNode);
    }
  }

  return [true, similarNodes];
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

  if (currentNode.getType() === NodeType.VECTOR) {
    return [targetNode.getType() === NodeType.VECTOR, "both nodes are vectors"];
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

  const [currentWidth, currentHeight] = currentNode.getAbsBoundingBoxWidthAndHeight();
  const [targetWidth, taregtHeight] = currentNode.getAbsBoundingBoxWidthAndHeight();

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
  let largestTargetFontSize: number = -Infinity;
  let largestCurrentFontSize: number = -Infinity;

  const targetSegments: StyledTextSegment[] = targetNode.getStyledTextSegments();
  const currentSegments: StyledTextSegment[] = currentNode.getStyledTextSegments();
  const targetFontFamilies: Set<string> = new Set<string>();

  if (targetSegments.length !== currentSegments.length) {
    return [false, "styled segments not the same"];
  }

  for (const targetSegment of targetSegments) {
    if (targetSegment.fontSize > largestTargetFontSize) {
      largestTargetFontSize = targetSegment.fontSize;
    };
    targetFontFamilies.add(targetSegment.fontFamily);
  }

  for (const currentSegment of currentSegments) {
    if (currentSegment.fontSize > largestCurrentFontSize) {
      largestCurrentFontSize = currentSegment.fontSize;
      if (!targetFontFamilies.has(currentSegment.fontFamily)) {
        return [false, "font families not the same"];
      }
    };
  }

  if (largestCurrentFontSize > largestTargetFontSize + 4 || largestCurrentFontSize < largestTargetFontSize - 4) {
    return [false, "font sizes are not similar"];;
  }

  return [true, "similar text nodes"];;
};

export const extractDataFromRepeatedComponents = (nodes: Node[]): any => {
  return {};
};