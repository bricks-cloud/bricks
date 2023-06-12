import { isEmpty } from "../../../utils";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import { getFileExtensionFromLanguage, snakeCaseToCamelCase } from "../util";
import {
  Generator as HtmlGenerator,
  InFileComponentMeta,
  InFileDataMeta,
} from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";
import { getFontsMetadata } from "../font";
import { computeGoogleFontURL } from "../../../google/google-fonts";
import { filterAttributes } from "../../../bricks/util";
import { AssetType, assetRegistryGlobalInstance } from "../../asset-registry/asset-registry";

export class Generator {
  htmlGenerator: HtmlGenerator;
  reactGenerator: ReactGenerator;

  constructor() {
    this.htmlGenerator = new HtmlGenerator(
      getPropsFromNode,
      convertCssClassesToInlineStyle
    );
    this.reactGenerator = new ReactGenerator();
  }

  async generateMainFileContent(
    node: Node,
    option: Option,
    mainComponentName: string,
    isCssFileNeeded: boolean
  ): Promise<string> {
    const mainFileContent = await this.htmlGenerator.generateHtml(node, option);

    const [inFileComponents, inFileData]: [
      InFileComponentMeta[],
      InFileDataMeta[]
    ] = this.htmlGenerator.getExtraComponentsMetaData();

    if (option.uiFramework === UiFramework.react) {
      return this.reactGenerator.generateReactFileContent(
        mainFileContent,
        mainComponentName,
        isCssFileNeeded,
        inFileData,
        inFileComponents
      );
    }

    return mainFileContent;
  }

  async generateFiles(node: Node, option: Option): Promise<File[]> {
    const fontMetadata = getFontsMetadata(node);
    const googleFontUrl = computeGoogleFontURL(fontMetadata);
    const mainComponentName = "GeneratedComponent";
    let isCssFileNeeded: boolean = false;

    if (!isEmpty(googleFontUrl)) {
      isCssFileNeeded = true;
    }

    const mainFileContent = await this.generateMainFileContent(
      node,
      option,
      mainComponentName,
      isCssFileNeeded
    );

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${getFileExtensionFromLanguage(option)}`,
    };

    // generate local asset files
    const extraFiles: File[] = [];
    Object.values(assetRegistryGlobalInstance.getAllAssets()).forEach(
      (asset) => {
        if (asset.type === AssetType.local) {
          extraFiles.push({
            content: asset.content,
            path: asset.src,
          });
        }
      }
    );

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
    fontImportStatements = `@import url("${fontUrl}");\n\n
    button {
      border: none;
      background: none;
      cursor: pointer;
    }
    `;
  }

  const file = fontImportStatements;

  return file;
};

// getProps retrieves formated css classes such as style="justify-content: center;" from a single node
const getPropsFromNode = (node: Node, option: Option): string => {
  switch (node.getType()) {
    case NodeType.TEXT:
      return convertCssClassesToInlineStyle(
        {
          ...{
            ...filterAttributes(node.getPositionalCssAttributes(), {
              absolutePositioningFilter: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              marginFilter: true,
            }),
          },
          ...node.getCssAttributes(),
        },
        option,
        node
      );
    case NodeType.GROUP:
      return convertCssClassesToInlineStyle(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node
      );
    case NodeType.VISIBLE:
      const attribtues: Attributes = node.getCssAttributes();
      if (isEmpty(node.getChildren()) && !isEmpty(attribtues)) {
        const height: string = attribtues["height"];
        attribtues["min-height"] = height;
        delete attribtues["height"];
        node.setCssAttributes(attribtues);
      }

      return convertCssClassesToInlineStyle(
        {
          ...node.getCssAttributes(),
          ...node.getPositionalCssAttributes(),
        },
        option,
        node
      );
    case NodeType.IMAGE:
      if (isEmpty(node.getChildren())) {
        return convertCssClassesToInlineStyle(
          {
            ...filterAttributes(node.getCssAttributes(), {
              excludeBackgroundColor: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              absolutePositioningFilter: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              marginFilter: true,
            }),
          },
          option,
          node
        );
      }

      return convertCssClassesToInlineStyle(
        {
          ...node.getPositionalCssAttributes(),
          ...filterAttributes(node.getCssAttributes(), {
            excludeBackgroundColor: true,
          }),
        },
        option,
        node
      );
    case NodeType.VECTOR:
      if (isEmpty(node.getChildren())) {
        return convertCssClassesToInlineStyle(
          {
            ...filterAttributes(node.getPositionalCssAttributes(), {
              absolutePositioningFilter: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              marginFilter: true,
            }),
          },
          option,
          node
        );
      }

      return convertCssClassesToInlineStyle(
        {
          ...node.getPositionalCssAttributes(),
          ...filterAttributes(node.getCssAttributes(), {
            excludeBackgroundColor: true,
          }),
        },
        option,
        node
      );
    // TODO: VECTOR_GROUP node type is deprecated
    case NodeType.VECTOR_GROUP:
      return convertCssClassesToInlineStyle(
        {
          ...filterAttributes(node.getPositionalCssAttributes(), {
            absolutePositioningFilter: true,
          }),
          ...filterAttributes(node.getPositionalCssAttributes(), {
            marginFilter: true,
          }),
        },
        option,
        node
      );
  }
};

// convertCssClassesToInlineStyle converts attributes to formated css classes
const convertCssClassesToInlineStyle = (
  attributes: Attributes,
  option: Option,
  node: Node
) => {
  let inlineStyle: string = "";
  const cssEntries: [string, string][] = Object.entries(attributes);

  if (option.uiFramework === UiFramework.react) {
    const lines: string[] = [];
    cssEntries.forEach(([key, value]) => {
      lines.push(`${snakeCaseToCamelCase(key)}: "${value}"`);
    });

    inlineStyle = `{{${placeBackgroundAtTheBeginning(lines, option)}}}`;

    return `style=${inlineStyle}`;
  }

  const lines: string[] = [];
  cssEntries.forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });

  if (isEmpty(lines)) {
    return "";
  }

  inlineStyle = `${lines.join("; ")}`;

  return `style="${inlineStyle}"`;
};

const placeBackgroundAtTheBeginning = (
  styles: string[],
  option: Option
): string => {
  styles.sort((a, b): number => {
    if (a.startsWith("background")) {
      return -1;
    }

    if (b.startsWith("background")) {
      return 1;
    }
    return 0;
  });

  if (option.uiFramework === UiFramework.react) {
    return styles.join(",");
  }

  return styles.join(";");
};
