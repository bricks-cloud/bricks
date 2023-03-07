import * as vscode from "vscode";
import fs from "fs";
import path from "path";

export function writeEntryFile(extensionFsPath: string, mainFilePath: string) {
  const parts = mainFilePath?.split('.');
  const fileExtension = Array.isArray(parts) ? parts[parts.length - 1] : "";

  switch (fileExtension) {
    case "tsx":
    case "jsx":
      writeEntryFileForReact(extensionFsPath, mainFilePath);
      break;
    case "html":
      writeEntryFileForHtml(extensionFsPath, mainFilePath);
      break;
    default:
      vscode.window.showInformationMessage(
        "Cannot preview file. Only jsx, tsx, and html files are supported."
      );
      return;
  }
}

const entryFileTemplate = (componentName: string, activeDocumentPath: string, format: string) => {
  const htmlComponent = `<div dangerouslySetInnerHTML={{ __html: ${componentName} }}></div>`;
  const reactComponent = `<${componentName} />`;

  const splitedPath = activeDocumentPath.split("/");
  splitedPath[splitedPath.length - 1] = "style.css";
  const cssFilePath = splitedPath.join("/");

  let importCSSFile = false;

  try {
    if (fs.existsSync(cssFilePath) && format === "html") {
      importCSSFile = true;
    }
  } catch (err) { }

  const cssImportStatement = `import "${splitedPath.join("/")}";`;

  return `import React, { useState } from "react";
  import { createRoot } from "react-dom/client";
  import ${componentName} from "${activeDocumentPath}";
  ${importCSSFile ? cssImportStatement : ""}
  
  const App = () => {
    const [checked, setChecked] = useState(true);
  
    const handleToggle = (e) => {
      setChecked(!e.target.checked)
      if (checked) {
        document.body.style.backgroundColor = "white"
      } else {
        document.body.style.backgroundColor = "black"
      }
    };
  
    return (
      <div>
        ${format === "html" ? htmlComponent : reactComponent}
        <div className="toggle">
          <input onChange={handleToggle} type="checkbox" id="switch" /><label for="switch">Toggle</label>
        </div>
      </div>
    );
  }
  
  const root = createRoot(document.getElementById("root"));
  
  root.render(<App />);
  `;
};

function writeEntryFileForReact(extensionPath: string, activeDocumentPath: string) {
  if (activeDocumentPath.startsWith("/c:")) {
    // windows file path
    activeDocumentPath = activeDocumentPath.slice(1).replace(/\//g, "\\\\");
  }

  const activeFileName = path.basename(activeDocumentPath);
  const componentName = activeFileName.split(".")[0];

  fs.writeFileSync(path.resolve(extensionPath, "preview", "index.js"), entryFileTemplate(componentName, activeDocumentPath, "react"));
}

function writeEntryFileForHtml(extensionPath: string, activeDocumentPath: string) {
  if (activeDocumentPath.startsWith("/c:")) {
    // windows file path
    activeDocumentPath = activeDocumentPath.slice(1).replace(/\//g, "\\\\");
  }

  fs.writeFileSync(path.resolve(extensionPath, "preview", "index.js"), entryFileTemplate("htmlstring", activeDocumentPath, "html"));
}
