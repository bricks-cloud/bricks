import { isEmpty } from "../../../utils";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import {
  getFileExtensionFromLanguage,
  constructExtraFiles,
  snakeCaseToCamelCase,
} from "../util";
import {
  Generator as HtmlGenerator,
  ImportedComponentMeta,
  InFileComponentMeta,
  InFileDataMeta,
} from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";
import { getFontsMetadata } from "../font";
import { computeGoogleFontURL } from "../../../google/google-fonts";
import { filterAttributes } from "../../../bricks/util";
import { getVariablePropForCss } from "../../../../ee/code/prop";
import { extraFileRegistryGlobalInstance } from "../../extra-file-registry/extra-file-registry";

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
    isCssFileNeeded: boolean
  ): Promise<[string, ImportedComponentMeta[]]> {
    const mainFileContent =
      await this.htmlGenerator.generateHtml(node, option);

    const [inFileComponents, inFileData]: [InFileComponentMeta[], InFileDataMeta[]] = this.htmlGenerator.getExtraComponentsMetaData();

    const importComponents = extraFileRegistryGlobalInstance.getImportComponentMeta();

    if (option.uiFramework === UiFramework.react) {

      return [
        this.reactGenerator.generateReactFileContent(
          mainFileContent,
          mainComponentName,
          isCssFileNeeded,
          [],
          inFileData,
          inFileComponents,
        ),
        importComponents,
      ];
    }

    return [mainFileContent, importComponents];
  }

  async generateFiles(node: Node, option: Option): Promise<File[]> {
    const fontMetadata = getFontsMetadata(node);
    const googleFontUrl = computeGoogleFontURL(fontMetadata);
    const mainComponentName = "GeneratedComponent";
    let isCssFileNeeded: boolean = false;

    if (!isEmpty(googleFontUrl)) {
      isCssFileNeeded = true;
    }

    const [mainFileContent, importComponents] =
      await this.generateMainFileContent(
        node,
        option,
        mainComponentName,
        isCssFileNeeded
      );

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${getFileExtensionFromLanguage(option)}`,
    };

    let extraFiles: File[] = [];
    if (!isEmpty(importComponents)) {
      extraFiles = await constructExtraFiles(importComponents);
    }

    if (isCssFileNeeded) {
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
      return convertCssClassesToInlineStyle(
        {
          ...node.getCssAttributes(),
          ...filterAttributes(node.getPositionalCssAttributes(), {
            absolutePositioningOnly: true,
          }),
        },
        option,
        node.getId(),
      );
    case NodeType.GROUP:
      return convertCssClassesToInlineStyle(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node.getId(),
      );
    case NodeType.VISIBLE:
      return convertCssClassesToInlineStyle(
        {
          ...node.getCssAttributes(),
          ...node.getPositionalCssAttributes(),
        },
        option,
        node.getId(),
      );
    case NodeType.IMAGE:
      return convertCssClassesToInlineStyle(
        filterAttributes(
          {
            ...node.getPositionalCssAttributes(),
          },
          {
            absolutePositioningOnly: true,
          }
        ),
        option,
        node.getId(),
      );
    case NodeType.VECTOR:
      return convertCssClassesToInlineStyle(
        filterAttributes(node.getPositionalCssAttributes(), {
          absolutePositioningOnly: true,
        }),
        option,
        node.getId(),
      );
    case NodeType.VECTOR_GROUP:
      return convertCssClassesToInlineStyle(
        filterAttributes(node.getPositionalCssAttributes(), {
          absolutePositioningOnly: true,
        }),
        option,
        node.getId(),
      );
  }
};

// convertCssClassesToInlineStyle converts attributes to formated css classes
const convertCssClassesToInlineStyle = (
  attributes: Attributes,
  option: Option,
  id: string,
) => {
  let inlineStyle: string = "";
  if (option.uiFramework === UiFramework.react) {
    let [variableProps, cssKeyConnectedToProps]: [string, Set<string>] = getVariablePropForCss(id);
    const lines: string[] = [];
    Object.entries(attributes).forEach(([key, value]) => {
      if (cssKeyConnectedToProps.has(key)) {
        return;
      }

      lines.push(`${snakeCaseToCamelCase(key)}: "${value}"`);
    });

    if (isEmpty(variableProps)) {
      return `style=${`{{${lines.join(",")}}}`}`;
    }

    if (isEmpty(lines)) {
      return `style=${`{{${variableProps}}}`}`;
    }

    inlineStyle = `{{${lines.join(",") + "," + variableProps}}}`;

    return `style=${inlineStyle}`;
  }

  const lines: string[] = [];
  Object.entries(attributes).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });

  inlineStyle = `${lines.join("; ")}`;

  return `style="${inlineStyle}"`;
};
