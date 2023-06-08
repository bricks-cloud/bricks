import {
  ImageNode,
  Node,
  NodeType,
  VectorNode,
  VectorGroupNode,
} from "../../bricks/node";
import { ExportFormat } from "../../design/adapter/node";
import { assetRegistryGlobalInstance } from "../asset-registry/asset-registry";
import { CodePreviewLocation, Option } from "../code";
import { nameRegistryGlobalInstance } from "../name-registry/name-registry";

export async function generateAssets(node: Node, option: Option) {
  const assets = await getAllAssets(node);

  console.log("assets", assets);

  if (option.codePreviewLocation === CodePreviewLocation.vscode) {
    // registering all assets locally
    assets.forEach((asset) => {
      assetRegistryGlobalInstance.registerLocalAsset(
        asset.node,
        `/assets/${asset.name}`,
        asset.content
      );
    });
  }

  if (option.codePreviewLocation === CodePreviewLocation.web) {
    // registering all assets locally
    const imageAssets = assets.filter((asset) => asset.name.endsWith(".png"));
    const vectorAssets = assets.filter((asset) => asset.name.endsWith(".svg"));

    // upload binary files to server
    // const response = await fetch("https://bricks-tech.com/api/upload", {
    const response = await fetch("http://localhost:3001/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        imageAssets.reduce((acc, asset) => {
          acc[asset.name] = asset.content;
          return acc;
        }, {})
      ),
    });
    const { urls } = await response.json();

    console.log("urls", urls);

    urls?.forEach((url) => {
      const asset = assets.find((asset) => url.includes(asset.name));
      if (asset) {
        assetRegistryGlobalInstance.registerWebAsset(asset.node, url);
      }
    });

    vectorAssets.forEach((asset) => {
      assetRegistryGlobalInstance.registerLocalAsset(
        asset.node,
        `/assets/${asset.name}`,
        asset.content
      );
    });
  }
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
      return {
        node: null,
        name: "",
        content: "",
      };
    }
  });

  const assets = await Promise.all(promises);

  return assets.filter((asset) => asset.node && asset.name && asset.content);
};
