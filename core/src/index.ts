import { generateBricksNode } from "./grouping";
import { generateStyledBricksNode } from "./StyledBricksNode";

export async function parse(figmaNodes: readonly SceneNode[]) {
  const bricksNodes = await generateBricksNode(figmaNodes);
  const styledBricksNodes = await Promise.all(
    bricksNodes.map(generateStyledBricksNode)
  );
  return styledBricksNodes;
}
