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
import {
  Attributes,
  ExportFormat,
  StyledTextSegment,
} from "../../../design/adapter/node";
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
export type GetPropsFromAttributes = (
  attributes: Attributes,
  option: Option,
  id?: string,
  // sometimes needed because the value of an attribute can depend on the parent's attributes
  parentCssAttributes?: Attributes
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
        console.log("textProp");
        console.log(textProp);

        //@ts-ignore
        // const listSegments = node.node.getListSegments();
        // const listType = listSegments[0].listType;
        // if (listSegments.length === 1 && listType !== "none") {
        //   return `<${listType} ${attributes}${textNodeClassProps}>${textProp}</${listType}>`;
        // }

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

      // TODO: VECTOR_GROUP node type is deprecated
      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        const vectorGroupCodeString =
          await this.generateHtmlElementForVectorNode(vectorGroupNode, option);

        return this.renderNodeWithPositionalAttributes(
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

        if (isEmpty(node.getChildren())) {
          return this.renderNodeWithPositionalAttributes(
            vectorNode,
            vectorCodeString,
            option
          );
        }

        const vectorNodeClassProps = this.getPropsFromNode(node, option);
        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${vectorNodeClassProps}>`, `</div>`],
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
          this.renderNodeWithPositionalAttributes(
            node,
            `<img src=${srcValue} alt=${alt} ${widthAndHeight}/>`,
            option
          ),
        ];
      }

      return [
        this.renderNodeWithPositionalAttributes(
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

  renderNodeWithPositionalAttributes(
    node: ImageNode | VectorNode | VectorGroupNode,
    inner: string,
    option: Option
  ): string {
    const positionalCssAttribtues: Attributes =
      node.getPositionalCssAttributes();

    if (
      positionalCssAttribtues["position"] === "absolute" ||
      positionalCssAttribtues["margin-left"] ||
      positionalCssAttribtues["margin-right"] ||
      positionalCssAttribtues["margin-top"] ||
      positionalCssAttribtues["margin-bottom"]
    ) {
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

    // for keeping track of nested lists
    const currentListStack = [];

    let resultText = styledTextSegments
      .map((styledTextSegment) => {
        // get attributes that are different from parent attributes
        const { cssAttributes, parentCssAttributes } = getAttributeOverrides(
          node as TextNode,
          styledTextSegment
        );

        const { characters, listType, indentation } = styledTextSegment;

        if (listType === "none") {
          const result = this.wrapTextIfHasAttributes(
            characters,
            "span",
            cssAttributes,
            parentCssAttributes,
            option
          );

          return result
            .split("\n")
            .join(option.uiFramework === "html" ? "<br>" : "<br />");
        }

        // create enough lists to match identation
        let result = "";
        const indentationDiff = indentation - currentListStack.length;
        if (indentationDiff > 0) {
          // Open new sublists
          for (let i = 0; i < indentationDiff; i++) {
            if (i === 0) {
              result += `<${listType}>`;
            } else {
              result += `<li><${listType}>`;
            }
            currentListStack.push(listType);
          }
        } else if (indentationDiff < 0) {
          // Close sublists
          for (let i = 0; i < Math.abs(indentationDiff); i++) {
            const listToClose = currentListStack.pop();
            if (i === 0) {
              result += `</li></${listToClose}></li>`;
            } else {
              result += `</${listToClose}></li>`;
            }
          }
        }

        // create list items
        const listItems = splitByNewLine(characters);
        let hasOpenListItem = false;
        result += listItems.map((listItem) => {
          if (listItem.endsWith("\n") && hasOpenListItem) {
            hasOpenListItem = false;
            return (
              this.wrapTextIfHasAttributes(
                listItem,
                "span",
                cssAttributes,
                parentCssAttributes,
                option
              ) + "</li>"
            );
          }

          if (listItem.endsWith("\n") && !hasOpenListItem) {
            const textProps = this.getPropsFromAttributes(
              cssAttributes,
              option,
              undefined,
              parentCssAttributes
            );
            return `<li ${textProps}>${characters}`;
          }

          if (!listItem.endsWith("\n") && hasOpenListItem) {
            return this.wrapTextIfHasAttributes(
              listItem,
              "span",
              cssAttributes,
              parentCssAttributes,
              option
            );
          }

          if (!listItem.endsWith("\n") && !hasOpenListItem) {
            hasOpenListItem = true;
            return (
              "<li>" +
              this.wrapTextIfHasAttributes(
                listItem,
                "span",
                cssAttributes,
                parentCssAttributes,
                option
              )
            );
          }
        });

        return result;
      })
      .join("");

    // close all lists
    while (currentListStack.length) {
      const listToClose = currentListStack.pop();
      resultText += `</li></${listToClose}>`;
    }

    return resultText;
  }

  wrapTextIfHasAttributes(
    text: string,
    htmlTag: string,
    cssAttributes: Attributes,
    parentCssAttributes: Attributes,
    option: Option
  ) {
    if (isEmpty(cssAttributes)) {
      return text;
    }

    const textProps = this.getPropsFromAttributes(
      cssAttributes,
      option,
      undefined,
      parentCssAttributes
    );
    return `<${htmlTag} ${textProps}>${text}</${htmlTag}>`;
  }
}

const getAttributeOverrides = (
  textNode: TextNode,
  styledTextSegment: StyledTextSegment
) => {
  const defaultFontSize = textNode.getACssAttribute("font-size");
  const defaultFontFamily = textNode.getACssAttribute("font-family");
  const defaultFontWeight = textNode.getACssAttribute("font-weight");
  const defaultColor = textNode.getACssAttribute("color");
  const defaultLetterSpacing = textNode.getACssAttribute("letter-spacing");

  const cssAttributes: Attributes = {};
  const parentCssAttributes: Attributes = {};

  const fontSize = `${styledTextSegment.fontSize}px`;
  if (fontSize !== defaultFontSize) {
    cssAttributes["font-size"] = fontSize;
  }

  const fontFamily = styledTextSegment.fontFamily;
  if (fontFamily !== defaultFontFamily) {
    cssAttributes["font-family"] = fontFamily;
  }

  const fontWeight = styledTextSegment.fontWeight.toString();
  if (fontWeight !== defaultFontWeight) {
    cssAttributes["font-weight"] = fontWeight;
  }

  const textDecoration = styledTextSegment.textDecoration;
  if (textDecoration !== "normal") {
    cssAttributes["text-decoration"] = textDecoration;
  }

  const textTransform = styledTextSegment.textTransform;
  if (textTransform !== "none") {
    cssAttributes["text-transform"] = textTransform;
  }

  const color = styledTextSegment.color;
  if (color !== defaultColor) {
    cssAttributes["color"] = color;
  }

  const letterSpacing = styledTextSegment.letterSpacing;
  if (
    letterSpacing !== defaultLetterSpacing &&
    defaultLetterSpacing &&
    letterSpacing !== "normal"
  ) {
    cssAttributes["letter-spacing"] = letterSpacing;
    parentCssAttributes["font-size"] = defaultFontSize;
  }

  return {
    cssAttributes,
    parentCssAttributes,
  };
};

const splitByNewLine = (text: string) => {
  let listItems = text.split("\n");

  // if last item is "", it means there is a new line at the end of the last item
  if (listItems[listItems.length - 1] === "") {
    listItems.pop();
    listItems = listItems.map((item) => item + "\n");
  } else {
    // otherwise, it means there is not a new line at the end of the last item
    listItems = listItems.map((item, index, array) => {
      if (index === array.length - 1) {
        return item;
      }
      return item + "\n";
    });
  }

  return listItems;
};

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
