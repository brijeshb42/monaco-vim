import type * as MonacoEditor from "monaco-editor";

export interface VimModeChangeEvent {
  mode: string;
  subMode?: string;
}

type Sanitizer = ((node: Node) => Node) | null;

interface StatusBarInputOptions {
  selectValueOnOpen?: boolean;
  value?: string;
  onKeyUp?: (event: KeyboardEvent, value: string, close: () => void) => void;
  onKeyDown?: (
    event: KeyboardEvent,
    value: string,
    close: () => void,
  ) => boolean | void;
  onKeyInput?: (event: InputEvent, value: string, close: () => void) => void;
  onBlur?: (event: FocusEvent, close: () => void) => void;
  closeOnBlur?: boolean;
  closeOnEnter?: boolean;
}

interface StatusBarInput {
  callback?: (value: string) => void;
  options?: StatusBarInputOptions;
  node: HTMLInputElement;
}

export default class VimStatusBar {
  private readonly node: HTMLElement;
  private readonly modeInfoNode: HTMLSpanElement;
  private readonly secInfoNode: HTMLSpanElement;
  private readonly notifNode: HTMLSpanElement;
  private readonly keyInfoNode: HTMLSpanElement;
  private readonly editor: MonacoEditor.editor.IStandaloneCodeEditor | null;
  private readonly sanitizer: Sanitizer;
  private input: StatusBarInput | null = null;
  private notifTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    node: HTMLElement,
    editor: MonacoEditor.editor.IStandaloneCodeEditor | null,
    sanitizer: Sanitizer = null,
  ) {
    this.node = node;
    this.modeInfoNode = document.createElement("span");
    this.secInfoNode = document.createElement("span");
    this.notifNode = document.createElement("span");
    this.notifNode.className = "vim-notification";
    this.keyInfoNode = document.createElement("span");
    this.keyInfoNode.setAttribute("style", "float: right");
    this.node.appendChild(this.modeInfoNode);
    this.node.appendChild(this.secInfoNode);
    this.node.appendChild(this.notifNode);
    this.node.appendChild(this.keyInfoNode);
    this.toggleVisibility(false);
    this.editor = editor;
    this.sanitizer = sanitizer;
  }

  setMode(ev: VimModeChangeEvent) {
    if (ev.mode === "visual") {
      if (ev.subMode === "linewise") {
        this.setText("--VISUAL LINE--");
      } else if (ev.subMode === "blockwise") {
        this.setText("--VISUAL BLOCK--");
      } else {
        this.setText("--VISUAL--");
      }
      return;
    }

    this.setText(`--${ev.mode.toUpperCase()}--`);
  }

  setKeyBuffer(key: string) {
    this.keyInfoNode.textContent = key;
  }

  setSec(
    text: Node | string | null | undefined,
    callback?: (value: string) => void,
    options?: StatusBarInputOptions,
  ) {
    this.notifNode.textContent = "";
    if (text === undefined) {
      return this.closeInput;
    }

    this.setInnerHtml_(this.secInfoNode, text);
    const input = this.secInfoNode.querySelector("input");

    if (input) {
      input.focus();
      this.input = {
        callback,
        options,
        node: input,
      };

      if (options) {
        if (options.selectValueOnOpen) {
          input.select();
        }

        if (options.value) {
          input.value = options.value;
        }
      }

      this.addInputListeners();
    }

    return this.closeInput;
  }

  setText(text: string) {
    this.modeInfoNode.textContent = text;
  }

  toggleVisibility(toggle: boolean) {
    if (toggle) {
      this.node.style.display = "block";
    } else {
      this.node.style.display = "none";
    }

    if (this.input) {
      this.removeInputListeners();
    }

    if (this.notifTimeout) {
      clearTimeout(this.notifTimeout);
    }
  }

  closeInput = () => {
    this.removeInputListeners();
    this.input = null;
    this.setSec("");

    if (this.editor) {
      this.editor.focus();
    }
  };

  clear = () => {
    this.setInnerHtml_(this.node, "");
  };

  inputKeyUp = (e: KeyboardEvent) => {
    if (!this.input) {
      return;
    }
    const { options } = this.input;
    if (options && options.onKeyUp) {
      options.onKeyUp(
        e,
        (e.target as HTMLInputElement).value,
        this.closeInput,
      );
    }
  };

  inputKeyInput = (e: InputEvent) => {
    if (!this.input) {
      return;
    }
    const { options } = this.input;
    if (options && options.onKeyInput) {
      options.onKeyInput(e, (e.target as HTMLInputElement).value, this.closeInput);
    }
  };

  inputBlur = (event: FocusEvent) => {
    if (!this.input) {
      return;
    }
    const { options } = this.input;

    if (options?.onBlur) {
      options.onBlur(event, this.closeInput);
    }

    if (options?.closeOnBlur) {
      this.closeInput();
    }
  };

  inputKeyDown = (e: KeyboardEvent) => {
    if (!this.input) {
      return;
    }
    const { options, callback } = this.input;

    if (
      options &&
      options.onKeyDown &&
      options.onKeyDown(e, (e.target as HTMLInputElement).value, this.closeInput)
    ) {
      return;
    }

    if (
      e.keyCode === 27 ||
      (options && options.closeOnEnter !== false && e.keyCode == 13)
    ) {
      this.input.node.blur();
      e.stopPropagation();
      this.closeInput();
    }

    if (e.keyCode === 13 && callback) {
      e.stopPropagation();
      e.preventDefault();
      callback((e.target as HTMLInputElement).value);
    }
  };

  addInputListeners() {
    if (!this.input) {
      return;
    }
    const { node } = this.input;
    node.addEventListener("keyup", this.inputKeyUp);
    node.addEventListener("keydown", this.inputKeyDown);
    node.addEventListener("input", this.inputKeyInput);
    node.addEventListener("blur", this.inputBlur);
  }

  removeInputListeners() {
    if (!this.input || !this.input.node) {
      return;
    }

    const { node } = this.input;
    node.removeEventListener("keyup", this.inputKeyUp);
    node.removeEventListener("keydown", this.inputKeyDown);
    node.removeEventListener("input", this.inputKeyInput);
    node.removeEventListener("blur", this.inputBlur);
  }

  showNotification(text: string | Node) {
    const sp = document.createElement("span");
    this.setInnerHtml_(sp, text);
    this.notifNode.textContent = sp.textContent;
    this.notifTimeout = setTimeout(() => {
      this.notifNode.textContent = "";
    }, 5000);
  }

  setInnerHtml_(element: HTMLElement, htmlContents?: Node | string | null) {
    // Clear out previous contents first.
    while (element.childNodes.length) {
      element.removeChild(element.childNodes[0]);
    }
    if (!htmlContents) {
      return;
    }
    if (typeof htmlContents === "string") {
      element.appendChild(document.createTextNode(htmlContents));
      return;
    }
    const node = this.sanitizer ? this.sanitizer(htmlContents) : htmlContents;
    element.appendChild(node);
  }
}
