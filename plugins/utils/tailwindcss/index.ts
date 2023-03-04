import parseColor from "color-parse";
import { Attributes, StyledBricksNode } from "bricks-core/src/StyledBricksNode";
import {
  twBorderRadiusMap,
  twBroderWidthMap,
  twColorMap,
  twFontSizeMap,
  twFontWeightMap,
  twHeightMap,
  twLetterSpacingMap,
  twLineHeightMap,
  twOpacities,
  twUnitMap,
  twWidthMap,
} from "./tw-value-maps";
import * as prettier from "prettier/standalone";
import * as cssParser from "prettier/parser-postcss";
import * as babelParser from "prettier/parser-babel";

const largestTWCHeightInPixels = 384;
const largestTWCWidthInPixels = 384;

const findClosestTailwindCSSColor = (cssColor: string) => {
  if (cssColor === "inherit") {
    return "inherit";
  }

  if (cssColor === "currentColor") {
    return "current";
  }

  const givenColor = parseColor(cssColor);

  let tailwindCSSProperty = "";

  if (givenColor.space) {
    let minColorDiff = Infinity;
    let twColorClassToUse = "black";

    const [r, g, b] = givenColor.values;
    Object.entries(twColorMap).forEach(([twClass, twColorString]) => {
      const parsedTwColor = parseColor(twColorString);

      if (parsedTwColor.space) {
        const [targetR, targetG, targetB] = parsedTwColor.values;
        const diff =
          Math.abs(targetR - r) + Math.abs(targetG - g) + Math.abs(targetB - b);
        if (diff < minColorDiff) {
          minColorDiff = diff;
          twColorClassToUse = twClass;
        }
      }
    });

    tailwindCSSProperty += twColorClassToUse;

    if (givenColor.alpha < 1) {
      let minOpacityDiff = Infinity;
      let twOpacityToUse = 1;

      twOpacities.forEach((twOpacity) => {
        const diff = Math.abs(givenColor.alpha - twOpacity);
        if (diff < minOpacityDiff) {
          minOpacityDiff = diff;
          twOpacityToUse = twOpacity;
        }
      });

      tailwindCSSProperty += `/${twOpacityToUse * 100}`;
    }
  }

  return tailwindCSSProperty;
};

const findClosestTailwindCSSOpacity = (cssColorWithOpacity: string) => {
  const color = parseColor(cssColorWithOpacity);

  const roundedOpacity = Math.round(color.alpha * 100);

  const closetNumber = Math.floor(roundedOpacity / 5) * 5;

  return `text-opacity-${(roundedOpacity % 5 >= 3
    ? closetNumber + 5
    : closetNumber
  ).toString()}`;
};

const findClosestTailwindCSSFontSize = (cssFontSize: string) => {
  let closestTailwindFontSize = "text-xs";

  const parsedCSSFontSize = parseInt(cssFontSize.slice(0, -2), 10);
  let smallestDiff = Infinity;

  Object.entries(twFontSizeMap).forEach(([key, val]) => {
    const parsedTailwindCSSFontSize = parseInt(val.slice(0, -2), 10);
    const diff = parsedTailwindCSSFontSize - parsedCSSFontSize;

    if (diff <= smallestDiff && diff >= 0) {
      smallestDiff = diff;
      closestTailwindFontSize = key;
    }
  });

  return closestTailwindFontSize;
};

const extractPixelNumberFromString = (pixelStr: string) =>
  parseInt(pixelStr.slice(0, -2), 10);

const findClosestTwClassUsingPixel = (
  targetPixelStr: string,
  twClassToPixelMap: Record<string, string>,
  defaultClass: string
) => {
  let closestTwClass = defaultClass;
  const targetPixelNum = extractPixelNumberFromString(targetPixelStr);

  let smallestDiff = Infinity;
  Object.entries(twClassToPixelMap).forEach(([key, val]) => {
    const pixelNum = extractPixelNumberFromString(val);
    if (val.endsWith("px")) {
      const diff = Math.abs(targetPixelNum - pixelNum);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestTwClass = key;
      }
    }
  });

  return closestTwClass;
};

const tailwindTextDecorationMap = {
  underline: "underline",
  "line-through": "line-through",
  none: "no-underline",
};

const findTailwindTextDecoration = (textDecorationCSSValue: string) => {
  return tailwindTextDecorationMap[textDecorationCSSValue];
};

const findClosestTailwindCSSLineHeight = (lineHeight: string): string => {
  let twClassToUse = "leading-none";

  const regexExecResult = /^([0-9]\d*(?:\.\d+)?)(%|px)$/.exec(lineHeight);

  if (regexExecResult) {
    const [_, givenLineHeight, unit] = regexExecResult;

    let minDiff = Infinity;

    Object.entries(twLineHeightMap).forEach(([twClass, cssValue]) => {
      let diff = -Infinity;

      if (unit === "px" && cssValue.endsWith("px")) {
        diff = Math.abs(
          parseInt(givenLineHeight) - parseInt(cssValue.slice(0, -2))
        );
      }

      if (unit === "%" && cssValue.endsWith("%")) {
        diff = Math.abs(
          parseInt(givenLineHeight) - parseInt(cssValue.slice(0, -1))
        );
      }

      if (diff < minDiff) {
        minDiff = diff;
        twClassToUse = twClass;
      }
    });
  }

  return twClassToUse;
};

const findClosestTailwindCSSLetterSpacing = (
  letterSpacing: string,
  fontSize: number
): string => {
  let twClassToUse = "tracking-normal";

  const regexExecResult = /^([0-9]\d*(?:\.\d+)?)(px|em)$/.exec(letterSpacing);

  if (regexExecResult) {
    const [_, givenLetterSpacing, unit] = regexExecResult;

    const givenLetterSpacingInEm =
      unit === "em"
        ? parseFloat(givenLetterSpacing)
        : parseFloat(givenLetterSpacing) / fontSize;

    let minDiff = Infinity;

    Object.entries(twLetterSpacingMap).forEach(([twClass, cssValue]) => {
      const diff = Math.abs(
        givenLetterSpacingInEm - parseFloat(cssValue.slice(0, -2))
      );
      if (diff < minDiff) {
        minDiff = diff;
        twClassToUse = twClass;
      }
    });
  }

  return twClassToUse;
};

const findClosestTailwindCSSFontWeight = (fontWeight: string): string => {
  const givenFontWeight = parseInt(fontWeight);

  if (isNaN(givenFontWeight)) return "";

  let minDiff = Infinity;
  let twClassToUse = "";

  Object.entries(twFontWeightMap).forEach(([twClass, twFontWeight]) => {
    const diff = Math.abs(twFontWeight - givenFontWeight);

    if (diff < minDiff) {
      minDiff = diff;
      twClassToUse = twClass;
    }
  });

  return twClassToUse;
};

const findClosestTailwindSize = (cssSize: string): string => {
  const regexExecResult = /^([0-9]\d*(?:\.\d+)?)(px|rem)$/.exec(cssSize);

  let twSize = "";

  if (regexExecResult) {
    const [_, givenPaddingStr, givenUnit] = regexExecResult;
    const givenPadding = parseFloat(givenPaddingStr);

    let minDiff = Infinity;

    Object.entries(twUnitMap).forEach(([twValue, cssValue]) => {
      let diff: number = Infinity;

      if (givenUnit === "px" && cssValue.endsWith("px")) {
        diff = Math.abs(givenPadding - parseFloat(cssValue.slice(0, -2)));
      }

      if (givenUnit === "px" && cssValue.endsWith("rem")) {
        // assume root font size equals 16px, which is true in most cases
        diff = Math.abs(givenPadding - parseFloat(cssValue.slice(0, -3)) * 16);
      }

      if (givenUnit === "rem" && cssValue.endsWith("rem")) {
        diff = Math.abs(givenPadding - parseFloat(cssValue.slice(0, -3)));
      }

      if (diff < minDiff) {
        minDiff = diff;
        twSize = twValue;
      }
    });
  }

  return twSize;
};

const renderTWProperty = (prefix: string, value: string) => {
  if (!!value) {
    return prefix + value;
  }

  return "";
};

interface FontMetadata {
  source: string;
  tailwindAlias: string;
}

/**
 *
 * @param cssProperty the CSS property to convert to Tailwind CSS (e.g. "background-color")
 * @param cssValue the CSS value to convert to Tailwind CSS (e.g. "red")
 * @param cssAttributes the rest of the CSS attributes, as sometimes we need to refer to other attributes to find the suitable Tailwind CSS class
 * @param fonts
 * @returns A Tailwind CSS class as a string
 */
export const getTailwindCssClass = (
  cssProperty: string,
  cssValue: string,
  cssAttributes: Attributes,
  fonts: Record<string, FontMetadata>
): string => {
  switch (cssProperty) {
    case "height":
      const heightNum = extractPixelNumberFromString(cssValue);
      if (heightNum > largestTWCHeightInPixels) {
        return `h-[${heightNum}px]`;
      }

      return findClosestTwClassUsingPixel(cssValue, twHeightMap, "h-0");

    case "width":
      const widthNum = extractPixelNumberFromString(cssValue);
      if (widthNum > largestTWCWidthInPixels) {
        return `w-[${widthNum}px]`;
      }

      return findClosestTwClassUsingPixel(cssValue, twWidthMap, "w-0");

    case "border-color":
      return "border-" + findClosestTailwindCSSColor(cssValue);

    case "border-width": {
      const borderWidthTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBroderWidthMap,
        "0"
      );

      if (borderWidthTwSize === "0") return "";

      return borderWidthTwSize === ""
        ? "border"
        : "border-" + borderWidthTwSize;
    }

    case "border-top-width": {
      const borderTopWidthTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBroderWidthMap,
        "0"
      );

      if (borderTopWidthTwSize === "0") return "";

      return borderTopWidthTwSize === ""
        ? "border-t"
        : "border-t-" + borderTopWidthTwSize;
    }

    case "border-bottom-width": {
      const borderBottomWidthTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBroderWidthMap,
        "0"
      );

      if (borderBottomWidthTwSize === "0") return "";

      return borderBottomWidthTwSize === ""
        ? "border-b"
        : "border-b-" + borderBottomWidthTwSize;
    }

    case "border-left-width": {
      const borderLeftWidthTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBroderWidthMap,
        "0"
      );

      if (borderLeftWidthTwSize === "0") return "";

      return borderLeftWidthTwSize === ""
        ? "border-l"
        : "border-l-" + borderLeftWidthTwSize;
    }

    case "border-right-width": {
      const borderRightWidthTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBroderWidthMap,
        "0"
      );

      if (borderRightWidthTwSize === "0") return "";

      return borderRightWidthTwSize === ""
        ? "border-r"
        : "border-r-" + borderRightWidthTwSize;
    }

    case "border-radius": {
      const borderRadiusTwSize = findClosestTwClassUsingPixel(
        cssValue,
        twBorderRadiusMap,
        "none"
      );
      if (borderRadiusTwSize === "0") {
        return "";
      }
      return borderRadiusTwSize === ""
        ? "rounded"
        : "rounded-" + borderRadiusTwSize;
    }

    case "background-color":
      return `bg-${findClosestTailwindCSSColor(cssValue)}`;

    case "box-shadow": {
      // A very naive conversion for now, because parsing box-shadow string is too complicated
      if (cssValue.includes("inset")) {
        // inner shadow
        return "shadow-inner";
      } else {
        // drop shadow
        return "shadow";
      }
    }

    case "display": {
      switch (cssValue) {
        case "block":
          return "block";
        case "inline-block":
          return "inline-block";
        case "inline":
          return "inline";
        case "flex":
          return "flex";
        case "inline-flex":
          return "inline-flex";
        case "table":
          return "table";
        case "inline-table":
          return "inline-table";
        case "table-caption":
          return "table-caption";
        case "table-cell":
          return "table-cell";
        case "table-column":
          return "table-column";
        case "table-column-group":
          return "table-column-group";
        case "table-footer-group":
          return "table-footer-group";
        case "table-header-group":
          return "table-header-group";
        case "table-row-group":
          return "table-row-group";
        case "table-row":
          return "table-row";
        case "flow-root":
          return "flow-root";
        case "grid":
          return "grid";
        case "inline-grid":
          return "inline-grid";
        case "contents":
          return "contents";
        case "list-item":
          return "list-item";
        case "none":
          return "hidden";
        default:
          return "";
      }
    }

    case "flex-direction": {
      switch (cssValue) {
        case "row":
          return "flex-row";
        case "row-reverse":
          return "flex-row-reverse";
        case "column":
          return "flex-col";
        case "column-reverse":
          return "flex-col-reverse";
        default:
          return "";
      }
    }

    case "justify-content": {
      switch (cssValue) {
        case "flex-start":
          return "justify-start";
        case "flex-end":
          return "justify-end";
        case "center":
          return "justify-center";
        case "space-between":
          return "justify-between";
        case "space-around":
          return "justify-around";
        case "space-evenly":
          return "justify-evenly";
        default:
          return "";
      }
    }

    case "align-items": {
      switch (cssValue) {
        case "flex-start":
          return "items-start";
        case "flex-end":
          return "items-end";
        case "center":
          return "items-center";
        case "baseline":
          return "items-baseline";
        case "stretch":
          return "items-stretch";
        default:
          return "";
      }
    }

    case "border-style": {
      switch (cssValue) {
        case "solid":
          return "border-solid";
        case "dashed":
          return "border-dashed";
        case "dotted":
          return "border-dotted";
        case "double":
          return "border-double";
        case "hidden":
          return "border-hidden";
        case "none":
          return "border-none";
        default:
          return "";
      }
    }

    case "object-fit": {
      switch (cssValue) {
        case "contain":
          return "object-contain";
        case "cover":
          return "object-cover";
        case "fill":
          return "object-fill";
        case "none":
          return "object-none";
        case "scale-down":
          return "object-scale-down";
        default:
          return "";
      }
    }

    case "padding": {
      return renderTWProperty("p-", findClosestTailwindSize(cssValue));
    }

    case "padding-top": {
      return renderTWProperty("pt-", findClosestTailwindSize(cssValue));
    }

    case "padding-bottom": {
      return renderTWProperty("pb-", findClosestTailwindSize(cssValue));
    }

    case "padding-left": {
      return renderTWProperty("pl-", findClosestTailwindSize(cssValue));
    }

    case "padding-right": {
      return renderTWProperty("pr-", findClosestTailwindSize(cssValue));
    }

    case "gap": {
      return renderTWProperty("gap-", findClosestTailwindSize(cssValue));
    }

    case "column-gap": {
      return renderTWProperty("gap-x-", findClosestTailwindSize(cssValue));
    }

    case "row-gap": {
      return renderTWProperty("gap-y-", findClosestTailwindSize(cssValue));
    }

    // text properties
    case "font-family":
      return `font-${fonts[cssValue].tailwindAlias}`;

    case "font-size":
      return findClosestTailwindCSSFontSize(cssValue);

    case "text-decoration":
      return findTailwindTextDecoration(cssValue);

    case "color":
      return `text-${findClosestTailwindCSSColor(
        cssValue
      )} ${findClosestTailwindCSSOpacity(cssValue)}`;

    case "text-transform":
      switch (cssValue) {
        case "uppercase":
          return "uppercase";
        case "lowercase":
          return "lowercase";
        case "capitalize":
          return "capitalize";
        default:
          return "";
      }

    case "line-height": {
      return findClosestTailwindCSSLineHeight(cssValue);
    }

    case "letter-spacing": {
      // assume font size is always in px
      const fontSize = parseInt(cssAttributes["font-size"].slice(0, -2), 10);
      const twClass = findClosestTailwindCSSLetterSpacing(cssValue, fontSize);
      return twClass;
    }

    case "text-align": {
      switch (cssValue) {
        case "left":
          return "text-left";
        case "center":
          return "text-center";
        case "right":
          return "text-right";
        case "justify":
          return "text-justify";
        case "start":
          return "text-start";
        case "end":
          return "text-end";
        default:
          return "";
      }
    }

    case "font-style": {
      switch (cssValue) {
        case "italic":
          return "italic";
        case "normal":
          return "not-italic";
        default:
          return "";
      }
    }

    case "font-weight": {
      return findClosestTailwindCSSFontWeight(cssValue);
    }

    default:
      return "";
  }
};

const MAX_BODY_FONT_SIZE = 30;

export const getTWCFontMetadata = (nodes: StyledBricksNode[]) => {
  const fonts = findAllFonts(nodes);

  const rankedFonts: {
    family: string;
    source: string;
    size: number;
  }[] = [];

  Object.entries(fonts).forEach(([key, value]) => {
    rankedFonts.push({
      family: key,
      source: value.source,
      size: getAverageFontSize(value.sizes),
    });
  });

  if (rankedFonts.length === 0) {
    return {};
  }

  rankedFonts.sort((a, b) => b.size - a.size);

  if (rankedFonts.length === 1) {
    if (rankedFonts[0].size >= MAX_BODY_FONT_SIZE) {
      return {
        [rankedFonts[0].family]: {
          source: rankedFonts[0].source,
          tailwindAlias: "primary",
        },
      };
    }

    return {
      [rankedFonts[0].family]: {
        source: rankedFonts[0].source,
        tailwindAlias: "body",
      },
    };
  }

  if (rankedFonts.length === 2) {
    if (rankedFonts[1].size >= MAX_BODY_FONT_SIZE) {
      return {
        [rankedFonts[0].family]: {
          source: rankedFonts[0].source,
          tailwindAlias: "primary",
        },
        [rankedFonts[1].family]: {
          source: rankedFonts[1].source,
          tailwindAlias: "secondary",
        },
      };
    }

    return {
      [rankedFonts[0].family]: {
        source: rankedFonts[0].source,
        tailwindAlias: "primary",
      },
      [rankedFonts[1].family]: {
        source: rankedFonts[1].source,
        tailwindAlias: "body",
      },
    };
  }

  return {
    [rankedFonts[0].family]: {
      source: rankedFonts[0].source,
      tailwindAlias: "primary",
    },
    [rankedFonts[1].family]: {
      source: rankedFonts[1].source,
      tailwindAlias: "secondary",
    },
    [rankedFonts[2].family]: {
      source: rankedFonts[2].source,
      tailwindAlias: "body",
    },
  };
};

interface FontSizeData {
  source: string;
  sizes: string[];
}

const findAllFonts = (nodes: StyledBricksNode[]) => {
  const fonts: Record<string, FontSizeData> = {};

  function findFont(nodes: StyledBricksNode[]) {
    nodes.forEach((node) => {
      if (node.type === "element") {
        return findFont(node.children);
      }

      if (node.type === "text") {
        const fontFamily = node.attributes["font-family"];
        const fontSize = node.attributes["font-size"];

        if (fontFamily && node.source) {
          if (!fonts[fontFamily]) {
            fonts[fontFamily] = {
              source: "",
              sizes: [],
            };
          }

          fonts[fontFamily].source = node.source;

          if (fontSize) {
            fonts[fontFamily].sizes.push(fontSize);
          }
        }
      }
    });
  }

  findFont(nodes);

  return fonts;
};

const getAverageFontSize = (fontsizes: string[]) => {
  let sum = 0;

  fontsizes.forEach((fontsize) => {
    sum += parseFloat(fontsize.slice(0, -2));
  });

  return sum / fontsizes.length;
};

export const buildTwcConfigFileContent = (
  fonts: Record<string, FontMetadata>,
  mainComponentFileExtension: string
) => {
  const fontFamilies = Object.entries(fonts)
    .map(
      ([fontFamily, metadata]) =>
        `"${metadata.tailwindAlias}": "${fontFamily}",`
    )
    .join("\n");

  const fontFamilyConfig = fonts
    ? `fontFamily: {
      ${fontFamilies}
    },`
    : "";

  const config = `module.exports = {
  content: ["./*.${mainComponentFileExtension}"],
  theme: {
    ${fontFamilyConfig}
      extend: {},
    },
    plugins: [],
  };
  `;

  return prettier.format(config, {
    plugins: [babelParser],
    parser: "babel",
  });
};

export const buildTwcCssFileContent = (fonts: Record<string, FontMetadata>) => {
  const fontImportStatements = fonts
    ? Object.values(fonts).reduce((acc, curr) => {
        return (acc += `@import url("${curr.source}");`);
      }, "")
    : "";

  const file = `@tailwind base;
@tailwind components;
@tailwind utilities;
${fontImportStatements}
`;

  return prettier.format(file, {
    parser: "css",
    plugins: [cssParser],
  });
};
