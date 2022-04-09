import * as monaco from "monaco-editor";

import { initVimMode } from "./";

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

const editorNode = document.getElementById("editor1");
const statusNode = document.getElementById("status1");
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

const editorNode2 = document.getElementById("editor2");
const statusNode2 = document.getElementById("status2");
const editor2 = monaco.editor.create(editorNode2, {
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
const vimMode2 = initVimMode(editor2, statusNode2);

window.editor = editor;
window.vimMode = vimMode;
window.editor2 = editor;
window.vimMode2 = vimMode2;
