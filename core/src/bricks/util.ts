import { isEmpty } from "../utils";
import { Attributes } from "../design/adapter/node";
import { Node, NodeType, Option } from "./node";

const toOneDecimal = (num: number): number => Math.round(num * 10) / 10;

// backgroundColorFilter filters background color
export const backgroundColorFilter = (key: string, _: string): boolean => {
  if (key === "background-color") {
    return false;
  }

  return true;
};

// absolutePositioningFilter filters non absolute positioning related attributes
export const absolutePositioningFilter = (key: string, _: string): boolean => {
  const absolutePositioningFilters: string[] = [
    "position",
    "right",
    "top",
    "left",
    "bottom",
  ];

  if (absolutePositioningFilters.includes(key)) {
    return true;
  }

  return false;
};

// marignFilter filters non marign related attributes
export const marignFilter = (key: string, _: string): boolean => {
  const marginFilter: string[] = [
    "margin-left",
    "margin-right",
    "margin-top",
    "margin-bottom",
  ];

  if (marginFilter.includes(key)) {
    return true;
  }

  return false;
};

// values taken from different sources could have a lot of fractional digits.
// for readability purposes, these numbers should be truncated
export const truncateNumbers = (value: string): string => {
  if (value.endsWith("px")) {
    const num = parseFloat(value.slice(0, -2));
    return `${toOneDecimal(num)}px`;
  }

  if (value.endsWith("%")) {
    const num = parseFloat(value.slice(0, -1));
    return `${toOneDecimal(num)}%`;
  }

  return value;
};

// zeroValueFilter prevents values like 0px 0% 0.05px from showing up in generated code
export const zeroValueFilter = (_: string, value: string): boolean => {
  if (isEmpty(value)) {
    return false;
  }

  let nonNegativeNum: string = value;
  if (value.startsWith("-")) {
    nonNegativeNum = value.substring(1);
  }

  if (nonNegativeNum.endsWith("px")) {
    const num = parseFloat(nonNegativeNum.slice(0, -2));

    if (toOneDecimal(num) === 0) {
      return false;
    }

    return true;
  }

  if (value.endsWith("%")) {
    const num = parseFloat(value.slice(0, -2));
    if (toOneDecimal(num) === 0) {
      return false;
    }

    return true;
  }

  return true;
};

type FilterFunction = (key: string, value: string) => boolean;
type ModifierFunction = (value: string) => string;

// filterAttributes filters and modfies attribtues
export const filterAttributes = (
  attributes: Attributes,
  option: Option
): Attributes => {
  const copy: Attributes = {};
  const filters: FilterFunction[] = [];
  const modifiers: ModifierFunction[] = [];

  if (!option.zeroValueAllowed) {
    filters.push(zeroValueFilter);
  }

  if (option.truncateNumbers) {
    modifiers.push(truncateNumbers);
  }

  if (option.excludeBackgroundColor) {
    filters.push(backgroundColorFilter);
  }

  if (option.absolutePositioningFilter) {
    filters.push(absolutePositioningFilter);
  }

  if (option.marginFilter) {
    filters.push(marignFilter);
  }

  if (isEmpty(modifiers) && isEmpty(filters)) {
    return attributes;
  }

  Object.entries(attributes).forEach(([key, value]) => {
    let pass: boolean = true;
    for (const filterFunction of filters) {
      pass = pass && filterFunction(key, value);
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
export const filterCssValue = (cssValue: string, option: Option): string => {
  const modifiers: ModifierFunction[] = [];
  const filters: FilterFunction[] = [];

  if (!option.zeroValueAllowed) {
    filters.push(zeroValueFilter);
  }

  if (option.absolutePositioningFilter) {
    filters.push(absolutePositioningFilter);
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
    pass = pass || filterFunction("", cssValue);
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

export const shouldUseAsBackgroundImage = (node: Node): boolean => {
  if (node.getType() === NodeType.VECTOR && !isEmpty(node.getChildren())) {
    return true;
  }

  if (node.getType() === NodeType.IMAGE && !isEmpty(node.getChildren())) {
    return true;
  }

  return false;
};
