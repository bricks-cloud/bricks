import { isEmpty } from "../utils";
import { Attributes } from "../design/adapter/node";
import { Option } from "./node";

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
