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
