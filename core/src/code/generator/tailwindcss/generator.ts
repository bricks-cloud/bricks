import { isEmpty } from "../../../utils";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import {
  getFileExtensionFromLanguage,
  constructExtraFiles,
  getExtensionFromFilePath,
} from "../util";
import {
  convertCssClassesToTwcssClasses,
  getImageFileNameFromUrl,
} from "./css-to-twcss";
import { FontsRegistryGlobalInstance } from "./fonts-registry";
import {
  Generator as HtmlGenerator,
  ImportedComponentMeta,
  InFileComponentMeta,
  InFileDataMeta,
} from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";
import { filterAttributes } from "../../../bricks/util";
import { extraFileRegistryGlobalInstance } from "../../extra-file-registry/extra-file-registry";
import { nameRegistryGlobalInstance } from "../../name-registry/name-registry";
import { shouldUseAsBackgroundImage } from "../util";
import { Attributes } from "../../../design/adapter/node";

export class Generator {
  htmlGenerator: HtmlGenerator;
  reactGenerator: ReactGenerator;

  constructor() {
    this.htmlGenerator = new HtmlGenerator(
      getPropsFromNode,
      convertCssClassesToTwcssClasses
    );
    this.reactGenerator = new ReactGenerator();
  }

  async generateMainFileContent(
    node: Node,
    option: Option,
    mainComponentName: string
  ): Promise<[string, ImportedComponentMeta[]]> {
    const mainFileContent = await this.htmlGenerator.generateHtml(node, option);

    const importComponents: ImportedComponentMeta[] =
      extraFileRegistryGlobalInstance.getImportComponentMeta();
    const [inFileComponents, inFileData]: [
      InFileComponentMeta[],
      InFileDataMeta[]
    ] = this.htmlGenerator.getExtraComponentsMetaData();

    if (option.uiFramework === UiFramework.react) {
      return [
        this.reactGenerator.generateReactFileContent(
          mainFileContent,
          mainComponentName,
          true,
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
    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option);

    const [mainFileContent, importComponents] =
      await this.generateMainFileContent(node, option, mainComponentName);

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${mainFileExtension}`,
    };

    let extraFiles: File[] = [];
    if (!isEmpty(importComponents)) {
      extraFiles = await constructExtraFiles(importComponents);
    }

    const twcssConfigFile: File = {
      content: buildTwcssConfigFileContent(mainFileExtension, importComponents),
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
const getPropsFromNode = (node: Node, option: Option): string => {
  switch (node.getType()) {
    case NodeType.TEXT: {
      const attributes: Attributes = {
        ...node.getCssAttributes(),
        ...node.getPositionalCssAttributes(),
      };

      //@ts-ignore
      const listSegments = node.node.getListSegments();
      // Extra classes needed for lists due to Tailwind's CSS reset
      const listType = listSegments[0].listType;
      if (listSegments.length === 1 && listType === "ul") {
        attributes["list-style-type"] = "disc";
      }

      if (listSegments.length === 1 && listType === "ol") {
        attributes["list-style-type"] = "decimal";
      }

      return convertCssClassesToTwcssClasses(attributes, option, node.getId());
    }
    case NodeType.GROUP:
      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node.getId()
      );
    case NodeType.VISIBLE:
      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node.getId()
      );

    case NodeType.IMAGE:
      if (shouldUseAsBackgroundImage(node)) {
        const id: string = node.getId();
        const imageComponentName: string =
          nameRegistryGlobalInstance.getImageName(id);

        node.addCssAttributes({
          "background-image": `url('./assets/${imageComponentName}.png')`,
        });
      }

      if (isEmpty(node.getChildren())) {
        return convertCssClassesToTwcssClasses(
          {
            ...filterAttributes(node.getPositionalCssAttributes(), {
              absolutePositioningFilter: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              marginFilter: true,
            }),
          },
          option,
          node.getId()
        );
      }

      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...filterAttributes(node.getCssAttributes(), {
            excludeBackgroundColor: true,
          }),
        },
        option,
        node.getId()
      );

    case NodeType.VECTOR:
      if (shouldUseAsBackgroundImage(node)) {
        const id: string = node.getId();
        const imageComponentName: string =
          nameRegistryGlobalInstance.getImageName(id);

        node.addCssAttributes({
          "background-image": `url('./assets/${imageComponentName}.svg')`,
        });
      }

      if (isEmpty(node.getChildren())) {
        return convertCssClassesToTwcssClasses(
          {
            ...filterAttributes(node.getPositionalCssAttributes(), {
              absolutePositioningFilter: true,
            }),
            ...filterAttributes(node.getPositionalCssAttributes(), {
              marginFilter: true,
            }),
          },
          option,
          node.getId()
        );
      }

      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...filterAttributes(node.getCssAttributes(), {
            excludeBackgroundColor: true,
          }),
        },
        option,
        node.getId()
      );
    // TODO: VECTOR_GROUP node type is deprecated
    case NodeType.VECTOR_GROUP:
      return convertCssClassesToTwcssClasses(
        {
          ...filterAttributes(node.getPositionalCssAttributes(), {
            absolutePositioningFilter: true,
          }),
          ...filterAttributes(node.getPositionalCssAttributes(), {
            marginFilter: true,
          }),
        },
        option,
        node.getId()
      );

    default:
      return "";
  }
};

// buildTwcssConfigFileContent builds file content for tailwind.config.js.
export const buildTwcssConfigFileContent = (
  mainComponentFileExtension: string,
  importComponents: ImportedComponentMeta[]
) => {
  let fontFamilies = "";
  let backgroundImages = "";
  const fontEntries = FontsRegistryGlobalInstance.getFontMetadataInArray();

  if (!isEmpty(fontEntries)) {
    fontFamilies = fontEntries
      .map((metadata) => `"${metadata.alias}": "${metadata.familyCss}",`)
      .join("");
  }

  if (!isEmpty(importComponents)) {
    importComponents.forEach((importComponent: ImportedComponentMeta) => {
      const extension = getExtensionFromFilePath(importComponent.importPath);
      if (extension === "png" && !isEmpty(importComponent.node.getChildren())) {
        backgroundImages += `"${getImageFileNameFromUrl(
          importComponent.importPath
        )}": "url(.${importComponent.importPath})",`;
      }

      if (
        extension === "svg" &&
        shouldUseAsBackgroundImage(importComponent.node)
      ) {
        backgroundImages += `"${getImageFileNameFromUrl(
          importComponent.importPath
        )}": "url(.${importComponent.importPath})",`;
      }
    });
  }

  const backgroundImagesConfig = !isEmpty(backgroundImages)
    ? `backgroundImage: {
    ${backgroundImages}
  },`
    : "";

  const fontFamilyConfig = !isEmpty(fontFamilies)
    ? `fontFamily: {
      ${fontFamilies}
    },`
    : "";

  const file = `module.exports = {
    content: ["./*.${mainComponentFileExtension}"],
    theme: {
      ${fontFamilyConfig}
      ${backgroundImagesConfig}
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

  const file = `${fontImportStatements}
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
`;

  return file;
};
