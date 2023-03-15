import { generateBricksNode } from "./grouping";
import { generateStyledBricksNode } from "./StyledBricksNode";
import { convertFigmaNodesToBricksNodes } from "./adapter/figma/adapter";
import { groupNodes } from "./bricks/util";

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
