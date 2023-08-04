import { Node, NodeType, TextNode } from "../../src/bricks/node";
import { isEmpty } from "../../src/utils";
import { CssFramework } from "../../src/code/code";
import { getTwcssClass } from "../../src/code/generator/tailwindcss/css-to-twcss";
import { optionRegistryGlobalInstance } from "../../src/code/option-registry/option-registry";
import { areAllNodesSimilar } from "./loop";
import { nameRegistryGlobalInstance } from "../../src/code/name-registry/name-registry";
import { IdToPropBindingMap, propRegistryGlobalInstance } from "./prop-registry";
import uuid from "react-native-uuid";
import { shouldUseAsBackgroundImage } from "../../src/bricks/util";

type PropLocation = {
  type: string;
  cssKey?: string;
  cssValue?: string;
  twcssClass?: string,
};

export type PropToPropBinding = {
  prop: string,
  dataType: DataType,
  fieldName: string,
  dataValue?: string,
  conditionalValue?: string,
  defaultValue?: string,
  twcssClassIndex?: number,
  locations: PropLocation[],
};

type DataFieldToPropBinding = {
  fieldName: string,
  dataType: DataType,
  propName: string,
};

type IdToInstanceIdMapping = {
  [nodeId: string]: string;
};

export type DataArr = {
  id: string,
  name: string;
  fieldToPropBindings: DataFieldToPropBinding[];
  data: any[],
};

export enum DataType {
  boolean = "BOOLEAN",
  string = "STRING",
}

const findNumberOfDifferentValues = (bindings: PropValueBinding[]): number => {
  const existingValue: Set<string> = new Set<string>();
  for (const binding of bindings) {
    if (!existingValue.has(binding.value)) {
      existingValue.add(binding.value);
    }
  }

  return existingValue.size;
};

export type Data = {
  [fieldName: string]: string,
};

type IdToDataMapping = {
  [id: string]: Data,
};


const getDefaultValue = (bindings: PropValueBinding[]): string[] => {
  if (isEmpty(bindings)) {
    return ["", ""];
  }

  let firstValue: string = "";

  for (const binding of bindings) {
    if (!isEmpty(firstValue) && firstValue !== binding.value) {
      return [firstValue, binding.value];
    }

    firstValue = binding.value;
  }

  return [firstValue, ""];
};

const getValue = (value: string, defaultValue: string): any => {
  if (isEmpty(defaultValue)) {
    return value;
  }

  return value === defaultValue ? true : false;
};

export class Component {
  id: string;
  bindings: ComponentProperties;
  twcssBindings: ComponentProperties;
  name: string;
  propNames: string[];
  dataArr: DataArr;
  idToPropBindings: IdToPropBindingMap;
  instanceIdToPropBindings: IdToPropBindingMap;
  instanceIdToDataBindings: IdToDataMapping;
  instanceIdToTailwindDataBindings: IdToDataMapping;
  idToInstanceIdMapping: IdToInstanceIdMapping;

  constructor() {
    this.id = uuid.v1() as string;
    this.propNames = [];
    this.instanceIdToDataBindings = {};
    this.idToPropBindings = {};
    this.idToInstanceIdMapping = {};
    this.instanceIdToPropBindings = {};
    this.instanceIdToTailwindDataBindings = {};
    this.name = nameRegistryGlobalInstance.getComponentName();
  }

  getDataArr(): DataArr {
    return this.dataArr;
  }

  addIdtoInstanceIdMapping(nodeId: string, instanceId: string) {
    this.idToInstanceIdMapping[nodeId] = instanceId;
  }

  getData(nodes: Node[]): Data[] {
    let data: Data[] = [];

    for (const node of nodes) {
      const instanceId: string = this.idToInstanceIdMapping[node.getId()];
      data.push(this.instanceIdToDataBindings[instanceId]);
    }

    return data;
  };

  getPropToPropBindingByNodeId(nodeId: string): PropToPropBinding[] {
    return this.idToPropBindings[nodeId];
  }

  setBindings(bindings: ComponentProperties) {
    if (optionRegistryGlobalInstance.getOption().cssFramework === CssFramework.tailwindcss) {
      this.setBindingsForTailwindCss(bindings);
      return;
    }

    this.setBindingsForCss(bindings);
  }

  setBindingsForTailwindCss(bindings: ComponentProperties) {
    this.bindings = bindings;

    const dataArrId = uuid.v1() as string;
    const dataArr: DataArr = {
      id: dataArrId,
      name: nameRegistryGlobalInstance.getDataArrName(dataArrId),
      fieldToPropBindings: [],
      data: [],
    };

    Object.values(bindings).forEach((binding) => {

      this.propNames.push(binding.name);

      const numberOfDifferentValues: number = findNumberOfDifferentValues(binding.bindings);
      let dataType: DataType = numberOfDifferentValues > 2 ? DataType.string : DataType.boolean;


      const fieldName: string = nameRegistryGlobalInstance.getDataFieldName();
      dataArr.fieldToPropBindings.push({
        fieldName,
        dataType,
        propName: binding.name,
      });

      let defaultValue: any = "";
      let conditionalValue: any = "";
      if (dataType === DataType.boolean) {
        [defaultValue, conditionalValue] = getDefaultValue(binding.bindings);
      }

      for (const propValueBinding of binding.bindings) {
        const nodeIdPropBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(propValueBinding.nodeId);
        let value: string = propValueBinding.value;

        const propToPropBinding: PropToPropBinding = {
          prop: binding.name,
          fieldName,
          dataType,
          defaultValue,
          twcssClassIndex: binding.twcssClassIndex,
          conditionalValue,
          dataValue: getValue(value, defaultValue),
          locations: [{
            type: propValueBinding.type,
            cssKey: binding.cssKey,
            twcssClass: value,
          }],
        };

        if (isEmpty(nodeIdPropBindings)) {
          propRegistryGlobalInstance.addPropToPropBinding(propValueBinding.nodeId, [propToPropBinding]);
          continue;
        }

        nodeIdPropBindings.push(propToPropBinding);
      }

      for (const propValueBinding of binding.bindings) {
        const instanceIdPropBindings: PropToPropBinding[] = this.instanceIdToPropBindings[propValueBinding.instanceId];
        this.addIdtoInstanceIdMapping(propValueBinding.nodeId, propValueBinding.instanceId);

        let value: string = propValueBinding.value;
        const propToPropBinding: PropToPropBinding = {
          prop: binding.name,
          fieldName,
          dataType,
          defaultValue,
          twcssClassIndex: binding.twcssClassIndex,
          conditionalValue,
          dataValue: getValue(value, defaultValue),
          locations: [{
            type: propValueBinding.type,
            cssKey: binding.cssKey,
            twcssClass: value,
          }],
        };

        if (isEmpty(instanceIdPropBindings)) {
          this.instanceIdToPropBindings[propValueBinding.instanceId] = [propToPropBinding];
          continue;
        }

        instanceIdPropBindings.push(propToPropBinding);
      }
    });

    Object.entries(this.instanceIdToPropBindings).forEach(([instanceId, propToPropBindings]) => {
      let data: Data = this.instanceIdToDataBindings[instanceId];

      if (isEmpty(data)) {
        data = {};
        this.instanceIdToDataBindings[instanceId] = data;
      }

      for (const propToPropBinding of propToPropBindings) {
        data[propToPropBinding.fieldName] = propToPropBinding.dataValue;
      }
    });


    this.dataArr = dataArr;
  }

  setBindingsForCss(bindings: ComponentProperties) {
    this.bindings = bindings;

    const dataArrId = uuid.v1() as string;
    const dataArr: DataArr = {
      id: dataArrId,
      name: nameRegistryGlobalInstance.getDataArrName(dataArrId),
      fieldToPropBindings: [],
      data: [],
    };

    Object.values(bindings).forEach((binding) => {

      this.propNames.push(binding.name);

      const numberOfDifferentValues: number = findNumberOfDifferentValues(binding.bindings);
      let dataType: DataType = numberOfDifferentValues > 2 ? DataType.string : DataType.boolean;

      const fieldName: string = nameRegistryGlobalInstance.getDataFieldName();
      dataArr.fieldToPropBindings.push({
        fieldName,
        dataType,
        propName: binding.name,
      });

      let defaultValue: any = "";
      let conditionalValue: any = "";
      if (dataType === DataType.boolean) {
        [defaultValue, conditionalValue] = getDefaultValue(binding.bindings);
      }

      for (const propValueBinding of binding.bindings) {
        const nodeIdPropBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(propValueBinding.nodeId);

        const propToPropBinding: PropToPropBinding = {
          prop: binding.name,
          fieldName,
          dataType,
          defaultValue,
          conditionalValue,
          dataValue: getValue(propValueBinding.value, defaultValue),
          locations: [{
            type: propValueBinding.type,
            cssKey: binding.cssKey,
            cssValue: propValueBinding.value,
          }],
        };

        if (isEmpty(nodeIdPropBindings)) {
          propRegistryGlobalInstance.addPropToPropBinding(propValueBinding.nodeId, [propToPropBinding]);
          continue;
        }

        nodeIdPropBindings.push(propToPropBinding);
      }

      for (const propValueBinding of binding.bindings) {
        const instanceIdPropBindings: PropToPropBinding[] = this.instanceIdToPropBindings[propValueBinding.instanceId];
        this.addIdtoInstanceIdMapping(propValueBinding.nodeId, propValueBinding.instanceId);

        const propToPropBinding: PropToPropBinding = {
          prop: binding.name,
          fieldName,
          dataType,
          defaultValue,
          conditionalValue,
          dataValue: getValue(propValueBinding.value, defaultValue),
          locations: [{
            type: propValueBinding.type,
            cssKey: binding.cssKey,
            cssValue: propValueBinding.value,
          }],
        };

        if (isEmpty(instanceIdPropBindings)) {
          this.instanceIdToPropBindings[propValueBinding.instanceId] = [propToPropBinding];
          continue;
        }

        instanceIdPropBindings.push(propToPropBinding);
      }
    });

    Object.entries(this.instanceIdToPropBindings).forEach(([instanceId, propToPropBindings]) => {
      let data: Data = this.instanceIdToDataBindings[instanceId];

      if (isEmpty(data)) {
        data = {};
        this.instanceIdToDataBindings[instanceId] = data;
      }

      for (const propToPropBinding of propToPropBindings) {
        data[propToPropBinding.fieldName] = propToPropBinding.dataValue;
      }
    });


    this.dataArr = dataArr;
  }

  setName(name: string) {
    this.name = name;
  }

  getPropNames(): string[] {
    return this.propNames;
  }

  getName(): string {
    return this.name;
  }
}

export type ComponentProperties = {
  [property: string]: Property,
};

type Property = {
  type: string,
  id: string,
  name: string,
  cssKey?: string,
  twcssClassIndex?: number,
  bindings: PropValueBinding[],
};

type PropValueBinding = {
  nodeId: string,
  type: string,
  instanceId: string,
  value: string,
};

export const gatherPropsFromSimilarNodes = (nodes: Node[], instanceIds: string[]): [boolean, ComponentProperties] => {
  if (nodes.length < 2) {
    return [false, {}];
  }

  const [result, similarNodes] = areAllNodesSimilar(nodes);
  if (!result) {
    return [false, {}];
  }

  const cssProps: ComponentProperties = optionRegistryGlobalInstance.getOption().cssFramework === CssFramework.tailwindcss ? gatherTwcssPropsFromNodes(similarNodes, instanceIds) : gatherCssPropsFromNodes(similarNodes, instanceIds);
  let componentProps: ComponentProperties = {
    ...gatherPropsFromImageNodes(similarNodes, instanceIds),
    ...gatherPropsFromVectorNodes(similarNodes, instanceIds),
    ...gatherTextPropsFromNodes(similarNodes, instanceIds),
    ...cssProps,
  };

  let children: Node[] = similarNodes[0].getChildren();
  if (isEmpty(children)) {
    return [true, componentProps];
  }

  for (let i = 0; i < children.length; i++) {
    let similarChildrenNodes: Node[] = [];
    for (const targetNode of similarNodes) {
      const targetChildren: Node[] = targetNode.getChildren();
      similarChildrenNodes.push(targetChildren[i]);
    }

    const [result, targetProps] = gatherPropsFromSimilarNodes(similarChildrenNodes, instanceIds);
    if (!result) {
      return [result, {}];
    }

    componentProps = {
      ...componentProps,
      ...targetProps,
    };
  }

  return [true, componentProps];
};


export const gatherPropsFromVectorNodes = (nodes: Node[], instanceIds: string[]): ComponentProperties => {
  const properties: ComponentProperties = {};
  if (nodes.length === 0) {
    return properties;
  }

  for (const node of nodes) {
    if (node.getType() !== NodeType.VECTOR || shouldUseAsBackgroundImage(node)) {
      return properties;
    }
  }

  const id: string = uuid.v1() as string;
  const prop: Property = {
    type: "src",
    name: nameRegistryGlobalInstance.getPropName(id),
    id,
    bindings: [],
  };

  const altId: string = uuid.v1() as string;
  const altProp: Property = {
    type: "alt",
    name: nameRegistryGlobalInstance.getPropName(altId),
    id: altId,
    bindings: [],
  };


  properties[prop.id] = prop;
  properties[altProp.id] = altProp;

  for (let i = 0; i < nodes.length; i++) {
    const node: Node = nodes[i];
    const nodeId: string = node.getId();
    const instanceId: string = instanceIds[i];

    properties[prop.id].bindings.push({
      nodeId,
      type: "src",
      instanceId,
      value: "./assets/" + nameRegistryGlobalInstance.getVectorName(nodeId) + ".svg",
    });

    properties[altProp.id].bindings.push({
      nodeId,
      type: "alt",
      instanceId,
      value: nameRegistryGlobalInstance.getAltName(nodeId),
    });
  }

  return properties;
};


export const gatherPropsFromImageNodes = (nodes: Node[], instanceIds: string[]): ComponentProperties => {
  const properties: ComponentProperties = {};
  if (nodes.length === 0) {
    return properties;
  }

  for (const node of nodes) {
    if (node.getType() !== NodeType.IMAGE || shouldUseAsBackgroundImage(node)) {
      return properties;
    }
  }

  const id: string = uuid.v1() as string;
  const prop: Property = {
    type: "src",
    name: nameRegistryGlobalInstance.getPropName(id),
    id,
    bindings: [],
  };

  const altId: string = uuid.v1() as string;
  const altProp: Property = {
    type: "alt",
    name: nameRegistryGlobalInstance.getPropName(altId),
    id: altId,
    bindings: [],
  };

  properties[prop.id] = prop;
  properties[altProp.id] = altProp;

  for (let i = 0; i < nodes.length; i++) {
    const node: Node = nodes[i];
    const nodeId: string = node.getId();
    const instanceId: string = instanceIds[i];

    properties[prop.id].bindings.push({
      nodeId,
      type: "src",
      instanceId,
      value: "./assets/" + nameRegistryGlobalInstance.getImageName(nodeId) + ".png",
    });

    properties[altProp.id].bindings.push({
      nodeId,
      type: "alt",
      instanceId,
      value: nameRegistryGlobalInstance.getAltName(nodeId),
    });
  }

  return properties;
};

export const gatherTextPropsFromNodes = (nodes: Node[], instanceIds: string[]): ComponentProperties => {
  const properties: ComponentProperties = {};
  if (nodes.length === 0) {
    return properties;
  }

  for (const node of nodes) {
    if (node.getType() !== NodeType.TEXT) {
      return properties;
    }
  }

  const id: string = uuid.v1() as string;
  const prop: Property = {
    type: "text",
    name: nameRegistryGlobalInstance.getPropName(id),
    id,
    bindings: [],
  };

  properties[id] = prop;

  for (let i = 0; i < nodes.length; i++) {
    const node: Node = nodes[i];
    const instanceId: string = instanceIds[i];
    const textNode = node as TextNode;
    properties[id].bindings.push({
      nodeId: node.getId(),
      type: "text",
      instanceId,
      value: textNode.getText(),
    });
  }

  Object.values(properties).forEach(({ bindings }) => {
    let firstBinding: PropValueBinding = bindings[0];
    for (const binding of bindings) {
      if (binding.value !== firstBinding.value) {
        return;
      }
    }

    delete properties[prop.id];
  });

  return properties;
};


export const gatherCssPropsFromNodes = (potentiallyRepeatedNode: Node[], instanceIds: string[]): ComponentProperties => {
  const properties: ComponentProperties = {};

  if (potentiallyRepeatedNode.length < 3) {
    return properties;
  }

  const sampleNode: Node = potentiallyRepeatedNode[0];
  const sampleNodeType: NodeType = sampleNode.getType();

  let existingCssKeys: Set<string> = new Set<string>();
  for (const node of potentiallyRepeatedNode) {
    Object.keys({
      ...node.getCssAttributes(),
      ...node.getPositionalCssAttributes()
    }).forEach(
      (cssKey: string) => {
        if (cssKey === "display" || cssKey === "flex-direction" || cssKey === "justify-content" || cssKey === "align-items") {
          return;
        }

        if (existingCssKeys.has(cssKey)) {
          return;
        }

        const id: string = uuid.v1() as string;
        const prop = {
          type: "css",
          name: nameRegistryGlobalInstance.getPropName(id),
          cssKey,
          id: uuid.v1() as string,
          bindings: [],
        };

        properties[id] = prop;
        existingCssKeys.add(prop.cssKey);
      }
    );
  }

  for (let i = 0; i < potentiallyRepeatedNode.length; i++) {
    const node: Node = potentiallyRepeatedNode[i];
    const instanceId: string = instanceIds[i];
    const attributes = {
      ...node.getCssAttributes(),
      ...node.getPositionalCssAttributes()
    };

    Object.entries(properties).forEach(
      ([_, { bindings, cssKey }]) => {
        if (cssKey === "display" || cssKey === "flex-direction" || cssKey === "justify-content" || cssKey === "align-items") {
          return;
        }

        const cssValue: string = attributes[cssKey];

        if (!cssValue) {
          bindings.push({
            nodeId: node.getId(),
            instanceId,
            type: "css",
            value: undefined,
          });
          return;
        }

        bindings.push({
          nodeId: node.getId(),
          instanceId,
          type: "css",
          value: cssValue,
        });
      }
    );
  }

  Object.entries(properties).forEach(([id, { cssKey, bindings }]) => {
    let firstBinding: PropValueBinding = bindings[0];
    if (!shouldUseAsBackgroundImage(sampleNode) && (sampleNodeType === NodeType.IMAGE || sampleNodeType === NodeType.VECTOR_GROUP || sampleNodeType === NodeType.VECTOR)) {
      if (cssKey !== "width" && cssKey !== "height") {
        delete properties[id];
        return;
      }
    }

    for (const binding of bindings) {
      if (binding.value !== firstBinding.value) {
        return;
      }
    }

    delete properties[id];
  });

  return properties;
};

export const gatherTwcssPropsFromNodes = (potentiallyRepeatedNode: Node[], instanceIds: string[]): ComponentProperties => {
  const properties: ComponentProperties = {};

  if (potentiallyRepeatedNode.length < 3) {
    return properties;
  }

  const sampleNode: Node = potentiallyRepeatedNode[0];
  const sampleNodeType: NodeType = sampleNode.getType();

  let existingCssKeys: Set<string> = new Set<string>();
  for (const node of potentiallyRepeatedNode) {
    Object.entries({
      ...node.getCssAttributes(),
      ...node.getPositionalCssAttributes()
    }).forEach(
      ([cssKey, cssValue]) => {
        if (cssKey === "display" || cssKey === "flex-direction" || cssKey === "justify-content" || cssKey === "align-items") {
          return;
        }

        if (existingCssKeys.has(cssKey)) {
          return;
        }

        const twcssClasses: string[] = getTwcssClass(cssKey, cssValue, node.getCssAttributes()).split(" ");
        for (let i = 0; i < twcssClasses.length; i++) {
          const id: string = uuid.v1() as string;
          const prop = {
            type: "css",
            name: nameRegistryGlobalInstance.getPropName(id),
            cssKey,
            twcssClassIndex: i,
            id,
            bindings: [],
          };

          properties[id] = prop;
        }

        existingCssKeys.add(cssKey);
      }
    );
  }

  for (let i = 0; i < potentiallyRepeatedNode.length; i++) {
    const node: Node = potentiallyRepeatedNode[i];
    const instanceId: string = instanceIds[i];
    const attributes = {
      ...node.getCssAttributes(),
      ...node.getPositionalCssAttributes()
    };

    Object.entries(properties).forEach(
      ([_, { bindings, cssKey, twcssClassIndex }]) => {
        if (cssKey === "display" || cssKey === "flex-directi on" || cssKey === "justify-content" || cssKey === "align-items") {
          return;
        }

        const cssValue: string = attributes[cssKey];
        const twcssClasses: string[] = getTwcssClass(cssKey, cssValue, node.getCssAttributes()).split(" ");
        const twcssClass = twcssClasses[twcssClassIndex];

        if (isEmpty(twcssClass)) {
          bindings.push({
            nodeId: node.getId(),
            instanceId,
            type: "css",
            value: undefined,
          });
          return;
        }

        bindings.push({
          nodeId: node.getId(),
          instanceId,
          type: "css",
          value: twcssClass,
        });
      }
    );
  }

  Object.entries(properties).forEach(([id, { cssKey, bindings }]) => {
    if (!shouldUseAsBackgroundImage(sampleNode) && (sampleNodeType === NodeType.IMAGE || sampleNodeType === NodeType.VECTOR_GROUP || sampleNodeType === NodeType.VECTOR)) {
      if (cssKey !== "width" && cssKey !== "height") {
        delete properties[id];
        return;
      }
    }

    let firstBinding: PropValueBinding = bindings[0];
    for (const binding of bindings) {
      if (binding.value !== firstBinding.value) {
        return;
      }
    }

    delete properties[id];
  });

  return properties;
};