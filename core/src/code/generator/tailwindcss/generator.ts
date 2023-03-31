import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { getFileExtensionFromLanguage, constructExtraSvgFiles } from "../util";
import { convertCssClassesToTwcssClasses } from "./css-to-twcss";
import {
  instantiateFontsRegistryGlobalInstance,
  FontsRegistryGlobalInstance,
} from "./fonts-registry";
import { Generator as HtmlGenerator, ImportedComponentMeta } from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";

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
    mainComponentName: string
  ): Promise<[string, ImportedComponentMeta[]]> {

    const [mainFileContent, importComponents] = await this.htmlGenerator.generateHtml(node, option);
    const importStatements: string[] = [`import "./style.css"`];

    for (const importComponent of importComponents) {
      importStatements.push(`import ${importComponent.componentName} from ".${importComponent.importPath}"`);
    }

    if (option.uiFramework === UiFramework.react) {
      return [this.reactGenerator.generateReactFileContent(
        mainFileContent,
        mainComponentName,
        importStatements
      ), importComponents];
    }

    return [mainFileContent, importComponents];
  }

  async generateFiles(node: Node, option: Option): Promise<File[]> {
    instantiateFontsRegistryGlobalInstance(node);

    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option);


    const [mainFileContent, importComponents] = await this.generateMainFileContent(node, option, mainComponentName);

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${mainFileExtension}`,
    };

    let extraFiles: File[] = [];
    if (!isEmpty(importComponents)) {
      extraFiles = await constructExtraSvgFiles(importComponents);
    }

    const twcssConfigFile: File = {
      content: buildTwcssConfigFileContent(mainFileExtension),
      path: `/tailwind.config.js`,
    };

    const twcssFile: File = {
      content: buildTwcssCssFileContent(),
      path: `/style.css`,
    };

    return [mainFile, twcssConfigFile, twcssFile, ...extraFiles];
  }
}

// getProps converts a single node to formated tailwindcss classes
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
    default:
      return "";
  }
};

// constructClassProp creates a compelete class property that can be used in html elements or React components
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
