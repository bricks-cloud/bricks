export interface File {
  content: string;
  path: string;
}

export enum Language {
  html = "html",
  javascript = "javascript",
  typescript = "typescript",
}

export enum UiFramework {
  react = "react",
  html = "html",
}

export enum CssFramework {
  css = "css",
  tailwindcss = "tailwindcss",
}

export enum CodePreviewLocation {
  vscode = "vscode",
  web = "web",
}

export interface Option {
  codePreviewLocation?: CodePreviewLocation;
  language?: Language;
  uiFramework?: UiFramework;
  cssFramework?: CssFramework;
}

export type NameMap = {
  [oldName: string]: string;
};
