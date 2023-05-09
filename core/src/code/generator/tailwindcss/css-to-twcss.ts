import parseColor from "color-parse";
import { isEmpty } from "../../../utils";
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
  tailwindTextDecorationMap,
  MAX_BORDER_RADIUS_IN_PIXELS,
} from "./twcss-conversion-map";
import { Attributes } from "../../../design/adapter/node";
import { FontsRegistryGlobalInstance } from "./fonts-registry";
import { Option, UiFramework } from "../../code";
import { getVariablePropForTwcss } from "../../../../ee/code/prop";
import { GetPropsFromAttributes } from "../html/generator";

export type TwcssPropRenderingMeta = {
  numberOfTwcssClasses: number;
  filledClassIndexes: Set<number>;
};

export type TwcssPropRenderingMap = {
  [cssKey: string]: TwcssPropRenderingMeta;
};

// convertCssClassesToTwcssClasses converts css classes to tailwindcss classes
export const convertCssClassesToTwcssClasses: GetPropsFromAttributes = (
  attributes: Attributes,
  option: Option,
  id?: string,
  parentAttributes?: Attributes
) => {
  let classPropName: string = "class";
  let variableProps: string = "";
  const twcssPropRenderingMap: TwcssPropRenderingMap = {};

  Object.entries(attributes).forEach(([property, value]) => {
    const twcssClasses: string[] = getTwcssClass(
      property,
      value,
      attributes,
      parentAttributes
    ).split(" ");
    twcssPropRenderingMap[property] = {
      numberOfTwcssClasses: twcssClasses.length,
      filledClassIndexes: new Set<number>(),
    };
  });

  if (option.uiFramework === UiFramework.react) {
    classPropName = "className";
    variableProps = getVariablePropForTwcss(id, twcssPropRenderingMap);
  }

  let content: string = "";
  Object.entries(attributes).forEach(([property, value]) => {
    const twcssPropRenderingMeta: TwcssPropRenderingMeta =
      twcssPropRenderingMap[property];
    if (
      twcssPropRenderingMeta.numberOfTwcssClasses ===
      twcssPropRenderingMeta.filledClassIndexes.size
    ) {
      return;
    }

    for (let i = 0; i < twcssPropRenderingMeta.numberOfTwcssClasses; i++) {
      const parts: string[] = getTwcssClass(
        property,
        value,
        attributes,
        parentAttributes
      ).split(" ");
      if (twcssPropRenderingMeta.filledClassIndexes.has(i)) {
        continue;
      }
      content = content + " " + parts[i];
    }
  });

  content += variableProps;

  if (isEmpty(content)) {
    return "";
  }

  if (!isEmpty(variableProps)) {
    return `${classPropName}={\`${content.trim()}\`}`;
  }

  return `${classPropName}="${content.trim()}"`;
};

// buildTwcssConfigFileContent builds file content for tailwind.config.js.
export const buildTwcssConfigFileContent = (
  mainComponentFileExtension: string
) => {
  let fontFamilies = "";
  const entries = FontsRegistryGlobalInstance.getFontMetadataInArray();

  if (!isEmpty(entries)) {
    fontFamilies = entries
      .map((metadata) => `"${metadata.alias}": "${metadata.familyCss}",`)
      .join("");
  }

  const fontFamilyConfig = !isEmpty(fontFamilies)
    ? `fontFamily: {
      ${fontFamilies}
    },`
    : "";

  const file = `module.exports = {
    content: ["./*.${mainComponentFileExtension}"],
    theme: {
      ${fontFamilyConfig}
        extend: {},
      },
      plugins: [],
    };
    `;

  return file;
};

const largestTwcssHeightInPixels = 384;
const largestTwcssWidthInPixels = 384;
const largestTwcssLineheightInPixels = 45;

// url("./assets/image-1.png") -> "image-1"
export const getImageFileNameFromUrl = (path: string) => {
  const parts = path.split("/");
  const len = parts.length;

  if (parts.length >= 0) {
    const result = parts[len - 1].split(".");
    return result[0];
  }

  return "unknown";
};

// findClosestTwcssColor finds the closest tailwindcss color to css color.
const findClosestTwcssColor = (cssColor: string) => {
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

      if (parsedTwColor.alpha !== 0) {
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

// findClosestTwcssOpacity finds the closest tailwindcss opacity given the css color opacity.
const findClosestTwcssOpacity = (cssColorWithOpacity: string) => {
  const color = parseColor(cssColorWithOpacity);

  const roundedOpacity = Math.round(color.alpha * 100);

  const closetNumber = Math.floor(roundedOpacity / 5) * 5;

  return `text-opacity-${(roundedOpacity % 5 >= 3
    ? closetNumber + 5
    : closetNumber
  ).toString()}`;
};

// findClosestTwcssFontSize finds the closest font size given the css font size.
const findClosestTwcssFontSize = (cssFontSize: string) => {
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

// "0px" -> 0
const extractPixelNumberFromString = (pixelStr: string) =>
  parseInt(pixelStr.slice(0, -2), 10);

// findClosestTwcssClassUsingPixel finds the closest pixel representation in tailwindcss.
// 4px to 1
// 8px to 2
const findClosestTwcssClassUsingPixel = (
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

// findTwcssTextDecoration translates text-decoration from css to tailwindcss
const findTwcssTextDecoration = (textDecorationCSSValue: string) => {
  return tailwindTextDecorationMap[textDecorationCSSValue];
};

// findClosestTwcssLineHeight finds the closest line-height tailwindcss value given the corresponding css value
const findClosestTwcssLineHeight = (lineHeight: string): string => {
  let twClassToUse = "leading-none";
  const regexExecResult = /^([0-9]\d*(?:\.\d+)?)(%|px)$/.exec(lineHeight);

  if (regexExecResult) {
    const [_, givenLineHeight, unit] = regexExecResult;

    let minDiff = Infinity;

    Object.entries(twLineHeightMap).forEach(([twClass, cssValue]) => {
      let diff = Infinity;

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

// findClosestTwcssLetterSpacing finds the closest tailwindcss letter spacing given the fontsize and css letter spacing
const findClosestTwcssLetterSpacing = (
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

// findClosestTwcssFontWeight finds the closest tailwincss font weight given the css font weight
const findClosestTwcssFontWeight = (fontWeight: string): string => {
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

// const maxTwcssSizeInPixels = 384;
// const maxTwcssSizeInRem = 24;

// findClosestTwcssSize finds the closest size in tailwindcss given css value.
const findClosestTwcssSize = (cssSize: string): string => {
  const regexExecResult = /^([0-9]\d*(?:\.\d+)?)(px|rem)$/.exec(cssSize);

  let twSize = "";

  if (regexExecResult) {
    const [_, givenPaddingStr, givenUnit] = regexExecResult;
    const givenPadding = parseFloat(givenPaddingStr);

    let minDiff = Infinity;

    Object.entries(twUnitMap).forEach(([twValue, cssValue]) => {
      let diff: number = Infinity;

      if (givenUnit === "px" && cssValue.endsWith("px")) {
        const val = parseFloat(cssValue.slice(0, -2));
        // if (val > maxTwcssSizeInPixels) {
        //   return `${val}px`;
        // }

        diff = Math.abs(givenPadding - val);
      }

      if (givenUnit === "px" && cssValue.endsWith("rem")) {
        // assume root font size equals 16px, which is true in most cases

        const val = parseFloat(cssValue.slice(0, -3)) * 16;
        // if (val > maxTwcssSizeInPixels) {
        //   return `${val}px`;
        // }

        diff = Math.abs(givenPadding - val);
      }

      if (givenUnit === "rem" && cssValue.endsWith("rem")) {
        diff = Math.abs(givenPadding - parseFloat(cssValue.slice(0, -3)));
      }

      if (diff < minDiff) {
        minDiff = diff;
        twSize = twValue;
      }
    });

    if (Math.abs(minDiff) > 3) {
      return `[${givenPadding}${givenUnit}]`;
    }
  }

  return twSize;
};

// renderTwcssProperty stripes the tailwindcss property prefix if the value is empty.
const renderTwcssProperty = (prefix: string, value: string) => {
  if (!!value) {
    return prefix + value;
  }

  return "";
};

/**
 *
 * @param cssProperty the CSS property to convert to Tailwind CSS (e.g. "background-color")
 * @param cssValue the CSS value to convert to Tailwind CSS (e.g. "red")
 * @param cssAttributes the rest of the CSS attributes, as sometimes we need to refer to other attributes to find the suitable Tailwind CSS class
 * @param fonts
 * @returns A Tailwind CSS class as a string
 */
export const getTwcssClass = (
  cssProperty: string,
  cssValue: string,
  cssAttributes: Attributes,
  parentAttributes?: Attributes
): string => {
  if (isEmpty(cssValue)) {
    return "";
  }

  switch (cssProperty) {
    case "height":
      const heightNum = extractPixelNumberFromString(cssValue);
      if (cssValue.endsWith("px") && heightNum > largestTwcssHeightInPixels) {
        return `h-[${heightNum}px]`;
      }

      const approximatedTwcssHeightClass = findClosestTwcssClassUsingPixel(
        cssValue,
        twHeightMap,
        "h-0"
      );
      const approximatedHeightNum = extractPixelNumberFromString(
        twHeightMap[approximatedTwcssHeightClass]
      );

      if (Math.abs(approximatedHeightNum - heightNum) > 2) {
        return `h-[${heightNum}px]`;
      }

      return approximatedTwcssHeightClass;

    case "width":
      const widthNum = extractPixelNumberFromString(cssValue);
      if (cssValue.endsWith("px") && widthNum > largestTwcssWidthInPixels) {
        return `w-[${widthNum}px]`;
      }

      const approximatedTwcssWidthClass = findClosestTwcssClassUsingPixel(
        cssValue,
        twWidthMap,
        "w-0"
      );
      const approximatedWidthNum = extractPixelNumberFromString(
        twWidthMap[approximatedTwcssWidthClass]
      );

      if (Math.abs(approximatedWidthNum - widthNum) > 2) {
        return `w-[${widthNum}px]`;
      }

      return approximatedTwcssWidthClass;

    case "border-color":
      return "border-" + findClosestTwcssColor(cssValue);

    case "border-width": {
      const borderWidthTwSize = findClosestTwcssClassUsingPixel(
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
      const borderTopWidthTwSize = findClosestTwcssClassUsingPixel(
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
      const borderBottomWidthTwSize = findClosestTwcssClassUsingPixel(
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
      const borderLeftWidthTwSize = findClosestTwcssClassUsingPixel(
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
      const borderRightWidthTwSize = findClosestTwcssClassUsingPixel(
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
      const borderRadiusTwSize = findClosestTwcssClassUsingPixel(
        cssValue,
        twBorderRadiusMap,
        "none"
      );
      if (borderRadiusTwSize === "0") {
        return "";
      }

      const borderRadiusSize = extractPixelNumberFromString(cssValue);
      if (borderRadiusSize > MAX_BORDER_RADIUS_IN_PIXELS) {
        return `rounded-[${borderRadiusSize}px]`;
      }

      return borderRadiusTwSize === ""
        ? "rounded"
        : "rounded-" + borderRadiusTwSize;
    }

    case "background-color":
      return `bg-${findClosestTwcssColor(cssValue)}`;

    case "background-image":
      return `bg-${getImageFileNameFromUrl(cssValue)}`;

    case "box-shadow": {
      // A very naive conversion for now, because parsing box-shadow string is too complicated
      if (cssValue.includes("inset")) {
        // inner shadow
        return "shadow-inner";
      } else {
        // drop shadow
        return "shadow-xl";
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

    case "position": {
      switch (cssValue) {
        case "absolute":
          return "absolute";
        case "relative":
          return "relative";
        default:
          return "";
      }
    }

    case "top": {
      return renderTwcssProperty("top-", findClosestTwcssSize(cssValue));
    }

    case "bottom": {
      return renderTwcssProperty("bottom-", findClosestTwcssSize(cssValue));
    }

    case "left": {
      return renderTwcssProperty("left-", findClosestTwcssSize(cssValue));
    }

    case "right": {
      return renderTwcssProperty("right-", findClosestTwcssSize(cssValue));
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
      return renderTwcssProperty("p-", findClosestTwcssSize(cssValue));
    }

    case "padding-top": {
      return renderTwcssProperty("pt-", findClosestTwcssSize(cssValue));
    }

    case "padding-bottom": {
      return renderTwcssProperty("pb-", findClosestTwcssSize(cssValue));
    }

    case "padding-left": {
      return renderTwcssProperty("pl-", findClosestTwcssSize(cssValue));
    }

    case "padding-right": {
      return renderTwcssProperty("pr-", findClosestTwcssSize(cssValue));
    }

    case "margin-top": {
      return renderTwcssProperty("mt-", findClosestTwcssSize(cssValue));
    }

    case "margin-bottom": {
      return renderTwcssProperty("mb-", findClosestTwcssSize(cssValue));
    }

    case "margin-left": {
      return renderTwcssProperty("ml-", findClosestTwcssSize(cssValue));
    }

    case "margin-right": {
      return renderTwcssProperty("mr-", findClosestTwcssSize(cssValue));
    }

    case "gap": {
      return renderTwcssProperty("gap-", findClosestTwcssSize(cssValue));
    }

    case "column-gap": {
      return renderTwcssProperty("gap-x-", findClosestTwcssSize(cssValue));
    }

    case "row-gap": {
      return renderTwcssProperty("gap-y-", findClosestTwcssSize(cssValue));
    }

    case "font-family":
      const alias = FontsRegistryGlobalInstance.getTwcssAlias(cssValue);
      if (isEmpty(alias)) {
        return "";
      }

      return `font-${alias}`;

    case "font-size":
      return findClosestTwcssFontSize(cssValue);

    case "text-decoration":
      return findTwcssTextDecoration(cssValue);

    case "color":
      return `text-${findClosestTwcssColor(cssValue)} ${findClosestTwcssOpacity(
        cssValue
      )}`;

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
      const lineHeightNum = extractPixelNumberFromString(cssValue);
      if (
        cssValue.endsWith("px") &&
        lineHeightNum > largestTwcssLineheightInPixels
      ) {
        return `leading-[${lineHeightNum}px]`;
      }

      return findClosestTwcssLineHeight(cssValue);
    }

    case "overflow-wrap": {
      switch (cssValue) {
        case "break-word":
          return "break-words";
        default:
          return "";
      }
    }

    case "overflow": {
      switch (cssValue) {
        case "hidden":
          return "overflow-hidden";
        default:
          return "";
      }
    }

    case "white-space": {
      switch (cssValue) {
        case "nowrap":
          return "whitespace-nowrap";
        default:
          return "";
      }
    }

    case "letter-spacing": {
      const fontSizeString =
        cssAttributes?.["font-size"] || parentAttributes?.["font-size"];

      // assume font size is always in px
      const fontSize = parseInt(fontSizeString.slice(0, -2), 10);
      const twClass = findClosestTwcssLetterSpacing(cssValue, fontSize);
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

    case "vertical-align": {
      switch (cssValue) {
        case "center":
          return "align-middle";
        case "top":
          return "align-top";
        case "bottom":
          return "align-bottom";
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
      return findClosestTwcssFontWeight(cssValue);
    }

    case "list-style-type": {
      if (cssValue === "disc") {
        return "list-disc";
      }
      if (cssValue === "decimal") {
        return "list-decimal";
      }
    }

    default:
      return "";
  }
};
