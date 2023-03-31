import { isEmpty } from "lodash";
import { CssFramework, Option, UiFramework } from "../../code";
import { Node, NodeType, TextNode, VectorGroupNode, VectorNode } from "../../../bricks/node";
import { ExportFormat } from "../../../design/adapter/node";

export type GetProps = (node: Node, option: Option) => string;

export type ImportedComponentMeta = {
  node: VectorGroupNode | VectorNode,
  importPath: string,
  componentName: string,
}

export class Generator {
  getProps: GetProps;
  private numberOfVectors: number = 1;

  constructor(getProps: GetProps) {
    this.getProps = getProps;
  }

  async generateHtml(node: Node, option: Option): Promise<[string, ImportedComponentMeta[]]> {
    const importComponents: ImportedComponentMeta[] = [];

    switch (node.getType()) {
      case NodeType.TEXT:
        const textNode = node as TextNode;
        const textNodeClassProps = this.getProps(node, option);
        const tag =
          option.cssFramework === CssFramework.tailwindcss ? "p" : "div";

        return [`<${tag} ${textNodeClassProps}>${textNode.getText()}</${tag}>`, importComponents];

      case NodeType.GROUP:
        // this edge case should never happen
        if (isEmpty(node.getChildren())) {
          return [`<div />`, importComponents];
        }

        const groupNodeClassProps = this.getProps(node, option);
        return [await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${groupNodeClassProps}>`, "</div>",],
          option,
          importComponents,
        ), importComponents];

      case NodeType.VISIBLE:
        const visibleNodeClassProps = this.getProps(node, option);

        if (isEmpty(node.getChildren())) {
          return [`<div ${visibleNodeClassProps} />`, importComponents];
        }

        return [await this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${visibleNodeClassProps}>`, "</div>",],
          option,
          importComponents,
        ), importComponents];

      case NodeType.VECTOR_GROUP:
        const vectorGroupNode = node as VectorGroupNode;
        return [await this.generateHtmlElementForVectorNodes(vectorGroupNode, option, importComponents), importComponents]


      case NodeType.VECTOR:
        const vectorNode = node as VectorGroupNode;
        return [await this.generateHtmlElementForVectorNodes(vectorNode, option, importComponents), importComponents]
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
            childrenCodeStrings.push(`<div><div />`);
            continue;
          }

          const groupNodeClassProps = this.getProps(child, option);
          const groupNodeCodeString = await this.generateHtmlFromNodes(
            child.getChildren(),
            [`<div ${groupNodeClassProps}>`, "</div>"],
            option,
            importComponents,
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
            importComponents,
          );
          childrenCodeStrings.push(visibleNodeCodeString);
          continue;

        case NodeType.VECTOR_GROUP:
          const vectorGroupNode = child as VectorGroupNode;
          const vectorGroupCodeString = await this.generateHtmlElementForVectorNodes(vectorGroupNode, option, importComponents);
          childrenCodeStrings.push(vectorGroupCodeString);
          continue;

        case NodeType.VECTOR:
          const vectorNode = child as VectorGroupNode;
          const vectorCodeString = await this.generateHtmlElementForVectorNodes(vectorNode, option, importComponents);
          childrenCodeStrings.push(vectorCodeString);
          continue;
      }
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }

  private async generateHtmlElementForVectorNodes(node: VectorNode | VectorGroupNode, option: Option, importComponents: ImportedComponentMeta[]) {
    const vectorComponentName = "SvgAsset" + this.numberOfVectors;
    this.numberOfVectors++;

    if (option.uiFramework === UiFramework.react) {
      importComponents.push({
        componentName: vectorComponentName,
        importPath: `/assets/${vectorComponentName}.svg`,
        node: node,
      });

      return `<img src={${vectorComponentName}} alt=${`"Svg Asset ${this.numberOfVectors}"`} />`;
    }


    return await node.exportAsSvg(ExportFormat.SVG);
  }
}