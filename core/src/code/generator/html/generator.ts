import { isEmpty } from "../../../utils";
import { CssFramework, Option, UiFramework } from "../../code";
import {
  ImageNode,
  Node,
  NodeType,
  TextNode,
  VectorGroupNode,
  VectorNode,
} from "../../../bricks/node";
import { ExportFormat } from "../../../design/adapter/node";

export type GetProps = (node: Node, option: Option) => string;

export type ImportedComponentMeta = {
  node: VectorGroupNode | VectorNode | ImageNode;
  importPath: string;
  componentName: string;
};

export class Generator {
  getProps: GetProps;
  private numberOfVectors: number = 1;
  private numberOfImages: number = 1;

  constructor(getProps: GetProps) {
    this.getProps = getProps;
  }

  async generateHtml(
    node: Node,
    option: Option
  ): Promise<[string, ImportedComponentMeta[]]> {
    const importComponents: ImportedComponentMeta[] = [];

    switch (node.getType()) {
      case NodeType.TEXT:
        const textNode = node as TextNode;
        const textNodeClassProps = this.getProps(node, option);
        const tag =
          option.cssFramework === CssFramework.tailwindcss ? "p" : "div";

        return [
          `<${tag} ${textNodeClassProps}>${textNode.getText()}</${tag}>`,
          importComponents,
        ];

      case NodeType.GROUP:
        // this edge case should never happen
        if (isEmpty(node.getChildren())) {
          return [`<div />`, importComponents];
        }

        const groupNodeClassProps = this.getProps(node, option);
        return [
          await this.generateHtmlFromNodes(
            node.getChildren(),
            [`<div ${groupNodeClassProps}>`, "</div>"],
            option,
            importComponents
          ),
          importComponents,
        ];

      case NodeType.VISIBLE:
        const visibleNodeClassProps = this.getProps(node, option);

        if (isEmpty(node.getChildren())) {
          return [`<div ${visibleNodeClassProps} />`, importComponents];
        }

        return [
          await this.generateHtmlFromNodes(
            node.getChildren(),
            [`<div ${visibleNodeClassProps}>`, "</div>"],
            option,
            importComponents
          ),
          importComponents,
        ];

      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        return [
          await this.generateHtmlElementForVectorNode(
            vectorGroupNode,
            option,
            importComponents
          ),
          importComponents,
        ];

      case NodeType.VECTOR:
        const vectorNode = node as VectorGroupNode;
        return [
          await this.generateHtmlElementForVectorNode(
            vectorNode,
            option,
            importComponents
          ),
          importComponents,
        ];

      case NodeType.IMAGE:
        const imageNode = node as ImageNode;
        if (isEmpty(imageNode.getChildren())) {
          const [codeString] = await this.generateHtmlElementForImageNodes(imageNode, option, importComponents);
          return [codeString, importComponents];
        }

        const imageNodeClassProps = this.getProps(imageNode, option);

        return [
          await this.generateHtmlFromNodes(
            node.getChildren(),
            [`<div ${imageNodeClassProps}>`, "</div>"],
            option,
            importComponents,
          ),
          importComponents,
        ];
    }

    return [`<div></div>`, importComponents];
  }

  private async generateHtmlFromNodes(
    nodes: Node[],
    [openingTag, closingTag]: string[],
    option: Option,
    importComponents: ImportedComponentMeta[]
  ): Promise<string> {
    let childrenCodeStrings: string[] = [];

    for (const child of nodes) {
      switch (child.getType()) {
        case NodeType.TEXT:
          const textNode = child as TextNode;
          const textNodeClassProps = this.getProps(child, option);
          const tag =
            option.cssFramework === CssFramework.tailwindcss ? "p" : "div";

          childrenCodeStrings.push(
            `<${tag} ${textNodeClassProps}>${textNode.getText()}</${tag}>`
          );
          continue;

        case NodeType.GROUP:
          // this edge case should never happen
          if (isEmpty(child.getChildren())) {
            childrenCodeStrings.push(`<div></div>`);
            continue;
          }

          const groupNodeClassProps = this.getProps(child, option);
          const groupNodeCodeString = await this.generateHtmlFromNodes(
            child.getChildren(),
            [`<div ${groupNodeClassProps}>`, "</div>"],
            option,
            importComponents
          );
          childrenCodeStrings.push(groupNodeCodeString);
          continue;

        case NodeType.VISIBLE:
          const visibleNodeClassProps = this.getProps(child, option);
          if (isEmpty(visibleNodeClassProps)) {
            continue;
          }

          if (isEmpty(child.getChildren())) {
            childrenCodeStrings.push(`<div ${visibleNodeClassProps}></div>`);
            continue;
          }

          const visibleNodeCodeString = await this.generateHtmlFromNodes(
            child.getChildren(),
            [`<div ${visibleNodeClassProps}>`, "</div>"],
            option,
            importComponents
          );
          childrenCodeStrings.push(visibleNodeCodeString);
          continue;

        case NodeType.VECTOR_GROUP:
          const vectorGroupNode = child as VectorGroupNode;
          const vectorGroupCodeString =
            await this.generateHtmlElementForVectorNode(
              vectorGroupNode,
              option,
              importComponents
            );
          childrenCodeStrings.push(vectorGroupCodeString);
          continue;

        case NodeType.VECTOR:
          const vectorNode = child as VectorNode;
          const vectorCodeString = await this.generateHtmlElementForVectorNode(
            vectorNode,
            option,
            importComponents
          );
          childrenCodeStrings.push(vectorCodeString);
          continue;

        case NodeType.IMAGE:
          const imageNode = child as ImageNode;
          const codeStrings = await this.generateHtmlElementForImageNodes(
            imageNode,
            option,
            importComponents,
          );


          if (codeStrings.length === 1) {
            childrenCodeStrings.push(codeStrings[0]);
            continue;
          }

          const imageNodeCodeString = await this.generateHtmlFromNodes(
            child.getChildren(),
            codeStrings,
            option,
            importComponents,
          );

          childrenCodeStrings.push(imageNodeCodeString);
          continue;
      }
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }

  private async generateHtmlElementForVectorNode(
    node: VectorNode | VectorGroupNode,
    option: Option,
    importComponents: ImportedComponentMeta[],
  ): Promise<string> {
    const vectorComponentName = "SvgAsset" + this.numberOfVectors;
    const alt = `"Svg Asset ${this.numberOfVectors}"`;
    this.numberOfVectors++;

    if (option.uiFramework === UiFramework.react) {
      importComponents.push({
        componentName: vectorComponentName,
        importPath: `/assets/${vectorComponentName}.svg`,
        node: node,
      });

      return `<img width="${node.getACssAttribute("width")}" src={${vectorComponentName}} alt=${alt} />`;
    }

    return await node.export(ExportFormat.SVG);
  }

  private async generateHtmlElementForImageNodes(
    node: ImageNode,
    option: Option,
    importComponents: ImportedComponentMeta[],
  ): Promise<string[]> {
    const imageComponentName = "ImageAsset" + this.numberOfImages;
    const alt = `"Image Asset ${this.numberOfImages}"`;
    this.numberOfImages++;

    importComponents.push({
      componentName: imageComponentName,
      importPath: `/assets/${imageComponentName}.png`,
      node: node,
    });

    if (isEmpty(node.getChildren())) {
      if (option.uiFramework === UiFramework.react) {
        return [`<img src={${imageComponentName}} alt=${alt} />`];
      }

      return [`<img src="./assets/${imageComponentName}.png" alt=${alt} />`];
    }

    node.addCssAttributes({
      "background-image": `url('.${`/assets/${imageComponentName}.png`}')`,
    });

    return [`<div ${this.getProps(node, option)}>`, `</div>`];
  }
}
