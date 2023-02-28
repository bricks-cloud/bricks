# Core

This directory contains code that converts Figma nodes into `StyledBricksNode`s. `StyledBricksNode`s are meant as an input for other plugins to generate the final code.

In this directory, there is also a minimal Figma plugin for testing the core engine.

# Prerequisites

1. Node.js
2. Figma desktop app

# Development

1. Run `npm install`
2. Run `npm run dev`
3. In your Figma desktop app, import `dist/manifest.json`. You can do this by first opening any Figma file, right clicking the page, `Plugins`, `Development`, `Import plugin from manifest...`.
4. Whenever you make a change and want to test in Figma, you'll need to reload the plugin. You can do this by right clicking the page, `Plugins`, `Run last plugin`.
