import { isEmpty } from "lodash";
import * as rawData from "./google-fonts-metadata.json";
import { FontMetadata } from "../code/generator/font";

const baseURL = "https://fonts.googleapis.com/css?family=";
const regularFontSize = "400";

interface GoogleFontMetadata {
  family: string;
  category: string;
  variants: string[];
}

export class GoogleFonts {
  rawData: Record<string, GoogleFontMetadata> = {};

  constructor() {
    rawData.items.forEach((entry) => {
      this.rawData[entry.family.toLowerCase()] = entry;
    });
  }

  getAvailableVariants(variants: string[], family: string): string[] {
    const available: string[] = [];
    const metadata = this.rawData[family.toLowerCase()];

    if (!metadata) {
      return [];
    }

    for (const variant of variants) {
      if (metadata.variants.includes(variant)) {
        available.push(variant);
      }
    }

    return available;
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

export const GoogleFontsInstance = new GoogleFonts();

export const computeGoogleFontURL = (fontsMetadata: FontMetadata[]): string => {
  if (isEmpty(fontsMetadata)) {
    return "";
  }

  let googleFontFamily = "";
  fontsMetadata.forEach(({ family, isItalic, weights }, index: number) => {
    let fontDetails = "";

    const familyName = family.replaceAll(" ", "+");

    const fontVariants: string[] = [];
    for (const fontWeight of weights) {
      const isRegular = fontWeight === regularFontSize;
      if (isRegular) {
        fontVariants.push("regular");
        continue;
      }

      fontVariants.push(fontWeight);
    }

    if (isItalic) {
      fontVariants.push("italic");
    }

    const googleFontsVariants = GoogleFontsInstance.getAvailableVariants(
      fontVariants,
      family,
    );

    fontDetails += familyName + ":" + googleFontsVariants.join(",");

    if (index !== fontsMetadata.length - 1) {
      fontDetails += "|";
    }

    googleFontFamily += fontDetails;
  });

  return baseURL + googleFontFamily;
};

export const computeURL = (fonts: TextNode[]) => {
  let googleFontFamily = "";

  fonts.forEach((textNode: TextNode, index: number) => {
    let fontDetails = "";

    const fontName = textNode.fontName as FontName;

    const familyName = fontName.family.replaceAll(" ", "+");

    let style = "";
    const isItalic = fontName.style.toLowerCase().includes("italic");

    const isRegular = textNode.fontWeight === 400;

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
