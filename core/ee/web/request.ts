import { isEmpty } from "../../src/utils";
import { NameMap } from "../../src/code/code";
import { codeSampleRegistryGlobalInstance } from "../loop/code-sample-registry";
import { ML_BACKEND_API_ENDPOINT } from "../../../env";

export const getNameMap = async (): Promise<NameMap> => {
  if (isEmpty(codeSampleRegistryGlobalInstance) || isEmpty(codeSampleRegistryGlobalInstance.getCodeSamples())) {
    return {};
  }

  try {
    const response: any = await fetch(ML_BACKEND_API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        codeSamples: codeSampleRegistryGlobalInstance.getCodeSamples(),
        uiFramework: codeSampleRegistryGlobalInstance.getUiFramework() as string,
        cssFramework: codeSampleRegistryGlobalInstance.getCssFramework() as string,
      }),
    });

    const text: string = await response.text();
    const parsedArr: string[] = JSON.parse(text);

    if (isEmpty(parsedArr)) {
      return {};
    }

    const parsedNameMapArr: NameMap[] = [];
    for (const nameMapStr of parsedArr) {
      parsedNameMapArr.push(JSON.parse(nameMapStr));
    }

    const consolidatedNameMap: NameMap = {};
    parsedNameMapArr.forEach((nameMap: NameMap) => {
      Object.entries((nameMap)).forEach(([oldName, newName]) => {
        consolidatedNameMap[oldName] = newName;
      });
    });

    dedupNames(consolidatedNameMap);
    return consolidatedNameMap;

  } catch (error) {
    console.log("error: ", error);
  }

  return {};
};

const dedupNames = (nameMap: NameMap) => {
  const duplicatedNames: Set<string> = new Set<string>();
  let counter: number = 1;

  Object.entries(nameMap).forEach(([oldName, newName]) => {
    if (duplicatedNames.has(newName)) {
      let dedupedName: string = newName + counter;
      nameMap[oldName] = dedupedName;
      counter++;
      duplicatedNames.add(dedupedName);
      return;
    }
    duplicatedNames.add(newName);
  });
};