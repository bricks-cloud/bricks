# Bricks Core Module

This directory contains code that converts Figma nodes into `StyledBricksNode`s. `StyledBricksNode`s are meant as an input for other plugins to generate the final code.

In this directory, there is also a minimal Figma plugin for testing the core engine.

# Prerequisites

1. Node.js
2. Figma desktop app

# Development

The easiest way to test this module is the run the minimal Figma plugin in this directory.

1. Run `npm install`
2. Run `npm run dev`
3. In your Figma desktop app, import `dist/manifest.json`. You can do this by first opening any Figma file, right clicking the page, `Plugins`, `Development`, `Import plugin from manifest...`.
4. Whenever you make a change and want to test in Figma, you'll need to reload the plugin. You can do this by right clicking the page, `Plugins`, `Run last plugin`.

# Code structure

At a high level, Bricks Core converts Figma [scene nodes](https://www.figma.com/plugin-docs/api/nodes/) into `BricksNode`s, then into `StyledBricksNode`s.

`src/grouping/index.ts` is responsible for converting Figma scene nodes to `BricksNode`s. We estimate the nodes' groupings in the following order:

1. If a group of nodes has [autolayout](https://help.figma.com/hc/en-us/articles/5731482952599-Using-auto-layout) set up in Figma, we group them together.

2. If nodes overlap each other, we group them together.

3. If nodes are aligned vertically or horizontally, we group them together.

Afterwards, `src/StyledBricksNode.ts` is responsible for converting `BricksNode`s to `StyledBricksNode`s by converting different Figma properties to CSS properties. `StyledBricksNode`s are the final output of the core module.

See `code.ts` for an example of how to use the functions exported by this module:

```ts
const bricksNodes = await generateBricksTree(figma.currentPage.selection);

const styledBricksNodes = await Promise.all(
  bricksNodes.map(generateStyledBricksNode),
);
// further process nodes
```
