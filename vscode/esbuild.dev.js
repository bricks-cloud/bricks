const { context } = require("esbuild");

const LoggingPlugin = {
  name: "logging",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });

    build.onEnd((result) => {
      const warnings = result.warnings;
      if (warnings.length > 0) {
        warnings.forEach((warning) =>
          console.warn(
            `> ${warning.location.file}:${warning.location.line}:${warning.location.column}: warning: ${warning.text}`
          )
        );
      }

      const errors = result.errors;
      if (errors.length > 0) {
        errors.forEach((error) =>
          console.error(
            `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
          )
        );
      }

      console.log("[watch] build finished");
    });
  },
};

context({
  entryPoints: ["./src/extension.ts"],
  minify: false,
  bundle: true,
  outdir: "./out",
  external: ["vscode", "esbuild-wasm", "tailwindcss"],
  platform: "node",
  plugins: [LoggingPlugin],
})
  .then((ctx) => ctx.watch())
  .catch((err) => {
    process.stderr.write(err.stderr);
    process.exit(1);
  });
