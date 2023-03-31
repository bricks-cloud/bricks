import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import { getFileExtensionFromLanguage, constructExtraSvgFiles } from "../util";
import {
  Generator as HtmlGenerator,
  ImportedComponentMeta,
} from "../html/generator";
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

  async generateMainFileContent(
    node: Node,
    option: Option,
    mainComponentName: string,
  ): Promise<[string, ImportedComponentMeta[]]> {
    const [mainFileContent, importComponents] =
      await this.htmlGenerator.generateHtml(node, option);
    const importStatements: string[] = [`import "./style.css"`];

    for (const importComponent of importComponents) {
      importStatements.push(
        `import ${importComponent.componentName} from ".${importComponent.importPath}"`,
      );
    }

    if (option.uiFramework === UiFramework.react) {
      return [
        this.reactGenerator.generateReactFileContent(
          mainFileContent,
          mainComponentName,
          importStatements,
        ),
        importComponents,
      ];
    }

    return [mainFileContent, importComponents];
  }

  async generateFiles(node: Node, option: Option): Promise<File[]> {
    const sortedFontdata = getSortedFontsMetadata(node);
    const googleFontUrl = computeGoogleFontURL(sortedFontdata);
    const mainComponentName = "GeneratedComponent";
    const [mainFileContent, importComponents] =
      await this.generateMainFileContent(node, option, mainComponentName);

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${getFileExtensionFromLanguage(option)}`,
    };

    let extraFiles: File[] = [];
    if (!isEmpty(importComponents)) {
      extraFiles = await constructExtraSvgFiles(importComponents);
    }

    if (isEmpty(googleFontUrl)) {
      const cssFile: File = {
        content: buildCssFileContent(googleFontUrl),
        path: `/style.css`,
      };

      return [mainFile, cssFile, ...extraFiles];
    }

    return [mainFile, ...extraFiles];
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

// getProps retrieves formated css classes such as style="justify-content: center;" from a single node
const getProps = (node: Node, option: Option): string => {
  switch (node.getType()) {
    case NodeType.TEXT:
      return constructStyleProp(
        convertCssClassesToInlineStyle(node.getCssAttributes(), option),
        option,
      );
    case NodeType.GROUP:
      return constructStyleProp(
        convertCssClassesToInlineStyle(
          {
            ...node.getPositionalCssAttributes(),
            ...node.getCssAttributes(),
          },
          option,
        ),
        option,
      );
    case NodeType.VISIBLE:
      return constructStyleProp(
        convertCssClassesToInlineStyle(
          {
            ...node.getCssAttributes(),
            ...node.getPositionalCssAttributes(),
          },
          option,
        ),
        option,
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

// styling in React requires CSS property to be camel cased such as style={{ justifyContent: "center" }}
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

// convertCssClassesToInlineStyle converts attributes to formated css classes
const convertCssClassesToInlineStyle = (
  attributes: Attributes,
  option: Option,
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
