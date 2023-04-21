import { getFontsMetadata, FontMetadataMap } from "../font";
import { Node } from "../../../bricks/node";
import { computeGoogleFontURL } from "../../../google/google-fonts";

// buildFontMetadataMapWithTwcssAliases assigns fonts aliases based on their sizes.
export const buildFontMetadataMapWithTwcssAliases = (
  fontsMetadata: FontMetadataMap
): TwcssFontMetadataMap => {
  let twcssMetadataMap: TwcssFontMetadataMap = {};

  const fontMetadataEntries = Object.entries(fontsMetadata);
  fontMetadataEntries.forEach(([family, { isItalic, weights, familyCss }]) => {
    const alias = family.replaceAll(" ", "-");
    twcssMetadataMap[family] = {
      familyCss,
      weights,
      isItalic,
      alias: alias.toLowerCase(),
    };

  });

  return twcssMetadataMap;
};

export type TwcssFontMetadataMap = {
  [family: string]: TwcssFontMetadataWithAlias;
};

export type TwcssFontMetadataWithAlias = {
  familyCss: string;
  weights: string[];
  isItalic: boolean;
  alias: string;
};

// FontsRegistry contains related informaiton used for rendering fonts in tailwindcss.
export class FontsRegistry {
  fontMetadataMap: TwcssFontMetadataMap;
  googleFontUrl: string;

  constructor(node: Node) {
    const fontMetadataMap = getFontsMetadata(node);
    this.googleFontUrl = computeGoogleFontURL(fontMetadataMap);
    this.fontMetadataMap = buildFontMetadataMapWithTwcssAliases(fontMetadataMap);
  }

  getFontMetadataInArray(): TwcssFontMetadataWithAlias[] {
    return Object.entries(this.fontMetadataMap).map(([_, metadata]) => ({
      ...metadata,
    }));
  }

  getGoogleFontUrl(): string {
    return this.googleFontUrl;
  }

  getTwcssAlias(familyCss: string): string {
    const values = Object.values(this.fontMetadataMap);

    for (const value of values) {
      if (value.familyCss === familyCss) {
        return value.alias;
      }
    }

    return "";
  }
}

export let FontsRegistryGlobalInstance: FontsRegistry;

// instantiateFontsRegistryGlobalInstance creates a singleton.
export const instantiateFontsRegistryGlobalInstance = (node: Node) => {
  FontsRegistryGlobalInstance = new FontsRegistry(node);
};
