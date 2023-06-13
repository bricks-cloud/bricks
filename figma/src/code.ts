import { convertToCode } from "bricks-core/src";

figma.showUI(__html__, { height: 300, width: 350 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "styled-bricks-nodes") {
    const promise = convertToCode(figma.currentPage.selection, {
      language: msg.options.language,
      cssFramework: msg.options.cssFramework,
      uiFramework: msg.options.uiFramework,
    });

    promise
      .then((files) => {
        figma.ui.postMessage({
          type: "generated-files",
          files,
        });
      })
      .catch((e) => {
        const errorDetails = {
          error: e.name,
          message: e.message,
          stack: e.stack,
        };

        console.error("Error from Figma core:\n", errorDetails);

        figma.ui.postMessage({
          type: "generated-files",
          files: [],
          error: true,
        });
      });
  }

  if (msg.type === "update-settings") {
    await figma.clientStorage.setAsync("settings", msg.settings);

    let settings = await figma.clientStorage.getAsync("settings");

    figma.ui.postMessage({
      type: "settings",
      settings,
    });
  }

  if (msg.type === "update-connection-status") {
    figma.clientStorage.setAsync("connection-status", msg.connected);
  }

  if (msg.type === "adjust-plugin-screen-size") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "get-settings") {
    let settings = await figma.clientStorage.getAsync("settings");

    figma.ui.postMessage({
      type: "settings",
      settings,
    });
  }
};

figma.on("selectionchange", async () => {
  figma.ui.postMessage({
    type: "selection-change",
    isComponentSelected: figma.currentPage.selection.length > 0,
    selectedComponents: figma.currentPage.selection.map((x) => x.name),
  });
});
