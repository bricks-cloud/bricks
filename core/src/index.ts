import { generateBricksNode } from "./grouping";
import { generateStyledBricksNode } from "./StyledBricksNode";
import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { convertToTwcssFiles } from "./code/adapter/tailwindcss/adapter";
import { Option } from "./code/code";
import { File, UiFramework, Language, CssFramework } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addPositionalCSSAttributesToNodes } from "./bricks/positional-css";
import { Node, GroupNode } from "./bricks/node";

export async function parse(figmaNodes: readonly SceneNode[]) {
  const bricksNodes = await generateBricksNode(figmaNodes);
  const styledBricksNodes = await Promise.all(
    bricksNodes.map(generateStyledBricksNode)
  );
  return styledBricksNodes;
}

export const convertToCode = (figmaNodes: readonly SceneNode[], option: Option): File[] => {
  const converted = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  let startingNode: Node = converted.length > 1 ? new GroupNode(converted) : converted[0];
  groupNodes(startingNode);
  addPositionalCSSAttributesToNodes(startingNode);

  console.log(option);

  return convertToTwcssFiles(startingNode, {
    uiFramework: UiFramework.react,
    language: option.language,
    cssFramework: CssFramework.tailwindcss,
  });
}

