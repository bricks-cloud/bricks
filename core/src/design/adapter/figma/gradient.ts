import { colorToStringWithOpacity } from "./util";
import matrixInverse from "matrix-inverse";

export const calculateAngle = (start: number[], end: number[]): number => {
  const startX: number = start[0];
  const startY: number = start[1];

  const arbitraryX: number = startX + 200;
  const arbitraryY: number = startY;

  const endX: number = end[0];
  const endY: number = end[1];

  const a = Math.pow(startX - arbitraryX, 2) + Math.pow(startY - arbitraryY, 2);
  const b = Math.pow(startX - endX, 2) + Math.pow(startY - endY, 2);
  const c = Math.pow(arbitraryX - endX, 2) + Math.pow(arbitraryY - endY, 2);

  const radians = Math.acos((a + b - c) / Math.sqrt(4 * a * b));
  const angle = radians * (180 / Math.PI);

  return Math.round(angle);
};

export const getGradientAxisLength = (start: number[], end: number[]) => {
  return Math.sqrt(
    Math.pow(start[0] - end[0], 2) + Math.pow(start[1] - end[1], 2)
  );
};

const getGradientColors = (
  gradientStops: readonly ColorStop[]
): [string, number][] => {
  const results: [string, number][] = [];
  for (const gradientStop of gradientStops) {
    results.push([
      colorToStringWithOpacity(gradientStop.color, gradientStop.color.a),
      Math.trunc(gradientStop.position * 10) / 10,
    ]);
  }

  return results;
};

export const stringifyGradientColors = (
  gradientStops: readonly ColorStop[],
  gradientAxisLength: number,
  chosenAxisLength: number,
  beginningExtra: number
) => {
  const gradientColors: [string, number][] = getGradientColors(gradientStops);
  let result: string = "";

  let cum: number = 0;

  for (let i = 0; i < gradientColors.length; i++) {
    const gradientColor = gradientColors[i];
    result += gradientColor[0] + " ";

    let segmentPercentage: number = 0;
    if (i - 1 >= 0) {
      segmentPercentage = gradientColor[1] - gradientColors[i - 1][1];
    }

    let percentage: number = Math.round(
      ((gradientAxisLength * segmentPercentage) / chosenAxisLength) * 100
    );
    if (i === 0) {
      percentage = Math.round(
        ((gradientAxisLength * segmentPercentage + beginningExtra) /
          chosenAxisLength) *
          100
      );
    }

    cum += percentage;

    let percentageStr: string = cum.toString() + "%";
    result += percentageStr;
    if (i !== gradientColors.length - 1) {
      result += ",";
    }
  }

  return result;
};

export function applyMatrixToPoint(matrix: number[][], point: number[]) {
  return [
    point[0] * matrix[0][0] + point[1] * matrix[0][1] + matrix[0][2],
    point[0] * matrix[1][0] + point[1] * matrix[1][1] + matrix[1][2],
  ];
}

export function extractLinearGradientParamsFromTransform(
  shapeWidth: number,
  shapeHeight: number,
  t: Transform
) {
  const transform = t.length === 2 ? [...t, [0, 0, 1]] : [...t];
  const mxInv = matrixInverse(transform);
  const startEnd = [
    [0, 0],
    [0, 1],
  ].map((p) => applyMatrixToPoint(mxInv, p));
  return {
    start: [startEnd[0][0] * shapeWidth, startEnd[0][1] * shapeHeight],
    end: [startEnd[1][0] * shapeWidth, startEnd[1][1] * shapeHeight],
  };
}
