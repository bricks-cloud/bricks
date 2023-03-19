import { convertToCode } from "bricks-core/src";

figma.showUI(__html__, { height: 700, width: 400 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate-styled-bricks-nodes") {
    // const styledBricksNodes = await parse(figma.currentPage.selection);

    // figma.ui.postMessage({
    //   type: "styled-bricks-nodes",
    //   styledBricksNodes,
    // });

    figma.ui.postMessage({
      type: "new-styled-bricks-nodes",
      files: convertToCode(figma.currentPage.selection),
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
