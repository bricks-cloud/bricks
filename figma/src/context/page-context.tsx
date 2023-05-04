import React from "react";

export const PAGES = {
  HOME: "HOME",
  SETTING: "SETTING",
  CODE_GENERATION: "CODE_GENERATION",
  POST_CODE_GENERATION: "POST_CODE_GENERATION",
  POST_CODE_GENERATION_AI: "POST_CODE_GENERATION_AI",
  ERROR: "ERROR",
};

const PageContext = React.createContext({
  currentPage: PAGES.HOME,
  previousPage: PAGES.HOME,
  setCurrentPage: (page: string) => {},
});

export default PageContext;
