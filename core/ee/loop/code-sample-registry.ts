import { CssFramework, UiFramework } from "../../src/code/code";
import { optionRegistryGlobalInstance } from "../../src/code/option-registry/option-registry";

export let codeSampleRegistryGlobalInstance: CodeSampleRegistry;
export const instantiateCodeSampleRegistryGlobalInstance = () => {
  codeSampleRegistryGlobalInstance = new CodeSampleRegistry();
};

class CodeSampleRegistry {
  codeSamples: string[];
  cssFramework: CssFramework;
  uiFramework: UiFramework;

  constructor() {
    this.codeSamples = [];
    this.cssFramework = optionRegistryGlobalInstance.getOption().cssFramework;
    this.uiFramework = optionRegistryGlobalInstance.getOption().uiFramework;
  }

  addCodeSample(code: string) {
    this.codeSamples.push(code);
  }

  getCodeSamples(): string[] {
    return this.codeSamples;
  }

  getCssFramework(): CssFramework {
    return this.cssFramework;
  }

  getUiFramework(): UiFramework {
    return this.uiFramework;
  }
}
