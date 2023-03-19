import { generateBricksNode } from "./grouping";
import { generateStyledBricksNode } from "./StyledBricksNode";
import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { convertToTailwindCssFiles } from "./code/adapter/tailwindcss/adapter";
import { File, UiFramework, Language, CssFramework } from "./code/code";
import { groupNodes } from "./bricks/util";
import { Node, GroupNode } from "./bricks/node";

export async function parse(figmaNodes: readonly SceneNode[]) {
  const converted = convertFigmaNodesToBricksNodes(figmaNodes);
  const restructured = groupNodes(converted);
  console.log("restructured: ", restructured);

  const bricksNodes = await generateBricksNode(figmaNodes);
  const styledBricksNodes = await Promise.all(
    bricksNodes.map(generateStyledBricksNode)
  );
  return styledBricksNodes;
}


export const convertToCode = (figmaNodes: readonly SceneNode[]): File[] => {
  console.log("figmaNodes: ", figmaNodes);



  const converted = convertFigmaNodesToBricksNodes(figmaNodes);


  console.log("converted: ", converted);

  const restructured = groupNodes(converted);


  console.log("restructured: ", restructured);


  let node: Node;

  if (restructured.length > 1) {
    node = new GroupNode(restructured);
  }

  if (restructured.length === 1) {
    node = restructured[0];
  }

  console.log("node: ", node);

  return convertToTailwindCssFiles(node, {
    uiFramework: UiFramework.react,
    language: Language.javascript,
    cssFramework: CssFramework.tailwindcss,
  });
}

