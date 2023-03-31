import { IPlugin } from "bricks-core/src/IPlugin";
import { IFile } from "bricks-core/src/IFile";
import { StyledBricksNode } from "bricks-core/src/StyledBricksNode";
import {
  buildTwcConfigFileContent,
  buildTwcCssFileContent,
  getTailwindCssClass,
  getTWCFontMetadata,
} from "bricks-tailwindcss-utils";
import * as prettier from "prettier/standalone";
import * as babelParser from "prettier/parser-babel";

type Options = {
  tailwindcss?: boolean;
  typescript?: boolean;
};

const plugin: IPlugin<Options> = {
  name: "react",
  transform: function transform(nodes, options) {
    if (nodes.length === 0) {
      return [];
    }

    const tailwindcss = options?.tailwindcss || false;
    const typescript = options?.typescript || false;

    const files: IFile[] = [];
    const importStatements: string[] = [];

    // Used for generating Tailwind font family classes
    const fonts = getTWCFontMetadata(nodes);

    function generateReact(nodes: StyledBricksNode[]): string {
      const jsx = nodes
        .map((node) => {
          let styleString = "";

          if (tailwindcss) {
            // convert attirbutes to tailwindcss classes
            const classes = Object.entries(node.attributes)
              .map(([key, value]) =>
                getTailwindCssClass(key, value, node.attributes, fonts),
              )
              .filter((c) => !!c)
              .join(" ");

            styleString = classes.length > 0 ? ` className="${classes}"` : "";
          } else {
            // convert attirbutes to an inline object
            const styles = Object.entries(node.attributes)
              .map(([key, value]) => `${hyphenToCamelCase(key)}: "${value}"`)
              .join(",");

            styleString = styles.length > 0 ? ` style={{${styles}}}` : "";
          }

          if (node.type === "text") {
            const { tagName, text } = node;
            return `<${tagName}${styleString}>${text}</${tagName}>`;
          }

          if (node.type === "element") {
            const { tagName, children } = node;

            if (tagName === "img" && node.base64image) {
              // Extract images into separate files
              const imageName = `img_${files.length + 1}`;
              const imageFilePath = `/assets/${imageName}.png`; // TODO: File might not be png, need code to detect file type

              importStatements.push(
                `import ${imageName} from ".${imageFilePath}"`,
              );

              const byteCharacters = Buffer.from(node.base64image, "base64");
              files.push({
                content: byteCharacters,
                path: imageFilePath,
              });

              return `<img${styleString} src={${imageName}} />`;
            }

            if (HTML_VOID_ELEMENTS.includes(tagName)) {
              return `<${tagName}${styleString}/>`;
            }

            if (children.length > 0) {
              return `<${tagName}${styleString}>${generateReact(
                children,
              )}</${tagName}>`;
            }

            return `<${tagName}${styleString}></${tagName}>`;
          }

          if (node.type === "svg") {
            // Extract SVGs into separate files
            const svgName = `svg_${files.length + 1}`;
            const svgFilePath = `/assets/svg_${files.length + 1}.svg`;

            importStatements.push(`import ${svgName} from ".${svgFilePath}"`);

            files.push({
              content: node.svg,
              path: svgFilePath,
            });

            return `<img src={${svgName}} />`;
          }
        })
        .filter((s) => !!s)
        .join("");

      return jsx;
    }

    const fileExtension = typescript ? "tsx" : "jsx";

    if (tailwindcss) {
      // Extra files needed for Tailwind CSS
      const configFile = buildTwcConfigFileContent(fonts, fileExtension);
      files.push({
        content: configFile,
        path: `/tailwind.config.js`,
      });

      importStatements.push('import "./style.css"');
      const cssFile = buildTwcCssFileContent(fonts);
      files.push({
        content: cssFile,
        path: `/style.css`,
      });
    }

    const jsx = generateReact(nodes);

    const code = `${importStatements.join(";")}
const GeneratedComponent = () => (
  ${jsx}
);
export default GeneratedComponent;`;

    files.push({
      path: `/GeneratedComponent.${fileExtension}`,
      content: prettier.format(code, {
        plugins: [babelParser],
        parser: "babel",
      }),
    });

    return files;
  },
};

// HTML elements that cannot have closing tags
const HTML_VOID_ELEMENTS = [
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

function hyphenToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, function (s) {
    return s[1].toUpperCase();
  });
}

export default plugin;
