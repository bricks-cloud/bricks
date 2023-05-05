import { Node, NodeType, TextNode } from "../../bricks/node";

// getFontsMetadata sorts all the fonts found within a Bricks node and sort them by font sizes.
export const getFontsMetadata = (node: Node): FontMetadataMap => {
  const fonts: FontMetadataMap = {};
  findAllFonts(node, fonts);
  return fonts;
};

type Font = {
  sizes: number[];
  isItalic: boolean;
  familyCss: string;
  weights: number[];
};

export type FontMetadataMap = {
  [family: string]: Font;
};

// findAllFonts finds all the fonts
const findAllFonts = (node: Node, fonts: FontMetadataMap) => {
  if (node.getType() === NodeType.TEXT) {
    const textNode = node as TextNode;

    const styledTextSegments = textNode.node.getStyledTextSegments();

    styledTextSegments.forEach((styledTextSegment) => {
      const { fontName, fontSize, fontWeight } = styledTextSegment;
      const { family, style } = fontName;
      const isItalic = style.toLowerCase().includes("italic");

      if (family && fontSize) {
        const font = fonts[family];
        if (!font) {
          fonts[family] = {
            isItalic,
            familyCss: family,
            sizes: [fontSize],
            weights: [fontWeight],
          };

          return;
        }

        if (!font.weights.includes(fontWeight)) {
          font.weights.push(fontWeight);
        }

        if (fontSize) {
          fonts[family].sizes.push(fontSize);
        }
      }
    });

    return;
  }

  const children = node.getChildren();
  for (const child of children) {
    findAllFonts(child, fonts);
  }
};
