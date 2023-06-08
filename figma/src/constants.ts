export interface Settings {
  uiFramework: UiFramework;
  cssFramework: CssFramework;
}

export enum UiFramework {
  react = "react",
  html = "html",
}

export enum CssFramework {
  css = "css",
  tailwindcss = "tailwindcss",
}
