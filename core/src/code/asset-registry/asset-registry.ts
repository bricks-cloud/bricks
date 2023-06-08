export let assetRegistryGlobalInstance: AssetRegistry;
export const instantiateAssetRegistryGlobalInstance = () => {
  assetRegistryGlobalInstance = new AssetRegistry();
};

type Asset =
  | {
      type: "local";
      src: string;
      content: string;
    }
  | {
      type: "web";
      src: string;
    };

export class AssetRegistry {
  private assets: {
    [id: string]: Asset;
  };

  constructor() {
    this.assets = {};
  }

  registerLocalAsset(nodeId: string, src: string, content: string) {
    this.assets[nodeId] = {
      type: "local",
      src: src,
      content: content,
    };
  }

  registerWebAsset(nodeId: string, src: string) {
    this.assets[nodeId] = {
      type: "web",
      src: src,
    };
  }

  getAssetById(nodeId: string) {
    return this.assets[nodeId];
  }

  getAllAssets() {
    return this.assets;
  }
}
