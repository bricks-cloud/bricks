import { isEmpty } from "../../src/utils";
import { NameMap } from "../../src/code/code";
import { codeSampleRegistryGlobalInstance } from "../loop/code-sample-registry";

export const predictImage = async (idImageMap: Record<string, string>) => {
  const response = await fetch(
    process.env.ML_BACKEND_API_ENDPOINT + "/predict/image",
    // "http://localhost:8080/predict/image",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: allow users to pass in their own API key
        "X-API-KEY": process.env.ML_BACKEND_API_KEY,
      },
      body: JSON.stringify(idImageMap),
    }
  );

  return response.json() as Promise<Record<string, string>>;
};

export const predictText = async (idTextMap: Record<string, string>) => {
  const response = await fetch(
    process.env.ML_BACKEND_API_ENDPOINT + "/predict/text",
    // "http://localhost:8080/predict/text",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: allow users to pass in their own API key
        "X-API-KEY": process.env.ML_BACKEND_API_KEY,
      },
      body: JSON.stringify(idTextMap),
    }
  );

  return response.json() as Promise<Record<string, string>>;
};

export const getNameMap = async (): Promise<NameMap> => {
  if (
    isEmpty(codeSampleRegistryGlobalInstance) ||
    isEmpty(codeSampleRegistryGlobalInstance.getCodeSamples())
  ) {
    return {};
  }

  try {
    const response: any = await fetch(
      process.env.ML_BACKEND_API_ENDPOINT + "/generate/name",
      // "http://localhost:8080/generate/name",
      {
        method: "POST",
        body: JSON.stringify({
          codeSamples: codeSampleRegistryGlobalInstance.getCodeSamples(),
          uiFramework:
            codeSampleRegistryGlobalInstance.getUiFramework() as string,
          cssFramework:
            codeSampleRegistryGlobalInstance.getCssFramework() as string,
          userId: figma.currentUser.id,
          username: figma.currentUser.name,
        }),
      }
    );

    const text: string = await response.text();
    const parsedArr: NameMap[] = JSON.parse(text);

    if (isEmpty(parsedArr)) {
      return {};
    }

    const parsedNameMapArr: NameMap[] = [];
    for (const nameMapStr of parsedArr) {
      parsedNameMapArr.push(nameMapStr);
    }

    const consolidatedNameMap: NameMap =
      getConsolidateNameMap(parsedNameMapArr);
    dedupNames(consolidatedNameMap);
    return consolidatedNameMap;
  } catch (error) {
    console.log("error: ", error);
  }

  return {};
};

const dedupNames = (nameMap: NameMap) => {
  const globalNonDuplicates: Set<string> = new Set<string>();
  globalNonDuplicates.add("GeneratedComponent");

  let counter: number = 1;

  Object.entries(nameMap).forEach(([oldName, newName]) => {
    if (globalNonDuplicates.has(newName)) {
      let dedupedName: string = newName + counter;
      nameMap[oldName] = dedupedName;
      counter++;
      globalNonDuplicates.add(dedupedName);
      return;
    }

    if (oldName.startsWith("data") || oldName.startsWith("Component")) {
      globalNonDuplicates.add(newName);
    }

    return;
  });
};

const getConsolidateNameMap = (parsedNameMapArr: NameMap[]): NameMap => {
  const consolidatedNameMap: NameMap = {};
  parsedNameMapArr.forEach((nameMap: NameMap) => {
    const nonDuplicateDataFields: Set<string> = new Set<string>();
    const nonDuplicateProps: Set<string> = new Set<string>();
    let dataFieldCounter: number = 1;
    let propCounter: number = 1;

    Object.entries(nameMap).forEach(([oldName, newName]) => {
      if (nonDuplicateDataFields.has(newName)) {
        let dedupedName: string = newName + dataFieldCounter;
        consolidatedNameMap[oldName] = dedupedName;
        nonDuplicateDataFields.add(dedupedName);
        dataFieldCounter++;
        return;
      }

      if (nonDuplicateProps.has(newName)) {
        let dedupedName: string = newName + propCounter;
        consolidatedNameMap[oldName] = dedupedName;
        nonDuplicateProps.add(dedupedName);
        propCounter++;
        return;
      }

      consolidatedNameMap[oldName] = newName;

      if (oldName.startsWith("dataField")) {
        nonDuplicateDataFields.add(newName);
      }

      if (oldName.startsWith("prop")) {
        nonDuplicateProps.add(newName);
      }
    });
  });

  return consolidatedNameMap;
};
