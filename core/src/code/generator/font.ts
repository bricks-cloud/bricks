import { Node, NodeType, TextNode } from "../../bricks/node";

// getFontsMetadata sorts all the fonts found within a Bricks node and sort them by font sizes.
export const getFontsMetadata = (node: Node): FontMetadataMap => {
  const fonts: FontMetadataMap = {};
  findAllFonts(node, fonts);
  return fonts;
};

type Font = {
  sizes: string[];
  isItalic: boolean;
  familyCss: string;
  weights: string[];
};

export type FontMetadataMap = {
  [family: string]: Font;
};

// findAllFonts finds all the fonts
const findAllFonts = (node: Node, fonts: FontMetadataMap) => {
  if (node.getType() === NodeType.TEXT) {
    const textNode = node as TextNode;
    const attributes = textNode.getCssAttributes();
    const fontFamily = textNode.getFamilyName();
    const fontFamilyCss = attributes["font-family"];
    const fontSize = attributes["font-size"];
    const fontWeight = attributes["font-weight"];

    if (fontFamily && fontSize) {
      const font = fonts[fontFamily];
      if (!font) {
        fonts[fontFamily] = {
          isItalic: textNode.isItalic(),
          familyCss: fontFamilyCss,
          sizes: [fontSize],
          weights: [fontWeight],
        };

        return;
      }

      if (!font.weights.includes(fontWeight)) {
        font.weights.push(fontWeight);
      }

      if (fontSize) {
        fonts[fontFamily].sizes.push(fontSize);
      }
    }

    return;
  }

  const children = node.getChildren();
  for (const child of children) {
    findAllFonts(child, fonts);
  }
};