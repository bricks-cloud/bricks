import { isEmpty } from "../../../utils";
import { CssFramework, Option, UiFramework } from "../../code";
import {
  ImageNode,
  Node,
  NodeType,
  VectorGroupNode,
  VectorNode,
} from "../../../bricks/node";
import { Attributes, ExportFormat } from "../../../design/adapter/node";
import { generateProps, nameRegistryGlobalInstance } from "../../loop/loop";
import { Component, Data, DataArr, componentRegistryGlobalInstance, getAltProp, getSrcProp, getTextProp, getWidthAndHeightProp } from "../../loop/component";
import { promptRegistryGlobalInstance } from "../../prompt-registry.ts/prompt-registry";

export type GetProps = (node: Node, option: Option) => string;

export type ImportedComponentMeta = {
  node: VectorGroupNode | VectorNode | ImageNode;
  importPath: string;
  componentName: string;
};


export type InFileComponentMeta = {
  componentCode: string;
};

export type InFileDataMeta = {
  dataCode: string;
};

export class Generator {
  getProps: GetProps;
  inFileComponents: InFileComponentMeta[];
  inFileData: InFileDataMeta[];

  constructor(getProps: GetProps) {
    this.getProps = getProps;

    this.inFileComponents = [];
    this.inFileData = [];
  }

  async generateHtml(
    node: Node,
    option: Option
  ): Promise<string> {

    switch (node.getType()) {
      case NodeType.TEXT:
        const textNodeClassProps = this.getProps(node, option);
        const tag =
          option.cssFramework === CssFramework.tailwindcss ? "p" : "div";

        const textProp: string = getTextProp(node);
        return `<${tag}  ${textNodeClassProps}>${textProp}</${tag}>`;

      case NodeType.GROUP:
        // this edge case should never happen
        if (isEmpty(node.getChildren())) {
          return `<div></div>`;
        }

        const groupNodeClassProps = this.getProps(node, option);
        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${groupNodeClassProps}>`, "</div>"],
          option,
        );

      case NodeType.VISIBLE:
        const visibleNodeClassProps = this.getProps(node, option);
        if (isEmpty(node.getChildren())) {
          return `<div ${visibleNodeClassProps}> </div>`;
        }

        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${visibleNodeClassProps}>`, "</div>"],
          option,
        );

      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        const vectorGroupCodeString =
          await this.generateHtmlElementForVectorNode(
            vectorGroupNode,
            option,
          );

        return (
          this.renderNodeWithAbsolutePosition(
            vectorGroupNode,
            vectorGroupCodeString,
            option
          )
        );

      case NodeType.VECTOR:
        const vectorNode = node as VectorGroupNode;
        const vectorCodeString =
          await this.generateHtmlElementForVectorNode(
            vectorNode,
            option,
          );

        return (
          this.renderNodeWithAbsolutePosition(
            vectorNode,
            vectorCodeString,
            option
          )
        );
      case NodeType.IMAGE:
        const imageNode = node as ImageNode;

        const codeStrings = await this.generateHtmlElementForImageNode(
          imageNode,
          option,
        );

        if (codeStrings.length === 1) {
          return codeStrings[0];
        }

        const imageNodeCodeString = await this.generateHtmlFromNodes(
          node.getChildren(),
          codeStrings,
          option,
        );

        return imageNodeCodeString;
    }

    return `<div></div>`;
  }


  getExtraComponentsMetaData(): [InFileComponentMeta[], InFileDataMeta[]] {
    return [this.inFileComponents, this.inFileData];
  }

  private async generateHtmlFromNodes(
    nodes: Node[],
    [openingTag, closingTag]: string[],
    option: Option,
  ): Promise<string> {
    let childrenCodeStrings: string[] = [];
    let repeatedComponents: Node[] = [];
    let streak: boolean = false;

    for (const child of nodes) {
      if (option.uiFramework === UiFramework.react && componentRegistryGlobalInstance.getComponentByNodeId(child.getId()) && nodes.length > 2) {
        streak = true;

        repeatedComponents.push(child);
        continue;
      }

      if (streak) {
        const repeatedComponentsCodeString: string = await this.generateCodeFromRepeatedComponents(repeatedComponents, option);

        childrenCodeStrings.push(repeatedComponentsCodeString);

        streak = false;
      }

      const codeString: string = await this.generateHtml(child, option);

      childrenCodeStrings.push(codeString);
    }

    // console.log("repeatedComponents: ", repeatedComponents);

    if (streak) {
      const repeatedComponentsCodeString: string = await this.generateCodeFromRepeatedComponents(repeatedComponents, option);
      childrenCodeStrings.push(repeatedComponentsCodeString);
      // console.log("repeatedComponentsCodeString: ", repeatedComponentsCodeString);
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }

  private async generateHtmlElementForVectorNode(
    node: VectorNode | VectorGroupNode,
    option: Option,
  ): Promise<string> {
    const alt: string = getAltProp(node);

    if (option.uiFramework === UiFramework.react) {
      const src = getSrcProp(node);

      let widthAndHeight: string = getWidthAndHeightProp(node);

      return `<img ${widthAndHeight} src=${src} alt=${alt} />`;
    }

    return await node.export(ExportFormat.SVG);
  }

  private async generateHtmlElementForImageNode(
    node: ImageNode,
    option: Option,
  ): Promise<string[]> {
    const id: string = node.getId();
    const imageComponentName: string = nameRegistryGlobalInstance.getImageName(id);
    const alt: string = getAltProp(node);

    if (isEmpty(node.getChildren())) {
      let widthAndHeight: string = getWidthAndHeightProp(node);

      if (option.uiFramework === UiFramework.react) {
        let srcValue: string = `${imageComponentName}`;
        const src = getSrcProp(node);
        if (!isEmpty(src)) {
          srcValue = src;
        }

        return [
          this.renderNodeWithAbsolutePosition(
            node,
            `<img src=${src} alt=${alt} ${widthAndHeight}/>`,
            option
          ),
        ];
      }

      return [
        this.renderNodeWithAbsolutePosition(
          node,
          `<img src="./assets/${imageComponentName}.png" alt=${alt} ${widthAndHeight}/>`,
          option
        ),
      ];
    }

    node.addCssAttributes({
      "background-image": `url('./assets/${imageComponentName}.png')`,
    });

    return [`<div ${this.getProps(node, option)}>`, `</div>`];
  }

  renderNodeWithAbsolutePosition(
    node: ImageNode | VectorNode | VectorGroupNode,
    inner: string,
    option: Option
  ): string {

    // console.log("renderNodeWithAbsolutePosition: ", node);

    const positionalCssAttribtues: Attributes =
      node.getPositionalCssAttributes();
    if (positionalCssAttribtues["position"] === "absolute") {
      return `<div ${this.getProps(node, option)}>` + inner + `</div>`;
    }
    return inner;
  }

  async generateCodeFromRepeatedComponents(nodes: Node[],
    option: Option): Promise<string> {
    const id: string = nodes[0].getId();
    const component: Component = componentRegistryGlobalInstance.getComponentByNodeId(id);
    const dataArr: DataArr = component.getDataArr();
    const data: Data[] = component.getData(nodes);

    let renderInALoop: boolean = false;
    if (!isEmpty(data)) {
      renderInALoop = true;
    }

    // console.log("data: ", data);

    const sample: object = data[0];
    const generatedComponent = await this.generateHtml(nodes[0], option);

    // console.log("generatedComponent: ", generatedComponent);

    let componentCodeString: string = `const ${component.getName()} = ({
      ${component.getPropNames().join(",")}
    }) => (
      ${generatedComponent}
    );`;

    this.inFileComponents.push({
      componentCode: componentCodeString,
    });

    let codeStr: string = "";
    if (renderInALoop) {

      let dataCodeStr: string = `const ${dataArr.name} = ${JSON.stringify(data)};`;

      let arrCodeStr: string = `{
        ${dataArr.name}.map(({
      ${Object.keys(sample).join(",")}
        }) => <${component.getName()} ${generateProps(dataArr.fieldToPropBindings)} />)
      }`;

      this.inFileData.push({
        dataCode: dataCodeStr,
      });

      promptRegistryGlobalInstance.addPrompt(
        createMiniReactFile(componentCodeString, dataCodeStr, arrCodeStr)
      );

      return arrCodeStr;
    }

    for (const _ of nodes) {
      codeStr += `<${component.getName()} />`;
    }

    return codeStr;
  }
}


const createMiniReactFile = (componentCode: string, dataCode: string, arrCode: string) => {
  return `
  import React from "react"; 
  import "./style.css";

  ${componentCode}

  ${dataCode}

  const GeneratedComponent = (
    <div>
      ${arrCode}
    </div>
  );

  export default GeneratedComponent;
  `;
};
