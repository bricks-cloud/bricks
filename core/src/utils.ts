import { NameMap } from "./code/code";
import { File } from "./code/code";

export const isEmpty = (value: any): boolean => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const replaceVariableNameWithinFile = (files: File[], nameMap: NameMap) => {
  for (const file of files) {
    if (file.path === "/GeneratedComponent.jsx") {
      let content: string = file.content;
      Object.entries(nameMap).forEach(([oldName, newName]) => {
        content = content.replaceAll(new RegExp("\\b" + oldName + "\\b", "g"), newName);
      });

      file.content = content;
    }
  }
};