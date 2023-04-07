import { isEmpty } from "../utils";
import { Attributes } from "../design/adapter/node";
import { Option } from "./node";
import { BoxCoordinates } from "../design/adapter/node";

// values taken from different sources could have a lot of fractional digits.
// for readability purposes, these numbers should be truncated
export const truncateNumbers = (value: string): string => {
  if (value.endsWith("px")) {
    const num = parseInt(value.slice(0, -2), 10);
    return `${Math.trunc(num)}px`;
  }

  if (value.endsWith("%")) {
    const num = parseInt(value.slice(0, -1), 10);
    return `${Math.trunc(num)}%`;
  }

  return value;
};

// zeroValueFilter prevents values like 0px 0% 0.05px from showing up in generated code
export const zeroValueFilter = (value: string): boolean => {
  if (value.endsWith("px")) {
    const num = parseInt(value.slice(0, -2), 10);
    if (Math.trunc(num) === 0) {
      return false;
    }

    return true;
  }

  if (value.endsWith("%")) {
    const num = parseInt(value.slice(0, -2), 10);
    if (Math.trunc(num) === 0) {
      return false;
    }

    return true;
  }

  return true;
};

type FitlerFunction = (value: string) => boolean;
type ModifierFunction = (value: string) => string;

// filterAttributes filters and modfies attribtues
export const filterAttributes = (
  attributes: Attributes,
  option: Option
): Attributes => {
  const copy: Attributes = {};
  const filters: FitlerFunction[] = [];
  const modifiers: ModifierFunction[] = [];

  if (!option.zeroValueAllowed) {
    filters.push(zeroValueFilter);
  }

  if (option.truncateNumbers) {
    modifiers.push(truncateNumbers);
  }

  if (isEmpty(modifiers) && isEmpty(filters)) {
    return attributes;
  }

  Object.entries(attributes).forEach(([key, value]) => {
    let pass: boolean = true;
    for (const filterFunction of filters) {
      pass = pass && filterFunction(value);
    }

    if (!pass) {
      return;
    }

    let updated: string = value;
    for (const modifierFunction of modifiers) {
      updated = modifierFunction(updated);
    }

    copy[key] = updated;
  });

  return copy;
};


// filterCssValue filters and modfies cssValue
export const filterCssValue = (
  cssValue: string,
  option: Option
): string => {
  const modifiers: ModifierFunction[] = [];
  const filters: FitlerFunction[] = [];

  if (!option.zeroValueAllowed) {
    filters.push(zeroValueFilter);
  }

  if (option.truncateNumbers) {
    modifiers.push(truncateNumbers);
  }

  if (isEmpty(modifiers)) {
    return cssValue;
  }

  if (isEmpty(cssValue)) {
    return cssValue;
  }

  let pass: boolean = true;
  for (const filterFunction of filters) {
    pass = pass && filterFunction(cssValue);
  }

  if (!pass) {
    return "";
  }

  let updated: string = cssValue;
  for (const modifierFunction of modifiers) {
    updated = modifierFunction(updated);
  }


  return updated;
};

// // calculateOutsidePercentage calculates the area of the target rectangle that is outside of the current rectangle
// // as percentage of the current rectangle's area
// export const calculateOutsidePercentage = (target: BoxCoordinates, current: BoxCoordinates): number => {
//   // Calculate the area of rectangle a
//   const areaOfA = calculateArea(target);

//   // Calculate the area of the intersection between a and b
//   const intersectionArea = calculateIntersectionArea(target, current);

//   // Calculate the area of rectangle b
//   const areaOfB = calculateArea(current);

//   // Calculate the area of rectangle a that is outside of rectangle b
//   const areaOfAOutsideB = areaOfA - intersectionArea;

//   // Calculate the percentage of area of a that is outside of b as a percentage of b's overall area
//   return (areaOfAOutsideB / areaOfB) * 100;
// };

// const calculateArea = (box: BoxCoordinates): number => {
//   const { leftTop, leftBot, rightTop } = box;
//   const width = Math.abs(rightTop.x - leftTop.x);
//   const height = Math.abs(leftTop.y - leftBot.y);
//   return width * height;
// };

// const calculateIntersectionArea = (a: BoxCoordinates, b: BoxCoordinates): number => {
//   const left = Math.max(a.leftTop.x, b.leftTop.x);
//   const right = Math.min(a.rightTop.x, b.rightTop.x);
//   const top = Math.max(a.leftTop.y, b.leftTop.y);
//   const bottom = Math.min(a.leftBot.y, b.leftBot.y);
//   const width = Math.max(right - left, 0);
//   const height = Math.max(bottom - top, 0);
//   return width * height;
// };