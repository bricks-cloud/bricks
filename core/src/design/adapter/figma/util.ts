import { GoogleFontsInstance } from "../../../google/google-fonts";
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
  node: SceneNode
): boolean => {
  // @ts-ignore
  if (isEmpty(node.fills)) {
    return false;
  }
  // @ts-ignore
  if (node.fills != figma.mixed) {
    // @ts-ignore
    for (const fill of node.fills) {
      if (fill.type === "IMAGE") {
        return true;
      }
    }
  }

  return false;
};

type Variation<
  T extends keyof Omit<StyledTextSegment, "characters" | "start" | "end">
> = Pick<StyledTextSegment, T | "characters" | "start" | "end">[T];

/**
 *
 * @param figmaTextNode
 * @param field
 * @param options
 * @returns
 */
export function getMostCommonFieldInString<
  T extends keyof Omit<StyledTextSegment, "characters" | "start" | "end">
>(
  figmaTextNode: TextNode,
  field: T,
  options: {
    /**
     * areVariationsEqual is an optional function that returns if two variations are equal are not.
     * @returns true if variations are equal, false otherwise
     */
    areVariationsEqual?: (
      variation1: Variation<T>,
      variation2: Variation<T>
    ) => boolean;
    /**
     * variationModifier is an optional function used to modify a variation before it's used to count the number of characters.
     * Return null if you don't want the variation to be considered.
     * @returns modified variation or null
     */
    variationModifier?: (variation: Variation<T>) => Variation<T> | null;
  } = {}
): Variation<T> {
  const { areVariationsEqual, variationModifier } = options;
  const styledTextSegments = figmaTextNode.getStyledTextSegments([field]);

  // Count the number of characters that has each variation of "field".
  // For example, if field is "fontSize", variations are the different font sizes (12, 14, etc.)
  const fieldNumOfChars = new Map<Variation<T>, number>();
  styledTextSegments.forEach((segment) => {
    const variation = variationModifier
      ? variationModifier(segment[field])
      : segment[field];

    if (variation === null) {
      return;
    }

    const segmentLength = segment.characters.length;
    if (areVariationsEqual) {
      for (const [existingVariation, sum] of fieldNumOfChars) {
        // if variation already exists, add to current sum
        if (areVariationsEqual(variation, existingVariation)) {
          fieldNumOfChars.set(existingVariation, sum + segmentLength);
          return;
        }
      }
      // if variation does not exist, intialize it
      fieldNumOfChars.set(variation, segmentLength);
    } else {
      // if variation already exists, add to current sum
      if (fieldNumOfChars.has(variation)) {
        fieldNumOfChars.set(
          variation,
          fieldNumOfChars.get(variation) + segmentLength
        );
      } else {
        // if variation does not exist, intialize it
        fieldNumOfChars.set(variation, segmentLength);
      }
    }
  });

  let variationWithLongestLength: Variation<T>;
  let currentLongestLength = -Infinity;
  for (const [variation, sum] of fieldNumOfChars) {
    if (sum > currentLongestLength) {
      currentLongestLength = sum;
      variationWithLongestLength = variation;
    }
  }

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

export function getRgbaFromPaints(paints: readonly Paint[]) {
  // TODO: support GradientPaint
  const solidPaints = paints.filter(
    (paint) => paint.type === "SOLID"
  ) as SolidPaint[];

  if (solidPaints.length === 0) {
    return null;
  }

  const colors = solidPaints.map(({ color, opacity }) => ({
    r: color.r,
    g: color.g,
    b: color.b,
    a: opacity,
  }));

  return colors.reduce((finalColor, currentColor) => {
    return blendColors(finalColor, currentColor);
  }) as RGBA;
}

export const figmaLineHeightToCssString = (lineHeight: LineHeight) => {
  switch (lineHeight.unit) {
    case "AUTO":
      return "100%";
    case "PERCENT":
      return `${lineHeight.value}%`;
    case "PIXELS":
      return `${lineHeight.value}px`;
  }
};

export const figmaLetterSpacingToCssString = (letterSpacing: LetterSpacing) => {
  if (letterSpacing.value === 0) {
    return "normal";
  }

  switch (letterSpacing.unit) {
    case "PERCENT":
      return `${roundToTwoDps(letterSpacing.value / 100)}em`;
    case "PIXELS":
      return `${letterSpacing.value}px`;
  }
};

export const figmaFontNameToCssString = (fontName: FontName) => {
  const fontFamily = fontName.family;
  return `'${fontFamily}', ${GoogleFontsInstance.getGenericFontFamily(
    fontFamily
  )}`;
};

export const hasShadow = (figmaNode: SceneNode) => {
  // @ts-ignore
  if (!isEmpty(figmaNode?.effects)) {
    // @ts-ignore
    const dropShadowStrings: string[] = figmaNode.effects.filter(
      (effect) =>
        effect.visible &&
        (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW")
    );

    if (dropShadowStrings.length > 0) {
      return true;
    }
  }

  return false;
};

export function isRectangle(svgPath) {
  const commands = svgPath.trim().split(/(?=[A-Za-z])/);

  // A rectangle path should consist of 'M', 4 'L' commands and 'Z'
  if (commands.length !== 6) {
    return false;
  }

  if (commands[0][0] !== "M" || commands[5] !== "Z") {
    return false;
  }

  for (let i = 1; i < 5; i++) {
    if (commands[i][0] !== "L") {
      return false;
    }
  }

  // Extract the coordinates from the commands
  const coordinates = commands
    .slice(1, 5)
    .map((command) => command.slice(1).trim().split(" ").map(Number));

  // Check if the lines are parallel to the axes.
  // If so, the x-coordinates of the start and end points of horizontal lines should be the same,
  // and the y-coordinates of vertical lines should be the same.
  if (
    coordinates[0][0] !== coordinates[1][0] ||
    coordinates[2][0] !== coordinates[3][0]
  ) {
    return false;
  }

  if (
    coordinates[1][1] !== coordinates[2][1] ||
    coordinates[3][1] !== coordinates[0][1]
  ) {
    return false;
  }

  return true;
}
