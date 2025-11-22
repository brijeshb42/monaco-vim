import type * as MonacoEditor from "monaco-editor";
import VimMode from "./cm/keymap_vim";
import StatusBar from "./statusbar";

type Sanitizer = ((node: Node) => Node) | null;
type StatusBarCtor = new (
  node: HTMLElement,
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  sanitizer?: Sanitizer,
) => StatusBar;

export type VimAdapterInstance = InstanceType<typeof VimMode>;

export function initVimMode(
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  statusbarNode: HTMLElement | null = null,
  StatusBarClass: StatusBarCtor = StatusBar,
  sanitizer: Sanitizer = null,
): VimAdapterInstance {
  const vimAdapter = new VimMode(editor);

  if (!statusbarNode) {
    vimAdapter.attach();
    return vimAdapter;
  }

  const statusBar = new StatusBarClass(statusbarNode, editor, sanitizer);
  let keyBuffer = "";

  vimAdapter.on("vim-mode-change", (mode) => {
    statusBar.setMode(mode);
  });

  vimAdapter.on("vim-keypress", (key) => {
    if (key === ":") {
      keyBuffer = "";
    } else {
      keyBuffer += key;
    }
    statusBar.setKeyBuffer(keyBuffer);
  });

  vimAdapter.on("vim-command-done", () => {
    keyBuffer = "";
    statusBar.setKeyBuffer(keyBuffer);
  });

  vimAdapter.on("dispose", function () {
    statusBar.toggleVisibility(false);
    statusBar.closeInput();
    statusBar.clear();
  });

  statusBar.toggleVisibility(true);
  vimAdapter.setStatusBar(statusBar);
  vimAdapter.attach();

  return vimAdapter;
}

export { VimMode, StatusBar };
