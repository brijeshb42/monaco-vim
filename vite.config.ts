import { resolve } from "node:path";
import { defineConfig } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
  plugins: [
    monacoEditorPlugin({
      languageWorkers: [
        "editorWorkerService",
        "css",
        "html",
        "json",
        "typescript",
      ],
    }),
  ],
  resolve: {
    alias: [
      {
        find: "monaco-editor/min/vs/editor/editor.main.css",
        replacement: resolve(
          import.meta.dirname,
          "node_modules/monaco-editor/min/vs/editor/editor.main.css",
        ),
      },
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
  },
});

