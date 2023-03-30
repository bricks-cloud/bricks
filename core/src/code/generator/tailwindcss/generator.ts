import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { getFileExtensionFromLanguage } from "../util";
import { convertCssClassesToTwcssClasses } from "./css-to-twcss";
import {
  instantiateFontsRegistryGlobalInstance,
  FontsRegistryGlobalInstance,
} from "./fonts-registry";
import { Generator as HtmlGenerator } from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";

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
    if (option.uiFramework === UiFramework.react) {
      const content = this.htmlGenerator.generateHtml(node, option);
      return this.reactGenerator.generateReactFileContent(
        content,
        mainComponentName,
        [`import "./style.css"`]
      );
    }

    return this.htmlGenerator.generateHtml(node, option);
  }

  generateFiles(node: Node, option: Option): File[] {
    instantiateFontsRegistryGlobalInstance(node);

    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option);
    const mainFile: File = {
      content: this.generateMainFileContent(node, option, mainComponentName),
      path: `/${mainComponentName}.${mainFileExtension}`,
    };

    const twcssConfigFile: File = {
      content: buildTwcssConfigFileContent(mainFileExtension),
      path: `/tailwind.config.js`,
    };

    const twcssFile: File = {
      content: buildTwcssCssFileContent(),
      path: `/style.css`,
    };

    return [mainFile, twcssConfigFile, twcssFile];
  }
}

const getProps = (node: Node, option: Option): string => {
  const classPropName =
    option.uiFramework === UiFramework.react ? "className" : "class";

  switch (node.getType()) {
    case NodeType.TEXT:
      return constructClassProp(
        classPropName,
        convertCssClassesToTwcssClasses(node.getCssAttributes())
      );
    case NodeType.GROUP:
      return constructClassProp(
        classPropName,
        convertCssClassesToTwcssClasses({
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        })
      );
    case NodeType.VISIBLE:
      return constructClassProp(
        classPropName,
        convertCssClassesToTwcssClasses({
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        })
      );
  }
};

const constructClassProp = (classPropName: string, value: string) => {
  if (isEmpty(value)) {
    return "";
  }

  return `${classPropName}="${value}"`;
};

// buildTwcssConfigFileContent builds file content for tailwind.config.js.
export const buildTwcssConfigFileContent = (
  mainComponentFileExtension: string
) => {
  let fontFamilies = "";
  const entries = FontsRegistryGlobalInstance.getFontMetadataInArray();

  if (!isEmpty(entries)) {
    fontFamilies = entries
      .map((metadata) => `"${metadata.alias}": "${metadata.familyCss}",`)
      .join("");
  }

  const fontFamilyConfig = !isEmpty(fontFamilies)
    ? `fontFamily: {
      ${fontFamilies}
    },`
    : "";

  const file = `module.exports = {
    content: ["./*.${mainComponentFileExtension}"],
    theme: {
      ${fontFamilyConfig}
        extend: {},
      },
      plugins: [],
    };
    `;

  return file;
};

// buildTwcssCssFileContent builds file content for tailwindcss style.css.
export const buildTwcssCssFileContent = () => {
  let fontImportStatements = "";
  const googleFontUrl = FontsRegistryGlobalInstance.getGoogleFontUrl();
  if (!isEmpty(googleFontUrl)) {
    fontImportStatements = `@import url("${googleFontUrl}");`;
  }

  const file = `@tailwind base;
  @tailwind components;
  @tailwind utilities;
  ${fontImportStatements}
  `;

  return file;
};
