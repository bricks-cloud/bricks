import { isEmpty } from "lodash";
import { ImportedComponentMeta } from "./html/generator";
import { ExportFormat } from "../../design/adapter/node";
import { Option, File, UiFramework, Language } from "../code";

export const getFileExtensionFromLanguage = (option: Option): string => {
  if (option.uiFramework === UiFramework.html) {
    return "html";
  }

  if (option.language === Language.typescript) {
    return "tsx";
  }

  return "jsx";
};

export const getFileExtension = (file: File) => {
  const parts = file.path.split(".");
  return parts[parts.length - 1];
};

export const constructExtraSvgFiles = async (
  importedComponents: ImportedComponentMeta[],
): Promise<File[]> => {
  let files: File[] = [];
  if (isEmpty(importedComponents)) {
    return files;
  }

  for (const importComponent of importedComponents) {
    files.push({
      content: await importComponent.node.exportAsSvg(ExportFormat.SVG),
      path: importComponent.importPath,
    });
  }

  return files;
};
