import { isEmpty } from "lodash";
import { File, Option, UiFramework } from "../../code";
import { Node, NodeType, TextNode, VisibleNode } from "../../../bricks/node";
import { Attributes } from "../../../design/adapter/node";
import { getFileExtensionFromLanguage } from "../util";
import { getTailwindCssClass } from "./css-to-twcss";

// interface FontMetadata {
//     source: string;
//     tailwindAlias: string;
// }

export const convertToTailwindCssFiles = (node: Node, option: Option): File[] => {
    const mainComponentName = "GeneratedComponent";
    const mainFileExtension = getFileExtensionFromLanguage(option.language);
    const mainFile: File = {
        content: generateMainFileContent(node, option, mainComponentName),
        path: `/GeneratedComponent.${getFileExtensionFromLanguage(option.language)}`,
    };

    const twConfigFile: File = {
        content: `module.exports = {
            content: ["./*.${mainFileExtension}"],
            plugins: [],
          };`,
        path: `/tailwind.config.js`,
    };

    const twCssFile: File = {
        content: `@tailwind base;
        @tailwind components;
        @tailwind utilities;`,
        path: `/style.css`,
    }

    return [mainFile, twConfigFile, twCssFile];
};

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

const generateMainComponentFromNode = (node: Node, option: Option): string => {
    const classPropName = option.uiFramework === UiFramework.react ? "className" : "class";

    switch (node.getType()) {
        case NodeType.TEXT:
            const textNode = node as TextNode;
            const textNodeClassProps = `${classPropName}="${convertCssClassesToTwcClasses(textNode.getCSSAttributes())}"`;

            return `<p ${textNodeClassProps}>${textNode.getText()}</p>`;
        case NodeType.GROUP:
            // this edge case should never happen
            if (isEmpty(node.getChildren())) {
                return `<div />`;
            }

            return generateMainComponentFromNodes(node.getChildren(), ["<div>", "</div>"], classPropName);
        case NodeType.VISIBLE:
            const visibleNode = node as VisibleNode;
            const visibleNodeClassProps = `${classPropName}="${convertCssClassesToTwcClasses(visibleNode.getCSSAttributes())}"`;
            if (isEmpty(node.getChildren())) {
                return `<div ${visibleNodeClassProps} />`;
            }

            return generateMainComponentFromNodes(node.getChildren(), [`<div ${visibleNodeClassProps}>`, "</div>"], classPropName);

    }

    return `<div />`;
};


const generateMainComponentFromNodes = (nodes: Node[], [openingTag, closingTag]: string[], classPropName: string): string => {
    let childrenCodeStrings: string[] = [];

    for (const child of nodes) {
        switch (child.getType()) {
            case NodeType.TEXT:
                const textNode = child as TextNode;
                const textNodeClassProps = `${classPropName}="${convertCssClassesToTwcClasses(textNode.getCSSAttributes())}"`;
                childrenCodeStrings.push(`<p ${textNodeClassProps}>${textNode.getText()}</p>`);
                continue;
            case NodeType.GROUP:
                // this edge case should never happen
                if (isEmpty(child.getChildren())) {
                    childrenCodeStrings.push(`<div />`);
                    continue;
                }

                childrenCodeStrings.push(generateMainComponentFromNodes(child.getChildren(), ["<div>", "</div>"], classPropName));
                continue;
            case NodeType.VISIBLE:
                const visibleNode = child as VisibleNode;
                const visibleNodeClassProps = `${classPropName}="${convertCssClassesToTwcClasses(visibleNode.getCSSAttributes())}"`;
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

const convertCssClassesToTwcClasses = (attributes: Attributes) => {
    let content = "";

    Object.entries(attributes).forEach(([property, value]) => {
        content = content + " " + getTailwindCssClass(property, value, attributes);
    });

    return content.trimStart();
}


// export const buildTwcConfigFileContent = (
//     fonts: Record<string, FontMetadata>,
//     mainComponentFileExtension: string
// ) => {
//     const fontFamilies = Object.entries(fonts)
//         .map(
//             ([fontFamily, metadata]) =>
//                 `"${metadata.tailwindAlias}": "${fontFamily}",`
//         )
//         .join("\n");

//     const fontFamilyConfig = fonts
//         ? `fontFamily: {
//         ${fontFamilies}
//       },`
//         : "";

//     const config = `module.exports = {
//     content: ["./*.${mainComponentFileExtension}"],
//     theme: {
//       ${fontFamilyConfig}
//         extend: {},
//       },
//       plugins: [],
//     };
//     `;

//     return prettier.format(config, {
//         plugins: [babelParser],
//         parser: "babel",
//     });
// };

// export const buildTwcCssFileContent = (fonts: Record<string, FontMetadata>) => {
//     const fontImportStatements = fonts
//         ? Object.values(fonts).reduce((acc, curr) => {
//             return (acc += `@import url("${curr.source}");`);
//         }, "")
//         : "";

//     const file = `@tailwind base;
//   @tailwind components;
//   @tailwind utilities;
//   ${fontImportStatements}
//   `;

//     return prettier.format(file, {
//         parser: "css",
//         plugins: [cssParser],
//     });
// };
