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
  ): Promise<[string, ImportedComponentMeta[]]> {
    const mainFileContent = await this.htmlGenerator.generateHtml(node, option);

    const [inFileComponents, inFileData]: [
      InFileComponentMeta[],
      InFileDataMeta[]
    ] = this.htmlGenerator.getExtraComponentsMetaData();

    const importComponents =
      extraFileRegistryGlobalInstance.getImportComponentMeta();

    if (option.uiFramework === UiFramework.react) {
      return [
        this.reactGenerator.generateReactFileContent(
          mainFileContent,
          mainComponentName,
          isCssFileNeeded,
          [],
          inFileData,
          inFileComponents
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
    let [variableProps, cssKeyConnectedToProps]: [string[], Set<string>] =
      getVariablePropForCss(node.getId());
    const lines: string[] = [];
    cssEntries.forEach(([key, value]) => {
      if (cssKeyConnectedToProps.has(key)) {
        return;
      }

      lines.push(`${snakeCaseToCamelCase(key)}: "${value}"`);
    });

    variableProps = filterStyles(variableProps, node);

    if (isEmpty(variableProps) && isEmpty(lines)) {
      return "";
    }

    if (isEmpty(variableProps)) {
      return `style=${`{{${placeBackgroundAtTheBeginning(lines, option)}}}`}`;
    }

    if (isEmpty(lines)) {
      return `style=${`{{${placeBackgroundAtTheBeginning(
        variableProps,
        option
      )}}}`}`;
    }

    inlineStyle = `{{${placeBackgroundAtTheBeginning(
      [...lines, ...variableProps],
      option
    )}}}`;

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

const filterStyles = (styles: string[], node: Node) => {
  const type: NodeType = node.getType();
  if (type !== NodeType.VECTOR && type !== NodeType.IMAGE) {
    return styles;
  }

  if (!isEmpty(node.getChildren())) {
    return styles;
  }

  return styles.filter(
    (style) => !style.startsWith("width") && !style.startsWith("height")
  );
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
