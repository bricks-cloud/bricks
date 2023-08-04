import { isEmpty } from "../../utils";

export let nameRegistryGlobalInstance: NameRegistry;
export const instantiateNameRegistryGlobalInstance = () => {
  nameRegistryGlobalInstance = new NameRegistry();
};

type IdToNameMap = {
  [id: string]: string,
};

class NameRegistry {
  idToNameMap: IdToNameMap;
  altIdToNameMap: IdToNameMap;
  numberOfSvgs: number;
  numberOfProps: number;
  numberOfDataArr: number;
  numberOfDataField: number;
  numberOfImages: number;
  numberOfComponents: number;

  constructor() {
    this.idToNameMap = {};
    this.altIdToNameMap = {};
    this.numberOfSvgs = 1;
    this.numberOfProps = 1;
    this.numberOfImages = 1;
    this.numberOfDataArr = 1;
    this.numberOfDataField = 1;
    this.numberOfComponents = 1;
  }

  setIdToName(id: string, name: string) {
    this.idToNameMap[id] = name;
  }

  getIdToNameMap(): IdToNameMap {
    return this.idToNameMap;
  }

  getAltIdToNameMap(): IdToNameMap {
    return this.altIdToNameMap;
  }

  getAltName(id: string): string {
    return this.altIdToNameMap[id];
  }

  getDataFieldName(): string {
    const name = "dataField" + this.numberOfDataField;
    this.numberOfDataField++;
    return name;
  }

  getComponentName(): string {
    const name = "Component" + this.numberOfComponents;
    this.numberOfComponents++;
    return name;
  }

  getNumberOfSvgs(): number {
    return this.numberOfSvgs;
  }

  getNumberOfImages(): number {
    return this.numberOfImages;
  }

  getDataArrName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (!isEmpty(name)) {
      return name;
    }

    name = "data" + this.numberOfDataArr;
    this.idToNameMap[id] = name;
    this.numberOfDataArr++;
    return name;
  }

  getPropName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (!isEmpty(name)) {
      return name;
    }

    name = "prop" + this.numberOfProps;
    this.idToNameMap[id] = name;
    this.numberOfProps++;
    return name;
  }

  getVectorName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (!isEmpty(name)) {
      return name;
    }

    const altName: string = "Svg Asset " + this.numberOfSvgs;
    this.altIdToNameMap[id] = altName;

    name = "SvgAsset" + this.numberOfSvgs;
    this.idToNameMap[id] = name;
    this.numberOfSvgs++;
    return name;
  }

  getImageName(id: string): string {
    let name: string = this.idToNameMap[id];
    if (name) {
      return name;
    }

    const altName: string = "Image Asset " + this.numberOfImages;
    this.altIdToNameMap[id] = altName;

    name = "ImageAsset" + this.numberOfImages;
    this.idToNameMap[id] = name;
    this.numberOfImages++;
    return name;
  }
}