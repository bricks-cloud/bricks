import { isEmpty } from "../../../utils";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType } from "../../../bricks/node";
import { getFileExtensionFromLanguage } from "../util";
import {
  convertCssClassesToTwcssClasses,
  getImageFileNameFromUrl,
} from "./css-to-twcss";
import { FontsRegistryGlobalInstance } from "./fonts-registry";
import {
  Generator as HtmlGenerator,
  InFileComponentMeta,
  InFileDataMeta,
} from "../html/generator";
import { Generator as ReactGenerator } from "../react/generator";
import { filterAttributes } from "../../../bricks/util";
import { shouldUseAsBackgroundImage } from "../util";
import { Attributes } from "../../../design/adapter/node";
import { assetRegistryGlobalInstance } from "../../asset-registry/asset-registry";
// import { RadialGradientGlobalRegistry } from "./radient-registry";

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
        true,
        inFileData,
        inFileComponents
      );
    }

    return mainFileContent;
  }

  async generateFiles(node: Node, option: Option): Promise<File[]> {
    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option);

    const mainFileContent = await this.generateMainFileContent(
      node,
      option,
      mainComponentName
    );

    const mainFile: File = {
      content: mainFileContent,
      path: `/${mainComponentName}.${mainFileExtension}`,
    };

    // generate local asset files
    const extraFiles: File[] = [];
    Object.values(assetRegistryGlobalInstance.getAllAssets()).forEach(
      (asset) => {
        if (asset.type === "local") {
          extraFiles.push({
            content: asset.content,
            path: asset.src,
          });
        }
      }
    );

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
const getPropsFromNode = (node: Node, option: Option): string => {
  switch (node.getType()) {
    case NodeType.TEXT: {
      const attributes: Attributes = {
        ...{
          ...filterAttributes(node.getPositionalCssAttributes(), {
            absolutePositioningFilter: true,
          }),
          ...filterAttributes(node.getPositionalCssAttributes(), {
            marginFilter: true,
          }),
        },
        ...node.getCssAttributes(),
      };

      return convertCssClassesToTwcssClasses(attributes, option, node, {});
    }
    case NodeType.GROUP:
      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node
      );
    case NodeType.VISIBLE:
      return convertCssClassesToTwcssClasses(
        {
          ...node.getPositionalCssAttributes(),
          ...node.getCssAttributes(),
        },
        option,
        node
      );

    case NodeType.IMAGE:
      if (isEmpty(node.getChildren())) {
        return convertCssClassesToTwcssClasses(
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

      return convertCssClassesToTwcssClasses(
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
          node
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
        node
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
        node
      );

    default:
      return "";
  }
};

// buildTwcssConfigFileContent builds file content for tailwind.config.js.
export const buildTwcssConfigFileContent = (
  mainComponentFileExtension: string
) => {
  let fontFamilies = "";
  let backgroundImages = "";
  const fontEntries = FontsRegistryGlobalInstance.getFontMetadataInArray();
  // const radientGradientExists: boolean = RadialGradientGlobalRegistry.getRadialGradientExist();

  if (!isEmpty(fontEntries)) {
    fontFamilies = fontEntries
      .map((metadata) => `"${metadata.alias}": "${metadata.familyCss}",`)
      .join("");
  }

  Object.values(assetRegistryGlobalInstance.getAllAssets()).forEach((asset) => {
    if (asset.src.endsWith("png") && !isEmpty(asset.node.getChildren())) {
      backgroundImages += `"${getImageFileNameFromUrl(asset.src)}": "url(${
        asset.src
      })",`;
    }
    if (asset.src.endsWith("svg") && shouldUseAsBackgroundImage(asset.node)) {
      backgroundImages += `"${getImageFileNameFromUrl(asset.src)}": "url(${
        asset.src
      })",`;
    }
  });

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
        extend: {
          ${backgroundImagesConfig}
        },
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
