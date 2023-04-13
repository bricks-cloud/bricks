<p align="center">
<img src="./assets/bricks-logo.png" width="150" />
</p>

# **Bricks: Design to Code For Developers**

Bricks is an open source tool for converting Figma designs into high-quality frontend code.

<p align="center">
   <a href='http://makeapullrequest.com'><img alt='PRs Welcome' src='https://img.shields.io/badge/PRs-welcome-43AF11.svg?style=shields'/></a>
   <a href="https://github.com/bricks-cloud/bricks/stargazers"><img src="https://img.shields.io/github/stars/bricks-cloud/bricks?color=e4b442" alt="Github Stars"></a>
   <a href="https://join.slack.com/t/brickscommunity/shared_invite/zt-1pb2hy3h2-9rDYWMZdHKxHblzUG0CpTQ"><img src="https://img.shields.io/badge/slack-bricks-blue?logo=slack&labelColor=2EB67D" alt="Join Bricks on Slack"></a>
   <a href="https://github.com/bricks-cloud/bricks/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache-red" alt="License"></a>
   <a href="https://github.com/bricks-cloud/bricks/commits/main"><img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/bricks-cloud/bricks?color=8b55e3"/></a>
</p>


Check out our [demo video](https://www.loom.com/share/677ef1bc5f2144f6be4d27f4bba3cef3)!

## Getting Started
### Development Version

#### **VSCode extension**:
1. Make sure that you have installed [Node.js](https://nodejs.org/en/) and [Yarn 1](https://classic.yarnpkg.com/en/docs/install). 
2. Clone our [VSCode extension](https://github.com/bricks-cloud/d2c-vscode). 
3. Run `yarn install` in the repository's root directory. 
4. Click on "Run" and select "Start Debugging" to start the VSCode extension in development mode.
5. Click on "Activate Bricks" in VSCode's status bar in the right corner.
6. Proceed to start the Figma plugin.

<p align="center">
<img src="./assets/vscode-extension-activation.gif" width="500" />
</p>

#### **Figma plugin**:
1. Install [Node.js](https://nodejs.org/en/) and [Yarn 1](https://classic.yarnpkg.com/en/docs/install). 
2. Run `yarn install` in the repository's root directory. 
3. Right Click in Figma -> "Plugins" -> "Development" -> "Manage plugins in development"
4. Click on "+" -> import plugin from manifest -> Select bricks/figma/dist/manifest.json file to import the plugin
5. Click on "Run" and select "In-development version" to start the Figma plugin in development mode.
6. After activating Bricks' VSCode extension, start selecting components and click on "Generate" button to start generating code.

### Production Version
1. Install [Node.js](https://nodejs.org/en/). 
2. Install both the [VSCode extension](https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode) and the [Figma plugin](https://www.figma.com/community/plugin/1178847414663679049/Bricks---Copilot-for-UI-Engineering).
3. Click on "Activate Bricks" in VSCode's status bar in the right corner to activate the extension.
4. In Figma, select components to convert to code.
5. Click “Generate”.
6. Done! The generated code shows up in VS Code, along with a live preview.
7. You can tinker with the generated code, and see changes instantly in the preview
8. When you’re happy with the code, just drop it into your codebase 👏

## Project Structure
Bricks is composed of a number of components. Below is a description of each component:

- `figma`: the Figma plugin for Bricks.
- `vscode`: the VS Code extension for Bricks.
- `core`: engine that converts Figma nodes into coding files.

## License
Distributed under the Apache 2.0 License. See `LICENSE` for more information.

## Get in Touch
Email: spike@bricks-tech.com

<a href="https://join.slack.com/t/brickscommunity/shared_invite/zt-1pb2hy3h2-9rDYWMZdHKxHblzUG0CpTQ"><img src="https://img.shields.io/badge/slack-bricks-blue?logo=slack&labelColor=2EB67D" alt="Join Bricks on Slack"></a>