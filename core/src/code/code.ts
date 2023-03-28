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

export interface Option {
    language?: Language
    uiFramework?: UiFramework
    cssFramework?: CssFramework
}