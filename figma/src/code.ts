import { convertToCode } from "bricks-core/src";

figma.showUI(__html__, { height: 700, width: 400 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "styled-bricks-nodes") {
    figma.ui.postMessage({
      type: "styled-bricks-nodes",
      files: await convertToCode(figma.currentPage.selection, {
        language: msg.options.language,
        cssFramework: msg.options.cssFramework,
        uiFramework: msg.options.uiFramework,
      }),
    });
  }

  if (msg.type === "update-settings") {
    figma.clientStorage.setAsync("settings", msg.settings);
  }

  if (msg.type === "get-settings") {
    const settings = await figma.clientStorage.getAsync("settings");

    figma.ui.postMessage({
      type: "settings",
      settings,
    });
  }
};

figma.on("selectionchange", () => {
  figma.ui.postMessage({
    type: "selection-change",
    isComponentSelected: figma.currentPage.selection.length > 0,
    selectedComponents: figma.currentPage.selection.map((x) => x.name),
  });
});
