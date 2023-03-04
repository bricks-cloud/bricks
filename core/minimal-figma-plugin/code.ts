import { parse } from "../src/index";

figma.showUI(__html__);

// restore previous window size
figma.clientStorage.getAsync("size").then((size) => {
  if (size) figma.ui.resize(size.w, size.h);
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate-bricks-nodes") {
    const styledBricksNodes = await parse(figma.currentPage.selection);

    console.log(styledBricksNodes);

    figma.ui.postMessage({
      type: "render-nodes",
      nodes: styledBricksNodes,
    });
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.size.w, msg.size.h);
    figma.clientStorage.setAsync("size", msg.size).catch((err) => {}); // save size
  }
};
