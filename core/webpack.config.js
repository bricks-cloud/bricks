/**
 * Webpack config for building the minimal figma plugin for testing Bricks core
 */
const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => ({
  mode: "development",

  // This is necessary because Figma's 'eval' works differently than normal eval
  devtool: "inline-source-map",

  entry: {
    code: "./minimal-figma-plugin/code.ts", // The entry point for your plugin code
  },

  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },

  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: { extensions: [".ts"] },

  output: {
    publicPath: "",
    assetModuleFilename: "[name][ext]",
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"), // Compile into a folder called "dist"
  },

  // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
    new webpack.DefinePlugin({
      global: {}, // Fix missing symbol error when running in developer VM
    }),
    new CopyPlugin({
      patterns: [
        { from: "minimal-figma-plugin/ui.html", to: "ui.html" },
        {
          from: "minimal-figma-plugin/manifest.json",
          to: "manifest.json",
        },
      ],
    }),
  ],
});
