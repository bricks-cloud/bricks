import { isEmpty } from "../../../utils";
import { Option, UiFramework } from "../../code";
import {
  ImageNode,
  Node,
  NodeType,
  VectorGroupNode,
  VectorNode,
  TextNode,
} from "../../../bricks/node";
import { Attributes, ExportFormat } from "../../../design/adapter/node";
import { generateProps } from "../../../../ee/loop/data-array-registry";
import { nameRegistryGlobalInstance } from "../../name-registry/name-registry";
import { Component, Data, DataArr } from "../../../../ee/loop/component";
import {
  getVariableProp,
  getTextVariableProp,
  getWidthAndHeightVariableProp,
} from "../../../../ee/code/prop";
import { componentRegistryGlobalInstance } from "../../../../ee/loop/component-registry";
import { codeSampleRegistryGlobalInstance } from "../../../../ee/loop/code-sample-registry";

type GetPropsFromNode = (node: Node, option: Option) => string;
type GetPropsFromAttributes = (
  attributes: Attributes,
  option: Option
) => string;

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
  getPropsFromNode: GetPropsFromNode;
  getPropsFromAttributes: GetPropsFromAttributes;
  inFileComponents: InFileComponentMeta[];
  inFileData: InFileDataMeta[];

  constructor(
    getPropsFromNode: GetPropsFromNode,
    getPropsFromAttributes: GetPropsFromAttributes
  ) {
    this.getPropsFromNode = getPropsFromNode;
    this.getPropsFromAttributes = getPropsFromAttributes;

    this.inFileComponents = [];
    this.inFileData = [];
  }

  async generateHtml(node: Node, option: Option): Promise<string> {
    const htmlTag = node.getAnnotation("htmlTag") || "div";

    switch (node.getType()) {
      case NodeType.TEXT: {
        const textNodeClassProps = this.getPropsFromNode(node, option);
        const attributes = htmlTag === "a" ? 'href="#" ' : "";
        const textProp = this.getText(node, option);
        return `<${htmlTag} ${attributes}${textNodeClassProps}>${textProp}</${htmlTag}>`;
      }

      case NodeType.GROUP:
        // this edge case should never happen
        if (isEmpty(node.getChildren())) {
          return `<${htmlTag}></${htmlTag}>`;
        }

        const groupNodeClassProps = this.getPropsFromNode(node, option);
        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<${htmlTag} ${groupNodeClassProps}>`, `</${htmlTag}>`],
          option
        );

      case NodeType.VISIBLE:
        const visibleNodeClassProps = this.getPropsFromNode(node, option);
        if (isEmpty(node.getChildren())) {
          return `<${htmlTag} ${visibleNodeClassProps}> </${htmlTag}>`;
        }

        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<${htmlTag} ${visibleNodeClassProps}>`, `</${htmlTag}>`],
          option
        );

      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        const vectorGroupCodeString =
          await this.generateHtmlElementForVectorNode(vectorGroupNode, option);

        return this.renderNodeWithAbsolutePosition(
          vectorGroupNode,
          vectorGroupCodeString,
          option
        );

      case NodeType.VECTOR:
        const vectorNode = node as VectorGroupNode;
        const vectorCodeString = await this.generateHtmlElementForVectorNode(
          vectorNode,
          option
        );

        return this.renderNodeWithAbsolutePosition(
          vectorNode,
          vectorCodeString,
          option
        );
      case NodeType.IMAGE:
        const imageNode = node as ImageNode;

        const codeStrings = await this.generateHtmlElementForImageNode(
          imageNode,
          option
        );

        if (codeStrings.length === 1) {
          return codeStrings[0];
        }

        const imageNodeCodeString = await this.generateHtmlFromNodes(
          node.getChildren(),
          codeStrings,
          option
        );

        return imageNodeCodeString;
    }

    return `<${htmlTag}></${htmlTag}>`;
  }

  getExtraComponentsMetaData(): [InFileComponentMeta[], InFileDataMeta[]] {
    return [this.inFileComponents, this.inFileData];
  }

  private async generateHtmlFromNodes(
    nodes: Node[],
    [openingTag, closingTag]: string[],
    option: Option
  ): Promise<string> {
    let childrenCodeStrings: string[] = [];
    let repeatedComponents: Node[] = [];
    let streak: boolean = false;

    for (const child of nodes) {
      if (
        option.uiFramework === UiFramework.react &&
        componentRegistryGlobalInstance.getComponentByNodeId(child.getId()) &&
        nodes.length > 2
      ) {
        streak = true;

        repeatedComponents.push(child);
        continue;
      }

      if (streak) {
        const repeatedComponentsCodeString: string =
          await this.generateCodeFromRepeatedComponents(
            repeatedComponents,
            option
          );
        childrenCodeStrings.push(repeatedComponentsCodeString);
        streak = false;
      }

      const codeString: string = await this.generateHtml(child, option);

      childrenCodeStrings.push(codeString);
    }

    if (streak) {
      const repeatedComponentsCodeString: string =
        await this.generateCodeFromRepeatedComponents(
          repeatedComponents,
          option
        );
      childrenCodeStrings.push(repeatedComponentsCodeString);
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }

  private async generateHtmlElementForVectorNode(
    node: VectorNode | VectorGroupNode,
    option: Option
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
    option: Option
  ): Promise<string[]> {
    const id: string = node.getId();
    const imageComponentName: string =
      nameRegistryGlobalInstance.getImageName(id);
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

    return [`<div ${this.getPropsFromNode(node, option)}>`, `</div>`];
  }

  renderNodeWithAbsolutePosition(
    node: ImageNode | VectorNode | VectorGroupNode,
    inner: string,
    option: Option
  ): string {
    const positionalCssAttribtues: Attributes =
      node.getPositionalCssAttributes();
    if (positionalCssAttribtues["position"] === "absolute") {
      return `<div ${this.getPropsFromNode(node, option)}>` + inner + `</div>`;
    }
    return inner;
  }

  async generateCodeFromRepeatedComponents(
    nodes: Node[],
    option: Option
  ): Promise<string> {
    const id: string = nodes[0].getId();
    const component: Component =
      componentRegistryGlobalInstance.getComponentByNodeId(id);
    const dataArr: DataArr = component.getDataArr();
    const data: Data[] = component.getData(nodes);

    let renderInALoop: boolean = false;
    if (!isEmpty(data)) {
      renderInALoop = true;
    }

    const sample: object = data[0];
    const generatedComponent = await this.generateHtml(nodes[0], option);

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
      let dataCodeStr: string = `const ${dataArr.name} = ${JSON.stringify(
        data
      )};`;

      let arrCodeStr: string = `{
        ${dataArr.name}.map(({
      ${Object.keys(sample).join(",")}
        }) => <${component.getName()} ${generateProps(
        dataArr.fieldToPropBindings
      )} />)
      }`;

      this.inFileData.push({
        dataCode: dataCodeStr,
      });

      codeSampleRegistryGlobalInstance.addCodeSample(
        createMiniReactFile(componentCodeString, dataCodeStr, arrCodeStr)
      );

      return arrCodeStr;
    }

    for (const _ of nodes) {
      codeStr += `<${component.getName()} />`;
    }

    return codeStr;
  }

  getText(node: Node, option: Option): string {
    const textNode: TextNode = node as TextNode;

    const prop: string = getTextVariableProp(node.getId());
    if (!isEmpty(prop)) {
      return prop;
    }

    const styledTextSegments = textNode.node.getStyledTextSegments();

    if (styledTextSegments.length > 0) {
      const defaultFontSize = textNode.getACssAttribute("font-size");
      const defaultFontFamily = textNode.getACssAttribute("font-family");
      const defaultFontWeight = textNode.getACssAttribute("font-weight");

      return styledTextSegments
        .map((styledTextSegment) => {
          const overridingAttributes: Attributes = {};

          const fontSize = `${styledTextSegment.fontSize}px`;
          if (fontSize !== defaultFontSize) {
            overridingAttributes["font-size"] = fontSize;
          }

          const fontFamily = styledTextSegment.fontName.family;
          if (fontFamily !== defaultFontFamily) {
            overridingAttributes["font-family"] = fontFamily;
          }

          const fontWeight = styledTextSegment.fontWeight.toString();
          if (fontWeight !== defaultFontWeight) {
            overridingAttributes["font-weight"] = fontWeight;
          }

          const text = escapeHtml(styledTextSegment.characters);
          if (Object.keys(overridingAttributes).length === 0) {
            return text;
          }
          const textNodeClassProps = this.getPropsFromAttributes(
            overridingAttributes,
            option
          );
          return `<span ${textNodeClassProps}>${text}</span>`;
        })
        .join("");
    } else {
      return escapeHtml(textNode.getText());
    }
  }
}

const getWidthAndHeightProp = (node: Node): string => {
  const cssAttribtues: Attributes = node.getCssAttributes();
  let widthAndHeight: string = getWidthAndHeightVariableProp(node.getId());

  if (
    isEmpty(widthAndHeight) &&
    cssAttribtues["width"] &&
    cssAttribtues["height"]
  ) {
    return `width="${cssAttribtues["width"]}" height="${cssAttribtues["height"]}"`;
  }

  return widthAndHeight;
};

const getSrcProp = (node: Node): string => {
  const id: string = node.getId();

  let fileExtension: string = "svg";
  let componentName: string = nameRegistryGlobalInstance.getVectorName(id);

  if (node.getType() === NodeType.IMAGE) {
    fileExtension = "png";
    componentName = nameRegistryGlobalInstance.getImageName(id);
  }

  const prop: string = getVariableProp(id, "src");
  if (!isEmpty(prop)) {
    return `{${prop}}`;
  }

  return `"./assets/${componentName}.${fileExtension}"`;
};

const getAltProp = (node: Node): string => {
  const id: string = node.getId();
  const componentName: string = nameRegistryGlobalInstance.getAltName(id);

  const prop: string = getVariableProp(id, "alt");
  if (!isEmpty(prop)) {
    return `{${prop}}`;
  }

  return `"${componentName}"`;
};

const escapeHtml = (str: string) => {
  return str.replace(/[&<>"'{}]/g, function (match) {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      case "{":
        return "&#123;";
      case "}":
        return "&#125;";
    }
  });
};

const createMiniReactFile = (
  componentCode: string,
  dataCode: string,
  arrCode: string
) => {
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
