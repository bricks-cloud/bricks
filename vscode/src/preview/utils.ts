import * as vscode from "vscode";

export function disposeAll(disposables: vscode.Disposable[]): void {
  while (disposables.length) {
    const item = disposables.pop();
    if (item) {
      item.dispose();
    }
  }
}
