type DataFieldToPropBinding = {
  fieldName: string;
  propName: string;
};

type DataArr = {
  id: string;
  name: string;
  fieldToPropBindings: DataFieldToPropBinding[];
  data: any[];
};

type IdToDataArrayMap = {
  [id: string]: DataArr;
};

export let dataArrRegistryGlobalInstance: DataArrRegistry;

export const instantiateDataArrRegistryGlobalInstance = () => {
  dataArrRegistryGlobalInstance = new DataArrRegistry();
};

class DataArrRegistry {
  idToDataArrayMap: IdToDataArrayMap;

  constructor() {
    this.idToDataArrayMap = {};
  }

  getDataArray(id: string): DataArr {
    return this.idToDataArrayMap[id];
  }
}

export const generateProps = (
  propBindings: DataFieldToPropBinding[]
): string => {
  let props: string = "";

  for (const binding of propBindings) {
    props += ` ${binding.propName}={${binding.fieldName}}`;
  }

  return props.trim();
};
