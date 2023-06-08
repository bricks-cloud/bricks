import { getTextDescendants, isEmpty } from "../../../utils";
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
  StyledTextSegment,
} from "../../../design/adapter/node";
import { nameRegistryGlobalInstance } from "../../name-registry/name-registry";

type GetPropsFromNode = (node: Node, option: Option) => string;
export type GetPropsFromAttributes = (
  attributes: Attributes,
  option: Option,
  node: Node,
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

        // if textProp is enclosed in a <ul> or <ol> tag, we don't want to wrap another <div> around it
        const result = /^<(ul|ol)>.*<\/(ul|ol)>$/s.exec(textProp);
        if (result && result[1] === result[2]) {
          const listTag = result[1];
          const textPropWithoutListTag = textProp.substring(
            4, // length of <ul> or <ol>
            textProp.length - 5 // length of </ul> or </ol>
          );
          return `<${listTag} ${textNodeClassProps}>${textPropWithoutListTag}</${listTag}>`;
        }

        const children: Node[] = node.getChildren();

        if (isEmpty(children) && htmlTag === "input") {
          delete node.cssAttributes["min-width"];
          node.addCssAttributes({
            "background-color": "transparent",
            width: "100%",
          });

          const inputClassProps = this.getPropsFromNode(node, option);
          // TODO: style placeholder text
          return `<input placeholder="${textProp}" ${inputClassProps}></input>`;
        }

        if (isEmpty(children) && htmlTag !== "input") {
          return `<${htmlTag} ${attributes}${textNodeClassProps}>${textProp}</${htmlTag}>`;
        }

        for (const child of children) {
          if (child.getType() === NodeType.TEXT) {
            child.addAnnotations("htmlTag", "span");
          }
        }

        return await this.generateHtmlFromNodes(
          children,
          [
            `<${htmlTag} ${attributes} ${textNodeClassProps}>${textProp} &nbsp;`,
            `</${htmlTag}>`,
          ],
          option
        );
      }

      case NodeType.GROUP:
      case NodeType.VISIBLE: {
        const props = this.getPropsFromNode(node, option);
        if (isEmpty(node.getChildren())) {
          return `<${htmlTag} ${props}></${htmlTag}>`;
        }

        if (htmlTag === "input") {
          // assume inputs only have one text child for now
          const textDecendant = getTextDescendants(node)[0];
          const otherChildren = node
            .getChildren()
            .filter((child) => child.id !== textDecendant.id);

          if (otherChildren.length > 0) {
            textDecendant.addAnnotations("htmlTag", "input");
            return await this.generateHtmlFromNodes(
              node.getChildren(),
              [`<div ${props}>`, `</div>`],
              option
            );
          }

          // TODO: style placeholder text
          return `<input placeholder="${textDecendant.getText()}" ${props}></input>`;
        }

        return await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<${htmlTag} ${props}>`, `</${htmlTag}>`],
          option
        );
      }

      // TODO: VECTOR_GROUP node type is deprecated
      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        const vectorGroupCodeString =
          await this.generateHtmlElementForVectorNode(vectorGroupNode, option);

        return vectorGroupCodeString;

      case NodeType.VECTOR:
        const vectorNode = node as VectorGroupNode;
        const vectorCodeString = await this.generateHtmlElementForVectorNode(
          vectorNode,
          option
        );

        if (isEmpty(node.getChildren())) {
          return vectorCodeString;
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
    for (const child of nodes) {
      const codeString: string = await this.generateHtml(child, option);

      childrenCodeStrings.push(codeString);
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }

  private async generateHtmlElementForVectorNode(
    node: VectorNode | VectorGroupNode,
    option: Option
  ): Promise<string> {
    const alt: string = getAltProp(node);
    const src = getSrcProp(node);
    let widthAndHeight: string = getWidthAndHeightProp(node);
    return this.renderImageWithPositionalAttributes(
      node,
      `${widthAndHeight} src=${src} alt=${alt}`,
      option
    );
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
          this.renderImageWithPositionalAttributes(
            node,
            `src=${srcValue} alt=${alt} ${widthAndHeight}`,
            option
          ),
        ];
      }

      return [
        this.renderImageWithPositionalAttributes(
          node,
          `src="./assets/${imageComponentName}.png" alt=${alt} ${widthAndHeight}`,
          option
        ),
      ];
    }

    return [`<div ${this.getPropsFromNode(node, option)}>`, `</div>`];
  }

  renderImageWithPositionalAttributes(
    node: ImageNode | VectorNode | VectorGroupNode,
    props: string,
    option: Option
  ): string {
    return `<img ${this.getPropsFromNode(node, option)} ${props}/>`;
  }

  getText(node: Node, option: Option): string {
    const textNode: TextNode = node as TextNode;
    const styledTextSegments = textNode.getStyledTextSegments();

    // for keeping track of nested tags
    const htmlTagStack: ("ol" | "ul" | "li")[] = [];
    let prevIndentation = 0;

    let resultText = styledTextSegments
      .map(
        (styledTextSegment, styledTextSegmentIndex, styledTextSegmentArr) => {
          // get attributes that are different from parent attributes
          const { cssAttributes, parentCssAttributes } = getAttributeOverrides(
            node as TextNode,
            styledTextSegment
          );

          const { characters, listType, indentation, href } = styledTextSegment;

          if (listType === "none") {
            const result = this.wrapTextIfHasAttributes(
              replaceLeadingWhiteSpaceAndNewLine(characters, option),
              href,
              cssAttributes,
              parentCssAttributes,
              option,
              node
            );

            return result;
          }

          // create enough lists to match identation
          let resultText = "";
          const indentationToAdd = indentation - prevIndentation;

          if (indentationToAdd > 0) {
            // Open new sublists
            for (let i = 0; i < indentationToAdd; i++) {
              const lastOpenTag = htmlTagStack[htmlTagStack.length - 1];

              // According to the HTML5 W3C spec, <ul> or <ol> can only contain <li>.
              // Hence, we are appending a <li> tag if the last open tag is <ul> or <ol>.
              if (lastOpenTag === "ul" || lastOpenTag === "ol") {
                resultText += `<li>`;
                htmlTagStack.push("li");
              }

              if (option.cssFramework === "tailwindcss") {
                // Extra attributes needed due to Tailwind's CSS reset
                const listProps = this.getPropsFromAttributes(
                  {
                    "margin-left": "40px",
                    "list-style-type": listType === "ul" ? "disc" : "decimal",
                  },
                  option,
                  node
                );

                resultText += `<${listType} ${listProps}>`;
              } else {
                resultText += `<${listType}>`;
              }

              htmlTagStack.push(listType);
            }
          } else if (indentationToAdd < 0) {
            // Close sublists
            for (
              let numOfListClosed = 0;
              numOfListClosed < Math.abs(indentationToAdd);

            ) {
              const htmlTag = htmlTagStack.pop();
              if (htmlTag === "li") {
                resultText += `</li>`;
              } else {
                resultText += `</${htmlTag}>`;
                numOfListClosed++;
              }
            }
          }
          // update indentation for the next loop
          prevIndentation = indentation;

          // create list items
          const listItems = splitByNewLine(characters);
          resultText += listItems
            .map((listItem, listItemIndex, listItemArr) => {
              const hasOpenListItem =
                htmlTagStack[htmlTagStack.length - 1] === "li";

              let result = "";

              if (!hasOpenListItem) {
                htmlTagStack.push("li");
                result += "<li>";
              }

              const lastListItem =
                listItemArr[listItemIndex - 1] ||
                styledTextSegmentArr[styledTextSegmentIndex - 1]?.characters ||
                "";
              if (hasOpenListItem && lastListItem.endsWith("\n")) {
                result += "</li><li>";
              }

              result += this.wrapTextIfHasAttributes(
                listItem,
                href,
                cssAttributes,
                parentCssAttributes,
                option,
                node
              );

              const isLastListItem = listItemIndex === listItemArr.length - 1;
              if (listItem.endsWith("\n") && !isLastListItem) {
                // close list item
                htmlTagStack.pop();
                result += "</li>";
              }

              return result;
            })
            .join("");

          return resultText;
        }
      )
      .join("");

    // close all open tags
    while (htmlTagStack.length) {
      resultText += `</${htmlTagStack.pop()}>`;
    }

    return resultText;
  }

  wrapTextIfHasAttributes(
    text: string,
    href: string,
    cssAttributes: Attributes,
    parentCssAttributes: Attributes,
    option: Option,
    node: Node
  ) {
    const resultText = escapeHtml(text);

    if (isEmpty(cssAttributes) && !href) {
      return resultText;
    }

    const htmlTag = href ? "a" : "span";
    const hrefAttribute = href ? ` href="${href}"` : "";
    const styleAttribute = !isEmpty(cssAttributes)
      ? ` ${this.getPropsFromAttributes(
          cssAttributes,
          option,
          node,
          parentCssAttributes
        )}`
      : "";

    return `<${htmlTag}${hrefAttribute}${styleAttribute}>${resultText}</${htmlTag}>`;
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

const replaceLeadingWhiteSpaceAndNewLine = (
  str: string,
  option: Option
): string => {
  let newStr: string = "";
  let streak: boolean = true;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === 160 && streak) {
      newStr += "&nbsp;";
      streak = true;
      continue;
    }

    streak = false;

    if (str.charAt(i) === "\n") {
      newStr += option.uiFramework === "html" ? "<br>" : "<br />";
      streak = true;
      continue;
    }

    newStr += str.charAt(i);
  }

  return newStr;
};

const splitByNewLine = (text: string) => {
  let listItems = text.split("\n");

  // if last item is "", it means there is a new line at the end of the last item
  if (text !== "" && listItems[listItems.length - 1] === "") {
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
  if (
    cssAttribtues["width"] &&
    cssAttribtues["height"]
  ) {
    return `width="${cssAttribtues["width"]}" height="${cssAttribtues["height"]}"`;
  }

  return "";
};

const getSrcProp = (node: Node): string => {
  const id: string = node.getId();

  let fileExtension: string = "svg";
  let componentName: string = nameRegistryGlobalInstance.getVectorName(id);

  if (node.getType() === NodeType.IMAGE) {
    fileExtension = "png";
    componentName = nameRegistryGlobalInstance.getImageName(id);
  }

  return `"./assets/${componentName}.${fileExtension}"`;
};

const getAltProp = (node: Node): string => {
  const id: string = node.getId();
  const componentName: string = nameRegistryGlobalInstance.getAltName(id);

  return `"${componentName}"`;
};

const escapeHtml = (str: string) => {
  return str.replace(/["'{}]/g, function (match) {
    switch (match) {
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
