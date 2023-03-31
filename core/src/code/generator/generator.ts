import { File, CssFramework, Option } from "../code";
import { Node } from "../../bricks/node";
import { Generator as CssGenerator } from "./css/generator";
import { Generator as TwcssGenerator } from "./tailwindcss/generator";

export const generateCodingFiles = async (node: Node, option: Option): Promise<File[]> => {
  switch (option.cssFramework) {
    case CssFramework.css:
      const cssGenerator = new CssGenerator();
      return cssGenerator.generateFiles(node, option);
    case CssFramework.tailwindcss:
      const twcssGenerator = new TwcssGenerator();
      return await twcssGenerator.generateFiles(node, option);
    default:
      return [];
  }
};
