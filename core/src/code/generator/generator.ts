import { File, CssFramework, Option } from "../code";
import { Node } from "../../bricks/node";
import { Generator as CssGenerator } from "./css/generator";
import { Generator as TwcssGenerator } from "./tailwindcss/generator";

export const generateCodingFiles = (node: Node, option: Option): File[] => {
  switch (option.cssFramework) {
    case CssFramework.css:
      const cssGenerator = new CssGenerator();
      return cssGenerator.generateFiles(node, option);
    case CssFramework.tailwindcss:
      const twcssGenerator = new TwcssGenerator();
      return twcssGenerator.generateFiles(node, option);
    default:
      return [];
  }
};
