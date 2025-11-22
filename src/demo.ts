import * as monaco from "monaco-editor";
import "monaco-editor/min/vs/editor/editor.main.css";

import { initVimMode, VimAdapterInstance } from "./index";

const text = `var StringStream = function (string, tabSize) {
  this.pos = this.start = 0;
  this.string = string;
  this.tabSize = tabSize || 8;
  this.lastColumnPos = this.lastColumnValue = 0;
  this.lineStart = 0;
};

StringStream.prototype = {
  eol: function () {
    return this.pos >= this.string.length;
  },
  sol: function () {
    return this.pos == this.lineStart;
  },
  peek: function () {
    return this.string.charAt(this.pos) || undefined;
  },
  next: function () {
    if (this.pos < this.string.length) return this.string.charAt(this.pos++);
  },
  eat: function (match) {
    var ch = this.string.charAt(this.pos);
    if (typeof match == "string") var ok = ch == match;
    else var ok = ch && (match.test ? match.test(ch) : match(ch));
    if (ok) {
      ++this.pos;
      return ch;
    }
  },
  eatWhile: function (match) {
    var start = this.pos;
    while (this.eat(match)) {}
    return this.pos > start;
  },
  eatSpace: function () {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
    return this.pos > start;
  },
  skipToEnd: function () {
    this.pos = this.string.length;
  },
  skipTo: function (ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {
      this.pos = found;
      return true;
    }
  },
  backUp: function (n) {
    this.pos -= n;
  },
  column: function () {
    throw "not implemented";
  },
  indentation: function () {
    throw "not implemented";
  },
  match: function (pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function (str) {
        return caseInsensitive ? str.toLowerCase() : str;
      };
      var substr = this.string.substr(this.pos, pattern.length);
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) this.pos += pattern.length;
        return true;
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && match.index > 0) return null;
      if (match && consume !== false) this.pos += match[0].length;
      return match;
    }
  },
  current: function () {
    return this.string.slice(this.start, this.pos);
  },
  hideFirstChars: function (n, inner) {
    this.lineStart += n;
    try {
      return inner();
    } finally {
      this.lineStart -= n;
    }
  },
};`;

type DemoEditorRefs = {
  editor: monaco.editor.IStandaloneCodeEditor;
  vimMode: VimAdapterInstance;
};

function createDemoEditor(editorId: string, statusId: string): DemoEditorRefs {
  const editorNode = document.getElementById(editorId);
  const statusNode = document.getElementById(statusId);

  if (!editorNode || !statusNode) {
    throw new Error(`Missing demo nodes for ${editorId}/${statusId}`);
  }

  const editor = monaco.editor.create(editorNode, {
    value: text,
    minimap: {
      enabled: false,
    },
    theme: "vs",
    language: "javascript",
    fontSize: 15,
    scrollBeyondLastLine: false,
  });
  editor.focus();
  const vimMode = initVimMode(editor, statusNode);

  return { editor, vimMode };
}

const primary = createDemoEditor("editor1", "status1");
const secondary = createDemoEditor("editor2", "status2");

declare global {
  interface Window {
    editor: monaco.editor.IStandaloneCodeEditor;
    vimMode: VimAdapterInstance;
    editor2: monaco.editor.IStandaloneCodeEditor;
    vimMode2: VimAdapterInstance;
  }
}

window.editor = primary.editor;
window.vimMode = primary.vimMode;
window.editor2 = secondary.editor;
window.vimMode2 = secondary.vimMode;
