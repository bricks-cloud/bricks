import * as vscode from "vscode";
import { File, FileExplorer, FileSystemProvider } from "./fileExplorer";
import { Server } from "socket.io";
import * as Preview from "./preview";
import { writeEntryFile } from "./preview/writeEntryFile";
import { createServer } from "http";

/**
 * Setting up the http server
 */
const httpServer = createServer();

const io = new Server(httpServer, {
  maxHttpBufferSize: 1e8,
  cors: {
    origin: "*",
  },
});

const openTextDocument = async (fileUri: vscode.Uri) => {
  const textDocument = await vscode.workspace.openTextDocument(fileUri);

  await vscode.window.showTextDocument(textDocument, vscode.ViewColumn.One);
};

export async function activate(context: vscode.ExtensionContext) {
  const { extensionUri, storageUri, globalState, workspaceState } = context;

  if (!storageUri) {
    vscode.window.showInformationMessage(
      "Open a workspace to start using Bricks Design to Code Tool"
    );
    return;
  }

  /**
   * Initialize Bricks workspace
   */
  const treeDataProvider = new FileSystemProvider(storageUri);
  new FileExplorer(context, treeDataProvider);

  /**
   * when the http server is not listening, delete all existing files and set the correct flags
   */
  if (!httpServer.listening) {
    await treeDataProvider.delete(storageUri, { recursive: true });
    await workspaceState.update("bricksActivated", false);
  }

  /**
   * Correct set the flags when the plug in is shut down but the flags indicate otherwise
   */
  if (
    globalState.get("bricksWorkspace") === vscode.workspace.name &&
    !workspaceState.get("bricksActivated")
  ) {
    await globalState.update("bricksGloballyActivated", false);
    await globalState.update("bricksWorkspace", "");
  }

  const placeholderFilePath = "/WelcomeToBricks.md";
  const completePlaceholderFileUri = vscode.Uri.parse(
    storageUri.toString() + placeholderFilePath
  );

  /**
   * Function for creating a placeholder file in storage
   */
  const createPlaceHolderFile = (content: string) => {
    return treeDataProvider.writeFile(
      completePlaceholderFileUri,
      Buffer.from(content),
      {
        create: true,
        overwrite: true,
      }
    );
  };

  /**
   * Update the place holder file when focus changes for the current window
   */
  vscode.window.onDidChangeWindowState(async () => {
    if (!workspaceState.get("bricksActivated")) {
      if (globalState.get("bricksGloballyActivated")) {
        await createPlaceHolderFile(
          `Please use Shut Down Bricks Command to close Bricks in workspace ${globalState.get(
            "bricksWorkspace"
          )}`
        );
      } else {
        await createPlaceHolderFile(
          "Activate Bricks in the command bar to get started"
        );
      }
    }
  });

  /**
   * Create placeholder files when the plugin first started
   */
  if (!workspaceState.get("bricksActivated")) {
    if (globalState.get("bricksGloballyActivated")) {
      await createPlaceHolderFile(
        `Please use Shut Down Bricks Command to close Bricks in workspace ${globalState.get(
          "bricksWorkspace"
        )}`
      );

      vscode.window.showInformationMessage(
        `Please use Shut Down Bricks Command to close Bricks in workspace ${globalState.get(
          "bricksWorkspace"
        )}`
      );
    } else {
      await createPlaceHolderFile(
        "Activate Bricks in the command bar to get started"
      );

      vscode.window.showInformationMessage(
        "Command + Shift + P then type in Activate to start the Bricks VSCode plugin"
      );
    }
  }

  treeDataProvider.refresh();

  /**
   * Live preview
   */
  context.subscriptions.push(
    vscode.commands.registerCommand("bricksDesignToCode.preview.show", () => {
      Preview.createOrShow(context.extensionUri, storageUri);
    })
  );

  /**
   * Register the command for resetting bricks
   */
  vscode.commands.registerCommand("bricksDesignToCode.reset", async () => {
    await globalState.update("bricksGloballyActivated", false);
    await workspaceState.update("bricksActivated", false);
    await globalState.update("bricksWorkspace", "");
    deactivate();
  });

  /**
   * Register the command for activating the plugin
   */
  vscode.commands.registerCommand("bricksDesignToCode.activate", async () => {
    if (
      globalState.get("bricksGloballyActivated") &&
      !workspaceState.get("bricksActivated")
    ) {
      await createPlaceHolderFile(
        `Please use Shut Down Bricks Command to close Bricks in workspace ${globalState.get(
          "bricksWorkspace"
        )}`
      );

      openTextDocument(completePlaceholderFileUri);
      return;
    }

    if (workspaceState.get("bricksActivated")) {
      vscode.window.showInformationMessage("Bricks is already activated");

      return;
    }

    await createPlaceHolderFile(
      "Select Components Using the Figma Plugin to get started"
    );
    treeDataProvider.refresh();

    /**
     * Start the http server
     */
    const port = 32044;

    httpServer.listen({ port }, async () => {
      await workspaceState.update("bricksActivated", true);
      await globalState.update("bricksGloballyActivated", true);
      await globalState.update("bricksWorkspace", vscode.workspace.name);

      console.log(`Started websocket server on port ${port}...`);
    });

    /**
     * Initialize socket server
     */
    io.on("connection", (socket) => {
      socket.emit("pong", "pong");

      socket.on("code-generation", async (data, callback) => {
        await treeDataProvider.delete(storageUri, { recursive: true });

        const files: File[] = data.files;

        // write generated files to Bricks workspace
        await Promise.all(
          files.map(async ({ content, path }) => {
            const uri = vscode.Uri.parse(storageUri.toString() + path);

            Buffer.from(content);

            return treeDataProvider.writeFile(uri, Buffer.from(content), {
              create: true,
              overwrite: true,
            });
          })
        );

        treeDataProvider.refresh();

        // open the main file in the editor
        const mainFilePath =
          storageUri.path +
          files.find((file) => file.path.includes("GeneratedComponent"))?.path;
        openTextDocument(vscode.Uri.parse(mainFilePath));

        // write entry files for live preview
        writeEntryFile(extensionUri.path, mainFilePath);

        // show a preview of the main file
        Preview.createOrShow(context.extensionUri, storageUri);

        callback({
          status: "ok",
        });
      });
    });

    vscode.window.showInformationMessage("Bricks has been activated");
  });

  /**
   * Register the command for shutting down the plugin
   */
  vscode.commands.registerCommand("bricksDesignToCode.shutDown", async () => {
    await treeDataProvider.delete(storageUri, { recursive: true });
    await createPlaceHolderFile(
      "Activate Bricks in the command bar to get started"
    );
    treeDataProvider.refresh();

    const serverStatus = httpServer.listening;

    Preview.dispose();
    io.close();
    httpServer.close();

    if (serverStatus) {
      await globalState.update("bricksGloballyActivated", false);
      await workspaceState.update("bricksActivated", false);
    }

    vscode.window.showInformationMessage("Bricks has been shut down");
  });
}

export async function deactivate() {
  Preview.dispose();
  io.close();
  httpServer.close();
}
