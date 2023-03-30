import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import { getFileExtensionFromLanguage } from "../util";
import { Generator as HtmlGenerator } from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";
import { getSortedFontsMetadata } from "../font";
import { computeGoogleFontURL } from "../../../google/google-fonts";

export class Generator {
  htmlGenerator: HtmlGenerator;
  reactGenerator: ReactGenerator;

  constructor() {
    this.htmlGenerator = new HtmlGenerator(getProps);
    this.reactGenerator = new ReactGenerator();
  }

  generateMainFileContent(
    node: Node,
    option: Option,
    mainComponentName: string
  ): string {
    if (option.uiFramework === UiFramework.html) {
      return this.htmlGenerator.generateHtml(node, option);
    }

    const content = this.htmlGenerator.generateHtml(node, option);

    return this.reactGenerator.generateReactFileContent(
      content,
      mainComponentName,
      [`import "./style.css"`]
    );
  }

  generateFiles(node: Node, option: Option): File[] {
    const sortedFontdata = getSortedFontsMetadata(node);
    const googleFontUrl = computeGoogleFontURL(sortedFontdata);

    const mainComponentName = "GeneratedComponent";
    const mainFile: File = {
      content: this.generateMainFileContent(node, option, mainComponentName),
      path: `/${mainComponentName}.${getFileExtensionFromLanguage(option)}`,
    };

    const cssFile: File = {
      content: buildCssFileContent(googleFontUrl),
      path: `/style.css`,
    };

    return [mainFile, cssFile];
  }
}

// buildCssFileContent builds file content for style.css.
export const buildCssFileContent = (fontUrl: string) => {
  let fontImportStatements = "";
  if (!isEmpty(fontUrl)) {
    fontImportStatements = `@import url("${fontUrl}");`;
  }

  const file = fontImportStatements;

  return file;
};

const getProps = (node: Node, option: Option): string => {
  switch (node.getType()) {
    case NodeType.TEXT:
      return constructStyleProp(
        convertCssClassesToInlineStyle(node.getCssAttributes(), option),
        option
      );
    case NodeType.GROUP:
      return constructStyleProp(
        convertCssClassesToInlineStyle(
          {
            ...node.getPositionalCssAttributes(),
            ...node.getCssAttributes(),
          },
          option
        ),
        option
      );
    case NodeType.VISIBLE:
      return constructStyleProp(
        convertCssClassesToInlineStyle(
          {
            ...node.getCssAttributes(),
            ...node.getPositionalCssAttributes(),
          },
          option
        ),
        option
      );
  }
};

const constructStyleProp = (value: string, option: Option) => {
  if (isEmpty(value)) {
    return "";
  }

  if (option.uiFramework === UiFramework.react) {
    return `style=${value}`;
  }

  return `style="${value}"`;
};

const snakeCaseToCamelCase = (prop: string) => {
  const parts = prop.split("-");

  const camel = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      camel.push(part);
      continue;
    }

    camel.push(part.charAt(0).toUpperCase() + part.slice(1));
  }

  return camel.join("");
};

const convertCssClassesToInlineStyle = (
  attributes: Attributes,
  option: Option
) => {
  if (option.uiFramework === UiFramework.react) {
    const lines: string[] = [];
    Object.entries(attributes).forEach(([key, value]) => {
      lines.push(`${snakeCaseToCamelCase(key)}: "${value}"`);
    });

    return `{{${lines.join(",")}}}`;
  }

  const lines: string[] = [];
  Object.entries(attributes).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });

  return `${lines.join("; ")}`;
};
