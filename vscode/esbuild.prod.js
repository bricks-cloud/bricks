const { build } = require("esbuild");

build({
  entryPoints: ["./src/extension.ts"],
  minify: true,
  bundle: true,
  outdir: "./out",
  external: ["vscode", "esbuild-wasm", "tailwindcss"],
  platform: "node",
}).catch((err) => {
  process.stderr.write(err.stderr);
  process.exit(1);
});
