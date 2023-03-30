import { isEmpty } from "lodash";
import { CssFramework, Option, UiFramework } from "../../code";
import { Node, NodeType, TextNode } from "../../../bricks/node";

export type GetProps = (node: Node, option: Option) => string;

export class Generator {
  getProps: GetProps;

  constructor(getProps: GetProps) {
    this.getProps = getProps;
  }

  generateHtml(node: Node, option: Option): string {
    switch (node.getType()) {
      case NodeType.TEXT:
        const textNode = node as TextNode;
        const textNodeClassProps = this.getProps(node, option);
        const tag =
          option.cssFramework === CssFramework.tailwindcss ? "p" : "div";

        return `<${tag} ${textNodeClassProps}>${textNode.getText()}</${tag}>`;
      case NodeType.GROUP:
        // this edge case should never happen
        if (isEmpty(node.getChildren())) {
          return `<div />`;
        }

        const groupNodeClassProps = this.getProps(node, option);
        return this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${groupNodeClassProps}>`, "</div>"],
          option
        );
      case NodeType.VISIBLE:
        const visibleNodeClassProps = this.getProps(node, option);

        if (isEmpty(node.getChildren())) {
          return `<div ${visibleNodeClassProps} />`;
        }

        return this.generateHtmlFromNodes(
          node.getChildren(),
          [`<div ${visibleNodeClassProps}>`, "</div>"],
          option
        );
    }

    return `<div></div>`;
  }

  private generateHtmlFromNodes(
    nodes: Node[],
    [openingTag, closingTag]: string[],
    option: Option
  ): string {
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

          childrenCodeStrings.push(
            this.generateHtmlFromNodes(
              child.getChildren(),
              [`<div ${groupNodeClassProps}>`, "</div>"],
              option
            )
          );
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

          childrenCodeStrings.push(
            this.generateHtmlFromNodes(
              child.getChildren(),
              [`<div ${visibleNodeClassProps}>`, "</div>"],
              option
            )
          );
        case NodeType.VECTOR:
          continue;
      }
    }

    return openingTag + childrenCodeStrings.join("") + closingTag;
  }
}
