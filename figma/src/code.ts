import { convertToCode, convertToCodeWithAi, scanCodeForSimilarNodes } from "bricks-core/src";
import { isEmpty } from "bricks-core/src/utils";
import { AMPLITUDE_API_KEY } from "../../env";
import { init, Identify, identify, track } from "@amplitude/analytics-browser";
import { EVENT_ERROR } from "./analytics/amplitude";

init(AMPLITUDE_API_KEY, figma.currentUser.id, {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true,
  },
});

function trackEvent(eventName: string, eventProperties: any) {
  const event = new Identify();
  event.setOnce("username", figma.currentUser.name);
  identify(event);
  track(eventName, isEmpty(eventProperties) ? {} : eventProperties);
}

figma.showUI(__html__, { height: 375, width: 350 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "styled-bricks-nodes") {
    try {
      const files = await convertToCode(figma.currentPage.selection, {
        language: msg.options.language,
        cssFramework: msg.options.cssFramework,
        uiFramework: msg.options.uiFramework,
      });

      figma.ui.postMessage({
        type: "generated-files",
        files,
      });
    } catch (e) {
      console.error("Error from Figma core:\n", e.stack);
      trackEvent(EVENT_ERROR, {
        source: "figma",
        error: e.stack,
      });

      figma.ui.postMessage({
        type: "generated-files",
        files: [],
        error: true,
      });
    }
  }

  if (msg.type === "generate-code-with-ai") {
    try {
      const files = await convertToCodeWithAi(figma.currentPage.selection, {
        language: msg.options.language,
        cssFramework: msg.options.cssFramework,
        uiFramework: msg.options.uiFramework,
      });

      figma.ui.postMessage({
        type: "generated-files",
        files,
      });
    } catch (e) {
      console.error("Error from Figma core:\n", e.stack);
      trackEvent(EVENT_ERROR, {
        source: "figma",
        error: e.stack,
      });

      figma.ui.postMessage({
        type: "generated-files",
        files: [],
        error: true,
      });
    }
  }

  if (msg.type === "update-settings") {
    figma.clientStorage.setAsync("settings", msg.settings);
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
    await figma.clientStorage.setAsync("limit", 8);
  }

  if (msg.type === "set-last-reset") {
    await figma.clientStorage.setAsync("last-reset", Date.now());
  }

  if (msg.type === "get-last-reset") {
    const reset: number = await figma.clientStorage.getAsync("last-reset");

    figma.ui.postMessage({
      type: "get-last-reset",
      reset,
    });
  }

  if (msg.type === "adjust-plugin-screen-size") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "analytics") {
    trackEvent(msg.eventName, msg.eventProperties);
  }

  if (msg.type === "get-settings") {
    const settings = await figma.clientStorage.getAsync("settings");

    figma.ui.postMessage({
      type: "settings",
      userId: figma.currentUser.id,
      settings,
    });
  }
};

figma.on("selectionchange", async () => {
  figma.ui.postMessage({
    type: "scan-for-ai-start",
  });


  figma.ui.postMessage({
    type: "selection-change",
    isComponentSelected: figma.currentPage.selection.length > 0,
    selectedComponents: figma.currentPage.selection.map((x) => x.name),
  });

  const settings = await figma.clientStorage.getAsync("settings");
  const option = {
    language: settings.language,
    cssFramework: settings.cssFramework,
    uiFramework: settings.uiFramework,
  };

  figma.ui.postMessage({
    type: "should-generate-with-ai",
    shouldGenerateWithAi: scanCodeForSimilarNodes(figma.currentPage.selection, option),
  });

  figma.ui.postMessage({
    type: "scan-for-ai-end",
  });
});
