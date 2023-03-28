import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType, TextNode, VisibleNode } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import { getFileExtensionFromLanguage } from "../util";
import { getTwcssClass } from "./css-to-twcss";
import { instantiateFontsRegistryGlobalInstance, FontsRegistryGlobalInstance } from "./fonts-registry";

// convertToTwcssFiles converts a Bricks node to tailwindcss files according to different options.
export const convertToTwcssFiles = (node: Node, option: Option): File[] => {
    instantiateFontsRegistryGlobalInstance(node);

    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option.language);
    const mainFile: File = {
        content: generateMainFileContent(node, option, mainComponentName),
        path: `/GeneratedComponent.${getFileExtensionFromLanguage(option.language)}`,
    };

    const twcssConfigFile: File = {
        content: buildTwcssConfigFileContent(mainFileExtension),
        path: `/tailwind.config.js`,
    };

    const twcssFile: File = {
        content: buildTwcssCssFileContent(),
        path: `/style.css`,
    }

    return [mainFile, twcssConfigFile, twcssFile];
};

// generateMainFileContent generates the main file given Bricks node and options.
const generateMainFileContent = (node: Node, option: Option, mainComponentName: string): string => {
    const importStatements = [
        `import React from "react";`,
        `import "./style.css";`
    ];

    const mainComponent = `const ${mainComponentName} = () => (${generateMainComponentFromNode(node, option)});`;

    const exportStatements = [
        `export default ${mainComponentName};`,
    ];


    return importStatements.join("\n") + "\n\n" + mainComponent + "\n\n" + exportStatements.join("\n");
};

// generateMainComponentFromNode generates jsx elements from a single node and options.
const generateMainComponentFromNode = (node: Node, option: Option): string => {
    const classPropName = option.uiFramework === UiFramework.react ? "className" : "class";

    switch (node.getType()) {
        case NodeType.TEXT:
            const textNode = node as TextNode;
            const textNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses(textNode.getCSSAttributes())}"`;

            return `<p ${textNodeClassProps}>${textNode.getText()}</p>`;
        case NodeType.GROUP:
            // this edge case should never happen
            if (isEmpty(node.getChildren())) {
                return `<div />`;
            }

            const groupNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses({
                ...node.getPositionalCssAttributes(),
                ...node.getCSSAttributes(),
            })}"`;

            return generateMainComponentFromNodes(node.getChildren(), [`<div ${groupNodeClassProps}>`, "</div>"], classPropName);
        case NodeType.VISIBLE:
            const visibleNode = node as VisibleNode;
            const visibleNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses({
                ...visibleNode.getCSSAttributes(),
                ...visibleNode.getPositionalCssAttributes(),
            })}"`;
            if (isEmpty(node.getChildren())) {
                return `<div ${visibleNodeClassProps} />`;
            }

            return generateMainComponentFromNodes(node.getChildren(), [`<div ${visibleNodeClassProps}>`, "</div>"], classPropName);
    }

    return `<div />`;
};

// generateMainComponentFromNodes generates jsx elements from nodes, options and opening closing HTML tag recursively.
const generateMainComponentFromNodes = (nodes: Node[], [openingTag, closingTag]: string[], classPropName: string): string => {
    let childrenCodeStrings: string[] = [];

    for (const child of nodes) {
        switch (child.getType()) {
            case NodeType.TEXT:
                const textNode = child as TextNode;
                const textNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses(textNode.getCSSAttributes())}"`;
                childrenCodeStrings.push(`<p ${textNodeClassProps}>${textNode.getText()}</p>`);
                continue;
            case NodeType.GROUP:
                // this edge case should never happen
                if (isEmpty(child.getChildren())) {
                    childrenCodeStrings.push(`<div />`);
                    continue;
                }

                const groupNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses({
                    ...child.getCSSAttributes(),
                    ...child.getPositionalCssAttributes(),
                })}"`;

                childrenCodeStrings.push(generateMainComponentFromNodes(child.getChildren(), [`<div ${groupNodeClassProps}>`, "</div>"], classPropName));
                continue;
            case NodeType.VISIBLE:
                const visibleNode = child as VisibleNode;
                const visibleNodeClassProps = `${classPropName}="${convertCssClassesToTwcssClasses({
                    ...visibleNode.getCSSAttributes(),
                    ...visibleNode.getPositionalCssAttributes(),
                })}"`;
                if (isEmpty(child.getChildren())) {
                    childrenCodeStrings.push(`<div ${visibleNodeClassProps} />`);
                    continue;
                }

                childrenCodeStrings.push(generateMainComponentFromNodes(child.getChildren(), [`<div ${visibleNodeClassProps}>`, "</div>"], classPropName));
                continue;
            case NodeType.VECTOR:
                continue;
        }
    }

    return openingTag + childrenCodeStrings.join("") + closingTag
};

// convertCssClassesToTwcssClasses converts css classes to tailwindcss classes
const convertCssClassesToTwcssClasses = (attributes: Attributes): string => {
    let content = "";

    Object.entries(attributes).forEach(([property, value]) => {
        content = content + " " + getTwcssClass(property, value, attributes);
    });

    return content.trim();
}

// buildTwcssConfigFileContent builds file content for tailwind.config.js.
export const buildTwcssConfigFileContent = (
    mainComponentFileExtension: string
) => {
    let fontFamilies = "";
    const entries = FontsRegistryGlobalInstance.getFontMetadataInArray();

    if (!isEmpty(entries)) {
        fontFamilies = entries
            .map(
                (metadata) =>
                    `"${metadata.alias}": "${metadata.familyCss}",`
            )
            .join("")
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
        fontImportStatements = `@import url("${googleFontUrl}");`
    }

    const file = `@tailwind base;
  @tailwind components;
  @tailwind utilities;
  ${fontImportStatements}
  `;

    return file;
};
