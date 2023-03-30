# Bricks

Bricks is an open source tool for converting Figma designs into high-quality frontend code.

![bricks](https://user-images.githubusercontent.com/19992630/228874952-a36a8385-5455-423e-babb-fc29464abe40.png)

Check out our [demo video](https://www.loom.com/share/677ef1bc5f2144f6be4d27f4bba3cef3)!

## Try Bricks

1. Install both the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode) and the [Figma plugin](https://www.figma.com/community/plugin/1178847414663679049/Bricks---Copilot-for-UI-Engineering).
2. In VS Code, open the command palette (Command + Shift + P) and type "Activate Bricks" to start up Bricks.
3. In Figma, select a component to convert to code
4. Click “Generate”
5. Done! The generated code shows up in VS Code, along with a live preview
6. You can tinker with the generated code, and see changes instantly in the preview
7. When you’re happy with the code, just drop it into your codebase 👏

### How to run Bricks locally

#### First time set up

1. Install [Node.js](https://nodejs.org/en/) and [Yarn 1](https://classic.yarnpkg.com/en/docs/install).
2. Run `yarn` in the repository's root directory.
3. Import Bricks Figma plugin into Figma Desktop:
   - Open a design file in Figma Desktop.
   - Right click on the page, "Plugins", "Development", "Import plugin from manifest...".
   - Select the `manifest.json` file from the `dist` folder.

#### Start up Bricks Figma Plugin

Run Bricks Figma plugin locally by right clicking on the page, "Plugins", "Development", "Bricks D2C".

## Project Structure

Bricks is composed of a number of components. Below is a description of each component:

- `figma`: the Figma plugin for Bricks.
- `vscode`: the VS Code extension for Bricks.
- `core`: converts Figma nodes into `StyledBricksNode`s.
- `plugins/html`: converts `StyledBricksNode`s into HTML code.
- `plugins/react`: converts `StyledBricksNode`s into React code.
- `plugins/utils/tailwindcss`: utility functions that help generate styles in Tailwind CSS.
