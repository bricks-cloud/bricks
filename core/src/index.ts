import { convertFigmaNodesToBricksNodes } from "./design/adapter/figma/adapter";
import { generateCodingFiles } from "./code/generator/generator";
import { Option, File } from "./code/code";
import { groupNodes } from "./bricks/grouping";
import { addAdditionalCssAttributesToNodes } from "./bricks/additional-css";
import { Node, GroupNode, computePositionalRelationship, PostionalRelationship, NodeType } from "./bricks/node";
import { registerRepeatedComponents } from "./code/loop/loop";
import { Attributes } from "./design/adapter/node";
import { isEmpty } from "./utils";
import { InstantiateOptionRegistryGlobalInstance } from "./code/option-registry/option-registry";
import { InstantiatePromptRegistryGlobalInstance, NameMap, promptRegistryGlobalInstance } from "./code/prompt-registry.ts/prompt-registry";

export const convertToCode = async (
  figmaNodes: readonly SceneNode[],
  option: Option
): Promise<File[]> => {
  InstantiateOptionRegistryGlobalInstance(option);
  InstantiatePromptRegistryGlobalInstance();

  const { nodes: converted } = convertFigmaNodesToBricksNodes(figmaNodes);
  if (converted.length < 1) {
    return [];
  }

  let startingNode: Node =
    converted.length > 1 ? new GroupNode(converted) : converted[0];

  groupNodes(startingNode);

  // this is not a great fix
  // setStartingNodeWidth(startingNode);

  startingNode = pruneNode(startingNode);

  removeCompletelyOverlappingNodes(startingNode, null);
  addAdditionalCssAttributesToNodes(startingNode);

  registerRepeatedComponents(startingNode);

  const files: File[] = await generateCodingFiles(startingNode, option);

  const nameMap: NameMap = await promptRegistryGlobalInstance.getNameMap();

  console.log("nameMap: ", nameMap);


  for (const file of files) {
    if (file.path === "/GeneratedComponent.jsx") {
      let content: string = file.content;
      Object.entries(nameMap).forEach(([oldName, newName]) => {
        content = content.replaceAll(new RegExp("\\b" + oldName + "\\b", "g"), newName);
      });

      file.content = content;
    }
  }

  return files;
};

// const setStartingNodeWidth = (node: Node) => {
//   const boundingBox = node.getAbsBoundingBox();
//   node.addCssAttributes({
//     "width": `${boundingBox.rightBot.x - boundingBox.leftTop.x}px`,
//     "height": `${boundingBox.rightBot.y - boundingBox.leftTop.y}px`,
//   });
// };

const pruneNode = (node: Node): Node => {
  const children: Node[] = node.getChildren();
  if (children.length === 1) {
    const child = children[0];
    if (child.getType() !== NodeType.VISIBLE && child.getType() !== NodeType.GROUP) {
      return node;
    }

    if (computePositionalRelationship(node.getAbsBoundingBox(), child.getAbsBoundingBox()) === PostionalRelationship.COMPLETE_OVERLAP) {
      const cssAttributes: Attributes = {
        ...node.getCssAttributes(),
        ...child.getCssAttributes(),
      };

      child.setCssAttributes(cssAttributes);

      return pruneNode(child);
    }
  }

  return node;
};


const removeCompletelyOverlappingNodes = (node: Node, parentNode: Node) => {
  if (isEmpty(node)) {
    return;
  }


  let children: Node[] = node.getChildren();
  if (children.length === 0) {
    return;
  }

  if (children.length > 1) {
    for (const child of children) {
      removeCompletelyOverlappingNodes(child, node);
    }

    return;
  }

  const child: Node = children[0];
  const pruned: Node = pruneNode(node);
  if (pruned.getId() === node.getId()) {
    removeCompletelyOverlappingNodes(child, pruned);
    return;
  }

  if (isEmpty(parentNode)) {
    return;
  }

  const parentChildren = parentNode.getChildren();
  let nodeToReplace: number = 0;
  for (let i = 0; i < parentChildren.length; i++) {
    if (parentChildren[i].getId() === node.getId()) {
      nodeToReplace = i;
    }
  }

  parentChildren[nodeToReplace] = pruned;
  parentNode.setChildren(parentChildren);
  removeCompletelyOverlappingNodes(pruned, parentNode);
};
