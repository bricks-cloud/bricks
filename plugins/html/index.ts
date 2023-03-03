import { IPlugin } from "bricks-core/src/IPlugin";
import { IFile } from "bricks-core/src/IFile";
import { StyledBricksNode } from "bricks-core/src/StyledBricksNode";
import {
  buildTwcConfigFileContent,
  buildTwcCssFileContent,
  getTailwindCssClass,
  getTWCFontMetadata,
} from "bricks-tailwindcss-utils";

type Options = {
  tailwindcss?: boolean;
};

const plugin: IPlugin<Options> = {
  name: "html",
  transform: function transform(nodes, options) {
    if (nodes.length === 0) {
      return [];
    }

    const tailwindcss = options?.tailwindcss || false;
    const files: IFile[] = [];

    // Used for generating Tailwind font family classes
    const fonts = getTWCFontMetadata(nodes);

    function generateHtml(nodes: StyledBricksNode[]): string {
      const html = nodes
        .map((node) => {
          let styleString = "";

          if (tailwindcss) {
            // convert attirbutes to tailwindcss classes
            const classes = Object.entries(node.attributes)
              .map(([key, value]) =>
                getTailwindCssClass(key, value, node.attributes, fonts)
              )
              .filter((c) => !!c)
              .join(" ");

            styleString = classes.length > 0 ? ` class="${classes}"` : "";
          } else {
            // convert attirbutes to inline styles
            const styles = Object.entries(node.attributes)
              .map(([key, value]) => `${key}: ${value}`)
              .join("; ");

            styleString = styles.length > 0 ? ` style="${styles}"` : "";
          }

          if (node.type === "text") {
            const { tagName, text } = node;
            return `<${tagName}${styleString}>${text}</${tagName}>`;
          }

          if (node.type === "element") {
            const { tagName, children } = node;

            if (tagName === "img" && node.base64image) {
              const byteCharacters = Buffer.from(node.base64image, "base64");

              // TODO: File might not be png, need code to detect file type
              const filePath = `/assets/img_${files.length + 1}.png`;
              files.push({
                content: byteCharacters,
                path: filePath,
              });

              return `<img${styleString} src="${filePath}">`;
            }

            if (HTML_VOID_ELEMENTS.includes(tagName)) {
              return `<${tagName}${styleString}>`;
            }

            if (children.length > 0) {
              return `<${tagName}${styleString}>${generateHtml(
                children
              )}</${tagName}>`;
            }

            return `<${tagName}${styleString}></${tagName}>`;
          }

          if (node.type === "svg") {
            // Extract SVGs into separate files
            const path = `/assets/svg_${files.length + 1}.svg`;
            files.push({
              content: node.svg,
              path,
            });

            return `<img src="${path}">`;
          }
        })
        .filter((s) => !!s)
        .join("");

      return html;
    }

    files.push({
      path: "/GeneratedComponent.html",
      content: generateHtml(nodes),
    });

    if (tailwindcss) {
      // Extra files needed for Tailwind CSS
      const configFile = buildTwcConfigFileContent(fonts, "html");
      files.push({
        content: configFile,
        path: `/tailwind.config.js`,
      });

      const cssFile = buildTwcCssFileContent(fonts);
      files.push({
        content: cssFile,
        path: `/style.css`,
      });
    }

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

export default plugin;
