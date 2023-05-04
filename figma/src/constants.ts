export interface Settings {
  isFirstTimeUser: boolean;
  language: Language;
  uiFramework: UiFramework;
  cssFramework: CssFramework;
  generationMethod: GenerationMethod;
}

export enum Language {
  javascript = "javascript",
  typescript = "typescript",
}

export enum UiFramework {
  react = "react",
  html = "html",
}


export enum GenerationMethod {
  withai = "withai",
  withoutai = "without-ai",
}

export enum CssFramework {
  css = "css",
  tailwindcss = "tailwindcss",
}


export enum AiApplication {
  componentIdentification = "componentIdentification",
  autoNaming = "autoNaming",
}