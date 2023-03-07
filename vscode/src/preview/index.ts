import * as vscode from "vscode";
import { disposeAll } from "./utils";
import { startServer, endServer, getServerPort } from "./server";

let webviewPanel: vscode.WebviewPanel | undefined;
let currentOpenFilePath: string | undefined;
const disposables: vscode.Disposable[] = [];


export function dispose() {
  webviewPanel?.dispose();
}

export async function createOrShow(
  extensionUri: vscode.Uri,
  storageUri: vscode.Uri
) {

  if (webviewPanel) {
    webviewPanel.webview.postMessage("refresh");
    webviewPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  vscode.window.showInformationMessage("Starting preview...");

  await startServer(extensionUri.fsPath, storageUri.fsPath);

  setupWebviewPanel(extensionUri);

  currentOpenFilePath = vscode.window.activeTextEditor?.document.uri.path;
}

function setupWebviewPanel(extensionUri: vscode.Uri) {
  webviewPanel = vscode.window.createWebviewPanel(
    "localhostBrowserPreview",
    "LocalHost Preview",
    vscode.ViewColumn.Beside,
    {
      // Enable javascript in the webview
      enableScripts: true,
      // And restrict the webview to only loading content from our extension's `media` directory.
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
    }
  );

  webviewPanel.title = "LocalHost Preview";

  /**
   * Set up HTML that will live inside the webview
   */
  const stylesResetUri = webviewPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "reset.css")
  );

  const stylesMainUri = webviewPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "vscode.css")
  );

  // const stylesTWCUri = webviewPanel.webview.asWebviewUri(
  //   vscode.Uri.joinPath(extensionUri, "media", "style.css")
  // );

  // console.log(stylesTWCUri);

  webviewPanel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${stylesResetUri}" rel="stylesheet">
      <link href="${stylesMainUri}" rel="stylesheet">
      <title>React Component Preview</title>
    </head>
    <body>
      <iframe id="preview" src="http://localhost:${getServerPort()}/" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
      <script>
        window.addEventListener('message', event => {
            const message = event.data;
            if(message === "refresh") {
              document.getElementById('preview').src += '';
            }
        });
      </script>
    </body>
    </html>`;

  /**
   * Reload on save
   */
  const supportedLanguages = ["typescriptreact", "javascriptreact", "html"];
  vscode.workspace.onDidSaveTextDocument(
    (document) => {
      if (
        supportedLanguages.includes(document.languageId) &&
        document.uri.scheme === "file"
      ) {
        webviewPanel!.webview.postMessage("refresh");
      }
    },
    null,
    disposables
  );

  /**
   * Clean up when the webview panel is closed
   */
  webviewPanel.onDidDispose(
    async () => {
      console.log("Webview is disposed");
      await endServer();
      disposeAll(disposables);
      webviewPanel = undefined;
    },
    null,
    disposables
  );
}
