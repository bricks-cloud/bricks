# Bricks

Bricks is an open source tool for converting Figma designs into high-quality frontend code.

## Try Bricks

### Prerequisites

Install the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=Bricks.d2c-vscode) and the [Figma plugin](https://www.figma.com/community/plugin/1178847414663679049/Bricks---Copilot-for-UI-Engineering).

### Try out Bricks!

1. In VS Code, open the command palette (Command + Shift + P) and type "Activate Bricks" to start up Bricks.
2. In Figma, select a component to convert to code
3. Click “Generate”
4. Done! The generated code shows up in VS Code, along with a live preview
5. You can tinker with the generated code, and see changes instantly in the preview
6. When you’re happy with the code, just drop it into your codebase 👏

### How to run Bricks locally

#### First time set up

1. Run `npm install` in the repository's root directory.
2. Import Bricks Figma plugin into Figma Desktop:
   - Open a design file in Figma Desktop.
   - Right click on the page, "Plugins", "Development", "Import plugin from manifest...".
   - Select the `manifest.json` file from the `dist` folder.

#### Start up Bricks in VS Code and Figma

1. Run Bricks VS Code extension locally by hitting `F5` in VS Code.
2. Run Bricks Figma plugin locally by right clicking on the page, "Plugins", "Development", "Bricks D2C".

## Project Structure

Bricks is composed of a number of components. Below is a description of each component:

- `figma`: the Figma plugin for Bricks.
- `vscode`: the VS Code extension for Bricks.
- `core`: converts Figma nodes into `StyledBricksNode`s.
- `plugins/html`: converts `StyledBricksNode`s into HTML code.
- `plugins/react`: converts `StyledBricksNode`s into React code.
- `plugins/utils/tailwindcss`: utility functions that help generate styles in Tailwind CSS.
