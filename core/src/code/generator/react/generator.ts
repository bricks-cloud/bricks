export class Generator {
  generateReactFileContent(
    content: string,
    componentName: string,
    additionalImportStatements: string[] = [],
  ): string {
    const importStatements = [
      `import React from "react";`,
      ...additionalImportStatements,
    ];

    const mainComponent = `const ${componentName} = () => (${content});`;

    const exportStatements = [`export default ${componentName};`];

    return (
      importStatements.join("\n") +
      "\n\n" +
      mainComponent +
      "\n\n" +
      exportStatements.join("\n")
    );
  }
}
