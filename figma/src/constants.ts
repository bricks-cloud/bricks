export interface Settings {
  isFirstTimeUser: boolean;
  language: Language;
  uiFramework: UiFramework;
  cssFramework: CssFramework;
}

export enum Language {
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
