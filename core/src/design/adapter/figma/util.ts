import { isEmpty } from "../../../utils";

const round = Math.round;
const roundToTwoDps = (num: number) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export function colorToString(color: RGB): string {
  const { r, g, b } = color;
  return `rgb(${round(r * 255)},${round(g * 255)},${round(b * 255)})`;
}

export function colorToStringWithOpacity(color: RGB, opacity: number): string {
  const { r, g, b } = color;

  return `rgba(${round(r * 255)},${round(g * 255)},${round(
    b * 255
  )},${roundToTwoDps(opacity)})`;
}

export function rgbaToString(color: RGBA): string {
  const { r, g, b, a } = color;

  return `rgba(${round(r * 255)},${round(g * 255)},${round(
    b * 255
  )},${roundToTwoDps(a)})`;
}

// isFrameNodeTransparent determines whether the Figma frame node is transparent.
export const isFrameNodeTransparent = (
  node: FrameNode | InstanceNode | ComponentNode
): boolean => {
  let allColorInvis: boolean = true;
  if (node.fills !== figma.mixed && !isEmpty(node.fills)) {
    for (const fill of node.fills) {
      if (fill.visible) {
        allColorInvis = false;
      }
    }
  }

  let noBorders: boolean = true;
  if (!isEmpty(node.strokes)) {
    noBorders = false;
  }

  return allColorInvis && noBorders;
};

// doesNodeContainsAnImage tests whether rectangle node contain an image
export const doesNodeContainsAnImage = (
  node: RectangleNode | EllipseNode
): boolean => {
  if (node.fills != figma.mixed) {
    if (!isEmpty(node.fills) && node.fills[0].type === "IMAGE") {
      return true;
    }
  }

  return false;
};

export function getMostCommonFieldInString<
  T extends keyof Omit<StyledTextSegment, "characters" | "start" | "end">
>(figmaTextNode: TextNode, field: T) {
  const styledTextSegments = figmaTextNode.getStyledTextSegments([field]);

  type Variation = Pick<
    StyledTextSegment,
    T | "characters" | "start" | "end"
  >[T];

  // Count the number of characters that has each variation of "field".
  // For example, if field is "fontSize", variations are the different font sizes (12, 14, etc.)
  // Pick<StyledTextSegment, T | "characters" | "start" | "end">[T]
  const fieldNumOfChars = new Map<Variation, number>();
  styledTextSegments.forEach((segment) => {
    const variation = segment[field];
    if (!fieldNumOfChars.has(variation)) {
      fieldNumOfChars.set(variation, 0);
    }

    fieldNumOfChars.set(
      variation,
      fieldNumOfChars.get(variation) + segment.characters.length
    );
  });

  let variationWithLongestLength: Variation;
  let currentLongestLength = -Infinity;
  for (const [key, value] of fieldNumOfChars) {
    if (value > currentLongestLength) {
      currentLongestLength = value;
      variationWithLongestLength = key;
    }
  }

  console.log(
    "variation with longest length for field:",
    field,
    " = ",
    variationWithLongestLength
  );
  return variationWithLongestLength;
}

// calculating fills
function blendColors(color1: RGBA, color2: RGBA) {
  const a = 1 - (1 - color2.a) * (1 - color1.a);
  const r =
    (color2.r * color2.a) / a + (color1.r * color1.a * (1 - color2.a)) / a;
  const g =
    (color2.g * color2.a) / a + (color1.g * color1.a * (1 - color2.a)) / a;
  const b =
    (color2.b * color2.a) / a + (color1.b * color1.a * (1 - color2.a)) / a;
  return { r, g, b, a } as RGBA;
}

export function getFinalRgbaColor(colors: RGBA[]) {
  if (colors.length === 0) {
    throw new Error("At least one color is required");
  }

  return colors.reduce((finalColor, currentColor) => {
    return blendColors(finalColor, currentColor);
  });
}
