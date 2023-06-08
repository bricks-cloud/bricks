import { convertToCode } from "bricks-core/src";
import { isEmpty } from "bricks-core/src/utils";
import { init, Identify, identify, track } from "@amplitude/analytics-browser";
import { GenerationMethod } from "./constants";

init(process.env.AMPLITUDE_API_KEY, figma.currentUser.id, {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true,
  },
});

export const trackEvent = (eventName: string, eventProperties: any) => {
  const event = new Identify();
  event.setOnce("username", figma.currentUser.name);
  identify(event);
  track(eventName, isEmpty(eventProperties) ? {} : eventProperties);
};

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
    figma.clientStorage.setAsync("settings", msg.settings);
  }

  if (msg.type === "update-connection-status") {
    figma.clientStorage.setAsync("connection-status", msg.connected);
  }

  if (msg.type === "decrease-limit") {
    const limit = await figma.clientStorage.getAsync("limit");
    await figma.clientStorage.setAsync("limit", limit - 1);

    figma.ui.postMessage({
      type: "decrease-limit",
      limit: limit - 1,
    });
  }

  if (msg.type === "get-limit") {
    const limit: number = await figma.clientStorage.getAsync("limit");

    figma.ui.postMessage({
      type: "get-limit",
      limit,
    });
  }

  if (msg.type === "reset-limit") {
    await figma.clientStorage.setAsync("limit", 6);
  }

  if (msg.type === "set-last-reset") {
    await figma.clientStorage.setAsync("last-reset", Date.now());
  }

  if (msg.type === "get-last-reset") {
    if (figma.currentUser.id === "624412189236026359") {
      await figma.clientStorage.setAsync("limit", 6);
    }

    const reset: number = await figma.clientStorage.getAsync("last-reset");

    figma.ui.postMessage({
      type: "get-last-reset",
      reset,
    });
  }

  if (msg.type === "adjust-plugin-screen-size") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "get-settings") {
    let settings = await figma.clientStorage.getAsync("settings");

    let generationMethod: GenerationMethod = GenerationMethod.withai;
    if (settings.generationMethod) {
      generationMethod = settings.generationMethod;
    }

    figma.ui.postMessage({
      type: "settings",
      userId: figma.currentUser.id,
      settings: {
        ...settings,
        generationMethod,
      },
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
