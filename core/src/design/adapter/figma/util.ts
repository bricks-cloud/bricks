import { isEmpty } from "lodash";

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
export const isFrameNodeTransparent = (node: FrameNode): boolean => {
  let allColorInvis: boolean = true;
  if (!isEmpty(node.fills) && node.fills !== figma.mixed) {
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