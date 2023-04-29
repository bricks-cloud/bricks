import { Option } from "../code";

export let optionRegistryGlobalInstance: OptionRegistry;
export const instantiateOptionRegistryGlobalInstance = (option: Option) => {
  optionRegistryGlobalInstance = new OptionRegistry(option);
};

export class OptionRegistry {
  option: Option;
  constructor(option: Option) {
    this.option = option;
  }

  getOption(): Option {
    return this.option;
  }
}