import { defineConfig } from "tsdown";

const shared = {
  platform: "browser" as const,
  target: "es2019",
  sourcemap: true,
  treeshake: true,
  minify: false,
  hash: false,
};

const externalModules = [
  "monaco-editor",
  "monaco-editor/esm/vs/editor/editor.api",
  "monaco-editor/esm/vs/editor/common/commands/shiftCommand",
];

export default defineConfig([
  {
    ...shared,
    entry: {
      index: "src/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    external: externalModules,
    outExtensions: ({ format }) => {
      if (format === "es") {
        return { js: ".mjs" };
      }
      if (format === "cjs") {
        return { js: ".cjs" };
      }
      return;
    },
  },
  {
    ...shared,
    entry: {
      "monaco-vim": "src/index.ts",
    },
    format: ["umd"],
    globalName: "MonacoVim",
    clean: false,
    dts: false,
    external: [
      "monaco-editor",
      "monaco-editor/esm/vs/editor/editor.api",
    ],
    noExternal: ["monaco-editor/esm/vs/editor/common/commands/shiftCommand"],
    outExtensions: () => ({ js: ".js" }),
    outputOptions: {
      globals: {
        "monaco-editor/esm/vs/editor/editor.api": "monaco",
        "monaco-editor": "monaco",
      },
    },
  },
]);

