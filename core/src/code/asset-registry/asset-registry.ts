import { Node } from "../../bricks/node";

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
}
