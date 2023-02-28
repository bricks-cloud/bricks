import * as rawData from "./google-fonts-metadata.json";

const baseURL = "https://fonts.googleapis.com/css?family=";
const regularFontSize = 400;

interface GoogleFont {
  family: string;
  category: string;
}

export class GoogleFonts {
  rawData: Record<string, GoogleFont> = {};

  constructor() {
    rawData.items.forEach((entry) => {
      this.rawData[entry.family.toLowerCase()] = entry;
    });
  }

  getGenericFontFamily(family: string) {
    const metadata = this.rawData[family.toLowerCase()];
    if (metadata) {
      switch (metadata.category) {
        case "handwriting":
          return "cursive";
        case "display":
          return "cursive";
        default:
          return metadata.category;
      }
    }

    return "sans-serif";
  }
}

export const computeURL = (fonts: TextNode[]) => {
  let googleFontFamily = "";

  fonts.forEach((textNode: TextNode, index: number) => {
    let fontDetails = "";

    const fontName = textNode.fontName as FontName;

    const familyName = fontName.family.replaceAll(" ", "+");

    let style = "";
    const isItalic = fontName.style.toLowerCase().includes("italic");

    const isRegular = textNode.fontWeight === regularFontSize;

    if (isRegular) {
      style += "regular";
    } else {
      style += textNode.fontWeight.toString();
    }

    if (isItalic) {
      if (isRegular) {
        style = "italic";
      } else {
        style += "italic";
      }
    }

    if (style.length !== 0) {
      style = ":" + style;
    }

    fontDetails += familyName + style;

    if (index !== fonts.length - 1) {
      fontDetails += fontDetails + "|";
    }

    googleFontFamily += fontDetails;
  });

  return baseURL + googleFontFamily;
};
