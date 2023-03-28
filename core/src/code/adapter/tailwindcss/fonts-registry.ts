import { getSortedFontsMetadata, FontMetadata } from "../font";
import { Node } from "../../../bricks/node";
import { computeGoogleFontURL } from "../../../google/google-fonts";

const MAX_BODY_FONT_SIZE = 30;

// buildFontMetadataMapWithTwcssAliases assigns fonts aliases based on their sizes.
export const buildFontMetadataMapWithTwcssAliases = (sortedFontsMetadata: FontMetadata[]): FontMetadataMap => {
    let metadataMap: FontMetadataMap = {};
    let aliases: string[] = [];

    switch (sortedFontsMetadata.length) {
        case 1:
            const font = sortedFontsMetadata[0];
            if (font.size >= MAX_BODY_FONT_SIZE) {
                aliases = ["primary"];
                break;
            }
            aliases = ["body"];
            break;
        case 2:
            if (sortedFontsMetadata[0].size >= MAX_BODY_FONT_SIZE && sortedFontsMetadata[1].size >= MAX_BODY_FONT_SIZE) {
                aliases = ["primary", "secondary"];
                break;
            }

            aliases = ["primary", "body"];
            break;
        case 3:
            aliases = ["primary", "secondary", "body"];
            break;
    }

    for (let i = 0; i < aliases.length; i++) {
        const font = sortedFontsMetadata[i];
        metadataMap[font.family] = {
            ...font,
            alias: aliases[i],
        }
    }

    return metadataMap;
}

export type FontMetadataMap = {
    [family: string]: FontMetadataWithAlias,
}

export type FontMetadataWithAlias = {
    familyCss: string,
    weights: string[],
    isItalic: boolean,
    alias: string,
};

// FontsRegistry contains related informaiton used for rendering fonts in tailwindcss.
export class FontsRegistry {
    fontMetadataMap: FontMetadataMap;
    googleFontUrl: string;

    constructor(node: Node) {
        const sortedFontdata = getSortedFontsMetadata(node);
        this.googleFontUrl = computeGoogleFontURL(sortedFontdata);
        this.fontMetadataMap = buildFontMetadataMapWithTwcssAliases(sortedFontdata);
    }

    getFontMetadataInArray(): FontMetadataWithAlias[] {
        return Object.entries(this.fontMetadataMap).map(([_, metadata]) => ({
            ...metadata,
        }));
    }

    getGoogleFontUrl(): string {
        return this.googleFontUrl;
    }

    setFontMetadataMap(fontMetadataMap: FontMetadataMap) {
        this.fontMetadataMap = fontMetadataMap;
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
}