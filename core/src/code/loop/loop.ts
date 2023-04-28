
import uuid from "react-native-uuid";
import { Node, NodeType, TextNode } from "../../bricks/node";
import { isEmpty } from "../../utils";
import { Component, componentRegistryGlobalInstance, gatherPropsFromSimilarNodes, InstantiateComponentRegistryGlobalInstance, InstantiatePropRegistryGlobalInstance } from "./component";
import { instantiateFontsRegistryGlobalInstance } from "../generator/tailwindcss/fonts-registry";
import { optionRegistryGlobalInstance } from "../option-registry/option-registry";
import { UiFramework } from "../code";

export const vectorGroupAnnotation: string = "vectorGroup";
export const registerRepeatedComponents = (node: Node) => {
  instantiateFontsRegistryGlobalInstance(node);
  InstantiatePropRegistryGlobalInstance();
  InstantiateComponentRegistryGlobalInstance();
  InstantiateNameRegistryGlobalInstance();

  if (optionRegistryGlobalInstance.getOption().uiFramework === UiFramework.react) {
    annotateVectorGroupNodes(node);
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

  console.log("result: ", [result, bindings]);

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

    // console.log("node: ", node);
    // console.log("currentNode: ", currentNode);
    // console.log("modelNode: ", modelNode);

    const [result, reason]: [boolean, string] = areTwoNodesSimilar(currentNode, modelNode);

    // console.log("areTwoNodesSimilar(currentNode, modelNode): ", [result, reason]);
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

  // console.log("consecutiveNodes: ", consecutiveNodes);


  if (consecutiveNodes.length > 2) {
    if (!registerComponentForConsecutiveNodes(consecutiveNodes)) {
      return;
    }
  }

  return;
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
    // console.log("[result, reason]: ", [result, reason]);

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

type DataFieldToPropBinding = {
  fieldName: string,
  propName: string,
};

type DataArr = {
  id: string,
  name: string;
  fieldToPropBindings: DataFieldToPropBinding[];
  data: any[],
};

type IdToDataArrayMap = {
  [id: string]: DataArr;
};
export let nameRegistryGlobalInstance: NameRegistry;
export const InstantiateNameRegistryGlobalInstance = () => {
  nameRegistryGlobalInstance = new NameRegistry();
};

type IdToNameMap = {
  [id: string]: string,
};

class NameRegistry {
  idToNameMap: IdToNameMap;
  altIdToNameMap: IdToNameMap;
  numberOfSvgs: number;
  numberOfProps: number;
  numberOfDataArr: number;
  numberOfDataField: number;
  numberOfImages: number;
  numberOfComponents: number;

  constructor() {
    this.idToNameMap = {};
    this.altIdToNameMap = {};
    this.numberOfSvgs = 1;
    this.numberOfProps = 1;
    this.numberOfImages = 1;
    this.numberOfDataArr = 1;
    this.numberOfDataField = 1;
    this.numberOfComponents = 1;
  }

  setIdToName(id: string, name: string) {
    this.idToNameMap[id] = name;
  }

  getIdToNameMap(): IdToNameMap {
    return this.idToNameMap;
  }

  getAltIdToNameMap(): IdToNameMap {
    return this.altIdToNameMap;
  }

  getAltName(id: string): string {
    return this.altIdToNameMap[id];
  }

  getDataFieldName(): string {
    const name = "dataField" + this.numberOfDataField;
    this.numberOfDataField++;
    return name;
  }

  getComponentName(): string {
    const name = "Component" + this.numberOfComponents;
    this.numberOfComponents++;
    return name;
  }

  getNumberOfSvgs(): number {
    return this.numberOfSvgs;
  }

  getNumberOfImages(): number {
    return this.numberOfImages;
  }

  getDataArrName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (name) {
      return name;
    }

    name = "dataArr" + this.numberOfDataArr;
    this.idToNameMap[id] = name;
    this.numberOfDataArr++;
    return name;
  }

  getPropName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (name) {
      return name;
    }

    name = "prop" + this.numberOfProps;
    this.idToNameMap[id] = name;
    this.numberOfProps++;
    return name;
  }

  getVectorName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (name) {
      let name: string = this.idToNameMap[id];
      return name;
    }

    const altName: string = "Svg Asset " + this.numberOfSvgs;
    this.altIdToNameMap[id] = altName;

    name = "SvgAsset" + this.numberOfSvgs;
    this.idToNameMap[id] = name;
    this.numberOfSvgs++;
    return name;
  }

  getImageName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (name) {
      return name;
    }

    const altName: string = "Image Asset " + this.numberOfImages;
    this.altIdToNameMap[id] = altName;

    name = "ImageAsset" + this.numberOfImages;
    this.idToNameMap[id] = name;
    this.numberOfImages++;
    return name;
  }
}


export let dataArrRegistryGlobalInstance: DataArrRegistry;

export const InstantiateDataArrRegistryGlobalInstance = () => {
  dataArrRegistryGlobalInstance = new DataArrRegistry();
};

class DataArrRegistry {
  idToDataArrayMap: IdToDataArrayMap;

  constructor() {
    this.idToDataArrayMap = {};
  }

  getDataArray(id: string): DataArr {
    return this.idToDataArrayMap[id];
  }
}

export const extractDataFromRepeatedComponents = (nodes: Node[]): any => {
  return {};
};

export const generateProps = (propBindings: DataFieldToPropBinding[]): string => {
  let props: string = "";

  for (const binding of propBindings) {
    props += ` ${binding.propName}={${binding.fieldName}}`;
  }

  return props.trim();
};