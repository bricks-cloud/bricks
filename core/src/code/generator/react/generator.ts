import { isEmpty } from "../../../utils";
import {
  ImportedComponentMeta,
  InFileDataMeta,
  InFileComponentMeta,
} from "../html/generator";
import { getExtensionFromFilePath } from "../util";

export class Generator {
  generateReactFileContent(
    content: string,
    componentName: string,
    isCssFileNeeded: boolean = false,
    importComponents: ImportedComponentMeta[],
    inFileData: InFileDataMeta[],
    inFileComponents: InFileComponentMeta[]
  ): string {
    let importStatements: string[] = [`import React from "react";`];

    for (const importComponent of importComponents) {
      const extension = getExtensionFromFilePath(importComponent.importPath);
      if (extension === "png" && !isEmpty(importComponent.node.getChildren())) {
        continue;
      }

      importStatements.push(
        `import ${importComponent.componentName} from ".${importComponent.importPath}"`
      );
    }

    if (isCssFileNeeded) {
      importStatements.push(`import "./style.css"`);
    }

    let inFileComponentsCode: string = "";
    inFileComponents.forEach((inFileComponent: InFileComponentMeta) => {
      inFileComponentsCode += inFileComponent.componentCode + "\n\n";
    });

    let inFileDataCode: string = "";
    inFileData.forEach((inFileData: InFileDataMeta) => {
      inFileComponentsCode += inFileData.dataCode + "\n\n";
    });

    const mainComponent = `const ${componentName} = () => (${content});`;

    const exportStatements = [`export default ${componentName};`];

    return (
      importStatements.join("\n") +
      "\n\n" +
      inFileDataCode.trim() +
      "\n\n" +
      inFileComponentsCode.trim() +
      "\n\n" +
      mainComponent +
      "\n\n" +
      exportStatements.join("\n")
    );
  }
}
