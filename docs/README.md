# Frequently Asked Questions

- [Frequently Asked Questions](#frequently-asked-questions)
  - ["Generate Code" button is greyed out](#generate-code-button-is-greyed-out)
  - [I closed the webview window in VSCode extension. How can I reopen it?](#i-closed-the-webview-window-in-vscode-extension-how-can-i-reopen-it)
  - [Preview within VSCode extension or localhost:4000 is not working](#preview-within-vscode-extension-or-localhost4000-is-not-working)
  - [Figma plugin is stuck on the loading screen](#figma-plugin-is-stuck-on-the-loading-screen)
  - [Generated components are very different from the design](#generated-components-are-very-different-from-the-design)
  - [Browser live preview is loading forever](#browser-live-preview-is-loading-forever)

## "Generate Code" button is greyed out

- Install the [VSCode extension](https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode)
- Activate the extension as shown down below
<p align="center">
<img src="../assets/vscode-extension-activation.gif" width="500" />
</p>

## I closed the webview window in VSCode extension. How can I reopen it?

- You would have to regenerate the component. We are adding a new feature that would allow developers to reopen the webview pannel.

## Preview within VSCode extension or localhost:4000 is not working

- Install the latest version of [Node.js](https://nodejs.org/en)
- After installation, open up the VSCode command `shift + command + p`
- Find the command `Developer: Reload Window` to restart the VSCode extension
- Reactivate the VSCode extension and start generating code to see whehter the preview works as expected
<p align="center">
<img src="../assets/vscode-extension-reload-window.gif" width="500" />
</p>

## Figma plugin is stuck on the loading screen

- You can close it then reopen it. If you are on mac, try `option + command + p` to reopen the plugin

## Generated components are very different from the design

- Let us know the use case through [Discord](https://discord.gg/NM6aeBeqCD) or [Github issues](https://github.com/bricks-cloud/bricks/issues). We will fix the problem asap.

## Browser live preview is loading forever

- This is likely because you have too many live previews open. Try closing live previews that you're not using anymore. This limitation is due to the fact that live previews run locally in your browser. In the future we will support a hosted solution that will allow you to run as many live previews as you want.
