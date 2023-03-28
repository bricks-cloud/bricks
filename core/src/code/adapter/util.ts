import { Language, File } from "../code";

export const getFileExtensionFromLanguage = (language: Language): string => {
  if (language === Language.html) {
    return "html";
  }

  if (language === Language.typescript) {
    return "tsx";
  }

  return "jsx";
};

export const getFileExtension = (file: File) => {
  const parts = file.path.split(".");
  return parts[parts.length - 1];
};
