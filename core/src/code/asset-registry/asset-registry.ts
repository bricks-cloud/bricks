import { Node } from "../../bricks/node";

export let assetRegistryGlobalInstance: AssetRegistry;
export const instantiateAssetRegistryGlobalInstance = () => {
  assetRegistryGlobalInstance = new AssetRegistry();
};

export enum AssetType {
  local = "local",
  web = "web",
}

export type Asset = {
  type: AssetType;
  src: string;
  content?: string;
  node: Node;
};


export type AssetMap = {
  [id: string]: Asset,
};

export class AssetRegistry {
  private assets: AssetMap;

  constructor() {
    this.assets = {};
  }

  registerLocalAsset(node: Node, src: string, content: string) {
    this.assets[node.getId()] = {
      type: AssetType.local,
      src,
      content,
      node,
    };
  }

  registerWebAsset(node: Node, src: string) {
    this.assets[node.getId()] = {
      type: AssetType.web,
      src,
      node,
    };
  }

  getAssetById(nodeId: string) {
    return this.assets[nodeId];
  }

  getAllAssets(): AssetMap {
    return this.assets;
  }
}
