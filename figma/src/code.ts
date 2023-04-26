import { convertToCode } from "bricks-core/src";
import { isEmpty } from "bricks-core/src/utils";
import { init, Identify, identify, track } from "@amplitude/analytics-browser";
import { EVENT_ERROR } from "./analytics/amplitude";

init("", figma.currentUser.id, {
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

figma.showUI(__html__, { height: 700, width: 400 });

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

  if (msg.type === "update-settings") {
    figma.clientStorage.setAsync("settings", msg.settings);
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

figma.on("selectionchange", () => {
  figma.ui.postMessage({
    type: "selection-change",
    isComponentSelected: figma.currentPage.selection.length > 0,
    selectedComponents: figma.currentPage.selection.map((x) => x.name),
  });
});
