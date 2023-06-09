import { Node } from "../../bricks/node";
import { File } from "../code";

export let assetRegistryGlobalInstance: AssetRegistry;
export const instantiateAssetRegistryGlobalInstance = () => {
  assetRegistryGlobalInstance = new AssetRegistry();
};

type Asset =
  | {
      type: "local";
      src: string;
      content: string;
      node: Node;
    }
  | {
      type: "web";
      src: string;
      node: Node;
    };

export class AssetRegistry {
  private assets: {
    [id: string]: Asset;
  };

  constructor() {
    this.assets = {};
  }

  registerLocalAsset(node: Node, src: string, content: string) {
    const identicalAsset = Object.values(this.assets).find(
      (asset) => asset.type === "local" && asset.content === content
    );

    if (identicalAsset) {
      this.assets[node.getId()] = {
        type: "local",
        src: identicalAsset.src,
        content,
        node,
      };
      return;
    }

    this.assets[node.getId()] = {
      type: "local",
      src,
      content,
      node,
    };
  }

  registerWebAsset(node: Node, src: string) {
    this.assets[node.getId()] = {
      type: "web",
      src,
      node,
    };
  }

  getAssetById(nodeId: string) {
    return this.assets[nodeId];
  }

  getAllAssets() {
    return this.assets;
  }

  generateAssetFiles() {
    const assetFiles: File[] = [];

    Object.values(this.assets).forEach((asset) => {
      if (asset.type === "local") {
        assetFiles.push({
          content: asset.content,
          path: asset.src,
        });
      }
    });

    return removeFilesWithDuplicatePaths(assetFiles);
  }
}

// util
function removeFilesWithDuplicatePaths(files: File[]): File[] {
  const keyValueSet = new Set();
  return files.filter((file) => {
    const path = file.path;
    if (keyValueSet.has(path)) {
      return false;
    }
    keyValueSet.add(path);
    return true;
  });
}
