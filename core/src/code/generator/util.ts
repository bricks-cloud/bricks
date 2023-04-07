import { isEmpty } from "../../utils";
import { ImportedComponentMeta } from "./html/generator";
import { ExportFormat } from "../../design/adapter/node";
import { Option, File, UiFramework, Language } from "../code";

// getFileExtensionFromLanguage determines file extension for the main file depending on the input option
export const getFileExtensionFromLanguage = (option: Option): string => {
  if (option.uiFramework === UiFramework.html) {
    return "html";
  }

  if (option.language === Language.typescript) {
    return "tsx";
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


// constructExtraFiles creates extra files if they are imported in the main file
export const constructExtraFiles = async (
  importedComponents: ImportedComponentMeta[],
): Promise<File[]> => {
  let files: File[] = [];
  if (isEmpty(importedComponents)) {
    return files;
  }

  for (const importComponent of importedComponents) {
    const extension = getExtensionFromFilePath(importComponent.importPath);

    if (extension === "svg") {
      files.push({
        content: await importComponent.node.export(ExportFormat.SVG),
        path: importComponent.importPath,
      });

      continue;
    }

    files.push({
      content: await importComponent.node.export(ExportFormat.PNG),
      path: importComponent.importPath,
    });
  }

  return files;
};
