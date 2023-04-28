import { isEmpty } from "../../utils";
import { optionRegistryGlobalInstance } from "../option-registry/option-registry";

export let promptRegistryGlobalInstance: PromptRegistry;
export const InstantiatePromptRegistryGlobalInstance = () => {
  promptRegistryGlobalInstance = new PromptRegistry();
};

type Prompt = {
  codeSamples: string[],
  context: string,
  question: string,
  role: string,
};

// type RequestPrompt = {
//   role: string,
//   content: string,
// };

export type NameMap = {
  [oldName: string]: string,
};

// type Request = {
//   prompts: RequestPrompt[];
//   codeSamples: string[];
//   question: string;
// };

class PromptRegistry {
  prompt: Prompt;

  constructor() {
    this.prompt = {
      codeSamples: [],
      context: `Code is written with ${optionRegistryGlobalInstance.getOption().cssFramework} in ${optionRegistryGlobalInstance.getOption().uiFramework}`,
      question: "Can you come out with more descriptive names for variables that start with datafield, dataArr, Component and prop? Some examles for these variables are datafield3, Component2 and prop2. Output a json object that only contains key value pairs of the old name mapped to the new name. Please do this for all the qualified vairables.",
      role: "Your role is a function that only returns JSON. Do not write normal text",
    };
  }

  addPrompt(code: string) {
    this.prompt.codeSamples.push(code);
  }


  async getNameMap(): Promise<NameMap> {
    try {
      const response: any = await fetch('http://127.0.0.1:5000/', {
        method: 'POST',
        body: JSON.stringify(this.prompt),
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

      console.log("parsedNameMapArr: ", parsedNameMapArr);

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
  }
}


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


// const text = `
// Sure! Here is the JSON object with updated, more descriptive names for the variables that start with `dataField`, `Component`, and `prop`:

// ```json
// {
//   "dataField1": "hasShortName",
//   "dataField2": "backgroundColor",
//   "dataField3": "name",
//   "dataField4": "width",
//   "dataField5": "textColor",
//   "Component1": "ExpertiseArea",
//   "prop2": "hasShortName",
//   "prop4": "backgroundColor",
//   "prop12": "width",
//   "prop13": "textColor",
//   "prop16": "name"
// }
// ```

// Note that the names I chose are based on my understanding of the purpose of each variable, and you may choose different names depending on your specific use case.`;