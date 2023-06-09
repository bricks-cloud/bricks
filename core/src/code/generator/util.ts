import { isEmpty } from "../../utils";
import { Option, File, UiFramework, Language } from "../code";
import { Node, NodeType } from "../../bricks/node";

// getFileExtensionFromLanguage determines file extension for the main file depending on the input option
export const getFileExtensionFromLanguage = (option: Option): string => {
  if (option.uiFramework === UiFramework.html) {
    return "html";
  }

  return "jsx";
};

// getFileExtension gets file extension given a file object
export const getFileExtension = (file: File) => {
  return getExtensionFromFilePath(file.path);
};

export const getExtensionFromFilePath = (path: string) => {
  const parts = path.split(".");
  return parts[parts.length - 1];
};

const isNumeric = (str: string): boolean => {
  if (typeof str != "string") return false; // we only process strings!
  return !isNaN(parseFloat(str)); // ...and ensure strings of whitespace fail
};

export const cssStrToNum = (value: string): number => {
  if (isEmpty(value)) {
    return 0;
  }

  if (value.endsWith("px")) {
    return parseInt(value.slice(0, -2));
  }

  if (value.endsWith("rem")) {
    return parseInt(value.slice(0, -3));
  }

  if (isNumeric(value)) {
    return parseInt(value);
  }

  return 0;
};

// styling in React requires CSS property to be camel cased such as style={{ justifyContent: "center" }}
export const snakeCaseToCamelCase = (prop: string) => {
  const parts = prop.split("-");

  const camel = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      camel.push(part);
      continue;
    }

    camel.push(part.charAt(0).toUpperCase() + part.slice(1));
  }

  return camel.join("");
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
