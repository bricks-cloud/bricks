import { generateBricksTree } from "./src/grouping";
import { generateStyledBricksNode } from "./src/StyledBricksNode";

figma.showUI(__html__);

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate-bricks-nodes") {
    const result = await generateBricksTree(figma.currentPage.selection);
    const styledNodes = await Promise.all(result.map(generateStyledBricksNode));
    console.log(styledNodes);
  }
};
