import {
  ImageNode,
  Node,
  NodeType,
  VectorNode,
  VectorGroupNode,
} from "../../bricks/node";
import { ExportFormat } from "../../design/adapter/node";
import { assetRegistryGlobalInstance } from "../asset-registry/asset-registry";
import { nameRegistryGlobalInstance } from "../name-registry/name-registry";

export async function generateAssets(node: Node) {
  const assets = await getAllAssets(node);

  // registering all assets locally
  assets.forEach((asset) => {
    assetRegistryGlobalInstance.registerLocalAsset(
      asset.node,
      `/assets/${asset.name}`,
      asset.content
    );
  });
}

type AssetNode = VectorNode | VectorGroupNode | ImageNode;

function findAllAssetNodes(root: Node) {
  let nodes: AssetNode[] = [];

  function search(node: Node) {
    const nodeType = node.getType();
    if (
      nodeType === NodeType.VECTOR ||
      nodeType === NodeType.VECTOR_GROUP ||
      nodeType === NodeType.IMAGE
    ) {
      nodes.push(node as AssetNode);
    }
    for (const child of node.getChildren()) {
      search(child);
    }
  }

  search(root);

  return nodes;
}

type Asset = { node: Node; name: string; content: string };

const getAllAssets = async (root: Node): Promise<Asset[]> => {
  const assetNodes = findAllAssetNodes(root);

  const promises = assetNodes.map(async (assetNode) => {
    try {
      const nodeType = assetNode.getType();

      switch (nodeType) {
        case NodeType.VECTOR:
        case NodeType.VECTOR_GROUP: {
          return {
            node: assetNode,
            name: `${nameRegistryGlobalInstance.getVectorName(
              assetNode.id
            )}.svg`,
            content: await assetNode.export(ExportFormat.SVG),
          };
        }
        case NodeType.IMAGE:
        default: {
          return {
            node: assetNode,
            name: `${nameRegistryGlobalInstance.getImageName(
              assetNode.id
            )}.png`,
            content: await assetNode.export(ExportFormat.PNG),
          };
        }
      }
    } catch (e) {
      console.error("Error exporting node:", assetNode, "Error:", e);
      return null;
    }
  });

  const assets = await Promise.all(promises);

  return assets.filter((asset) => asset !== null);
};
