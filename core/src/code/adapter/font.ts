import { Node, NodeType, TextNode } from "../../bricks/node";

export type FontMetadata = {
  family: string;
  familyCss: string;
  isItalic: boolean;
  size: number;
  weights: string[];
};

// getSortedFontsMetadata sorts all the fonts found within a Bricks node and sort them by font sizes.
export const getSortedFontsMetadata = (node: Node): FontMetadata[] => {
  const fonts: FontMap = {};
  findAllFonts(node, fonts);
  const rankedFonts: FontMetadata[] = [];

  Object.entries(fonts).forEach(([key, value]) => {
    rankedFonts.push({
      family: key,
      familyCss: value.familyCss,
      isItalic: value.isItalic,
      size: getAverageFontSize(value.sizes),
      weights: value.weights,
    });
  });

  rankedFonts.sort((a, b) => b.size - a.size);

  return rankedFonts;
};

type Font = {
  sizes: string[];
  isItalic: boolean;
  familyCss: string;
  weights: string[];
};

type FontMap = {
  [family: string]: Font;
};

// findAllFonts finds all the fonts
const findAllFonts = (node: Node, fonts: FontMap) => {
  if (node.getType() === NodeType.TEXT) {
    const textNode = node as TextNode;
    const attributes = textNode.getCSSAttributes();
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

// getAverageFontSize calculates the average given a list of font sizes in string format
const getAverageFontSize = (fontsizes: string[]): number => {
  let sum = 0;

  fontsizes.forEach((fontsize) => {
    sum += parseFloat(fontsize.slice(0, -2));
  });

  return sum / fontsizes.length;
};
