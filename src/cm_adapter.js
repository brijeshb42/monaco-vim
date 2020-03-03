/**
 * An adapter to make CodeMirror's vim bindings work with monaco
 */
import {
  KeyCode,
  KeyMod,
  Range,
  Position,
  Selection,
  SelectionDirection,
  editor as monacoEditor,
} from 'monaco-editor';
import { TypeOperations } from 'monaco-editor/esm/vs/editor/common/controller/cursorTypeOperations';
const VerticalRevealType = {
  Bottom: 4,
};

// for monaco 0.19.x where x < 3
const EditorOptConstants = {
  readOnly: 65,
  cursorWidth: 20,
  fontInfo: 32,
};

const { userAgent, platform } = window.navigator;
const edge = /Edge\/(\d+)/.exec(userAgent);
const ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
const mac = ios || /Mac/.test(platform);

const nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;

function isWordCharBasic(ch) {
  return /\w/.test(ch) || ch > "\x80" &&
    (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
}

function Pos(line, column) {
  if (!(this instanceof Pos)) {
    return new Pos(line, column);
  }

  this.line = line;
  this.ch = column;
}

function signal(cm, signal, args) {
  cm.dispatch(signal, args);
}

function dummy(key) {
  return function() {
    // console.log(key, 'dummy function called with', Array.prototype.slice.call(arguments));
  }
}

let doFold, noFold;

if (String.prototype.normalize) {
  doFold = function(str) { return str.normalize("NFD").toLowerCase() }
  noFold = function(str) { return str.normalize("NFD") }
} else {
  doFold = function(str) { return str.toLowerCase() }
  noFold = function(str) { return str }
}

var StringStream = function(string, tabSize) {
  this.pos = this.start = 0;
  this.string = string;
  this.tabSize = tabSize || 8;
  this.lastColumnPos = this.lastColumnValue = 0;
  this.lineStart = 0;
};

StringStream.prototype = {
  eol: function() {return this.pos >= this.string.length;},
  sol: function() {return this.pos == this.lineStart;},
  peek: function() {return this.string.charAt(this.pos) || undefined;},
  next: function() {
    if (this.pos < this.string.length)
      return this.string.charAt(this.pos++);
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos);
    if (typeof match == "string") var ok = ch == match;
    else var ok = ch && (match.test ? match.test(ch) : match(ch));
    if (ok) {++this.pos; return ch;}
  },
  eatWhile: function(match) {
    var start = this.pos;
    while (this.eat(match)){}
    return this.pos > start;
  },
  eatSpace: function() {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
    return this.pos > start;
  },
  skipToEnd: function() {this.pos = this.string.length;},
  skipTo: function(ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {this.pos = found; return true;}
  },
  backUp: function(n) {this.pos -= n;},
  column: function() {
    throw "not implemented";
  },
  indentation: function() {
    throw "not implemented";
  },
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
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
  current: function(){return this.string.slice(this.start, this.pos);},
  hideFirstChars: function(n, inner) {
    this.lineStart += n;
    try { return inner(); }
    finally { this.lineStart -= n; }
  }
};

function toCmPos(pos) {
  return new Pos(pos.lineNumber - 1, pos.column - 1);
}

function toMonacoPos(pos) {
  return new Position(pos.line + 1, pos.ch + 1);
}

class Marker {
  constructor(cm, id, line, ch) {
    this.cm = cm;
    this.id = id;
    this.lineNumber = line + 1;
    this.column = ch + 1;
    cm.marks[this.id] = this;
  }

  clear() {
    delete this.cm.marks[this.id];
  }

  find() {
    return toCmPos(this);
  }
}

function monacoToCmKey(e, skip = false) {
  let addQuotes = true;
  let keyName = monaco.KeyCode[e.keyCode];

  if (e.key) {
    keyName = e.key;
    addQuotes = false;
  }

  let key = keyName;
  let skipOnlyShiftCheck = skip;

  switch (e.keyCode) {
    case KeyCode.Shift:
    case KeyCode.Meta:
    case KeyCode.Alt:
    case KeyCode.Ctrl:
      return key;
    case KeyCode.Escape:
      skipOnlyShiftCheck = true;
      key = 'Esc';
      break;
  }

  if (keyName.startsWith('KEY_')) {
    key = keyName[keyName.length - 1].toLowerCase();
  } else if (keyName.endsWith('Arrow')) {
    skipOnlyShiftCheck = true;
    key = keyName.substr(0, keyName.length - 5);
  } else if (keyName.startsWith('US_')) {
    key = e.browserEvent.key;
  }

  if (!skipOnlyShiftCheck && !e.altKey && !e.ctrlKey && !e.metaKey) {
    key = e.key || e.browserEvent.key;
  } else {
    if (e.altKey) {
      key = `Alt-${key}`;
    }
    if (e.ctrlKey) {
      key = `Ctrl-${key}`;
    }
    if (e.metaKey) {
      key = `Meta-${key}`;
    }
    if (e.shiftKey) {
      key = `Shift-${key}`;
    }
  }

  if (key.length === 1 && addQuotes) {
    key = `'${key}'`;
  }

  return key;
}

class CMAdapter {
  static Pos = Pos;
  static signal = signal;
  static on = dummy('on');
  static off = dummy('off');
  static addClass = dummy('addClass');
  static rmClass = dummy('rmClass');
  static defineOption = dummy('defineOption');
  static keyMap = {
    'default': function(key) {
      return function(cm) {
        return true;
      }
    }
  };
  static isWordChar = isWordCharBasic;
  static keyName = monacoToCmKey;
  static StringStream = StringStream;
  static e_stop = function(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
    CMAdapter.e_preventDefault(e);
    return false;
  };

  static e_preventDefault = function(e) {
    if (e.preventDefault) {
      e.preventDefault();

      if (e.browserEvent) {
        e.browserEvent.preventDefault();
      }
    } else {
      e.returnValue = false;
    }

    return false;
  };

  static commands = {
    redo: function(cm) {
      cm.triggerEditorAction('redo');
    },
    undo: function(cm) {
      cm.triggerEditorAction('undo');
    },
    newlineAndIndent: function(cm) {
      cm.triggerEditorAction('editor.action.insertLineAfter');
    }
  };

  static lookupKey = function lookupKey(key, map, handle) {
    if (typeof map === 'string') {
      map = CMAdapter.keyMap[map];
    }
    const found = typeof map == "function" ? map(key) : map[key];

    if (found === false) return "nothing";
    if (found === "...") return "multi";
    if (found != null && handle(found)) return "handled";

    if (map.fallthrough) {
      if (!Array.isArray(map.fallthrough))
        return lookupKey(key, map.fallthrough, handle);
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle);
        if (result) return result;
      }
    }
  }

  static defineExtension = function(name, fn) {
    CMAdapter.prototype[name] = fn;
  };

  constructor(editor) {
    this.editor = editor;
    this.state = {};
    this.marks = {};
    this.$uid = 0;
    this.disposables = [];
    this.listeners = {};
    this.curOp = {};
    this.attached = false;
    this.statusBar = null;
    this.addLocalListeners();
    this.ctxInsert = this.editor.createContextKey('insertMode', true);
  }

  attach() {
    CMAdapter.keyMap.vim.attach(this);
  }

  addLocalListeners() {
    this.disposables.push(
      this.editor.onDidChangeCursorPosition(this.handleCursorChange),
      this.editor.onDidChangeModelContent(this.handleChange),
      this.editor.onKeyDown(this.handleKeyDown),
    );
  }

  handleKeyDown = (e) => {
    // Allow previously registered keydown listeners to handle the event and
    // prevent this extension from also handling it.
    if (e.browserEvent.defaultPrevented & e.keyCode !== KeyCode.Escape) {
      return;
    }

    if (!this.attached) {
      return;
    }

    const key = monacoToCmKey(e);

    if (this.replaceMode) {
      this.handleReplaceMode(key, e);
    }

    if (!key) {
      return;
    }

    if (CMAdapter.keyMap.vim && CMAdapter.keyMap.vim.call) {
      const cmd = CMAdapter.keyMap.vim.call(key, this);
      if (cmd) {
        e.preventDefault();
        e.stopPropagation();

        try {
          cmd();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  handleReplaceMode(key, e) {
    let fromReplace = false;
    let char = key;
    const pos = this.editor.getPosition();
    let range = new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column + 1);
    let forceMoveMarkers = true;

    if (key.startsWith('\'')) {
      char = key[1];
    } else if (char === 'Enter') {
      char = '\n';
    } else if (char === 'Backspace') {
      const lastItem = this.replaceStack.pop();

      if (!lastItem) {
        return;
      }

      fromReplace = true;
      char = lastItem;
      range = new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column - 1);
    } else {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (!this.replaceStack) {
      this.replaceStack = [];
    }

    if (!fromReplace) {
      this.replaceStack.push(this.editor.getModel().getValueInRange(range));
    }

    this.editor.executeEdits('vim', [{
      text: char,
      range,
      forceMoveMarkers,
    }]);

    if (fromReplace) {
      this.editor.setPosition(range.getStartPosition());
    }
  }

  handleCursorChange = (e) => {
    const { position, source } = e;
    const { editor } = this;
    const selection = editor.getSelection();

    if (!this.ctxInsert.get() && e.source === 'mouse' && selection.isEmpty()) {
      const maxCol = editor.getModel().getLineMaxColumn(position.lineNumber);

      if (e.position.column === maxCol) {
        editor.setPosition(new Position(e.position.lineNumber, maxCol - 1));
        return;
      }
    }

    this.dispatch('cursorActivity', this, e);
  }

  handleChange = (e) => {
    const { changes } = e;
    const change = {
      text: changes.reduce((acc, change) => {
        acc.push(change.text);
        return acc;
      }, []),
      origin: '+input'
    };
    const curOp = this.curOp = this.curOp || {};

    if (!curOp.changeHandlers) {
      curOp.changeHandlers = this.listeners['change'] && this.listeners['change'].slice();
    }

    if (this.virtualSelectionMode()) {
      return;
    }

    if (!curOp.lastChange) {
      curOp.lastChange = curOp.change = change;
    } else {
      curOp.lastChange.next = curOp.lastChange = change;
    }

    this.dispatch('change', this, change);
  };

  setOption(key, value) {
    this.state[key] = value;

    if (key === 'theme') {
      monacoEditor.setTheme(value);
    }
  }

  getConfiguration() {
    const { editor } = this;
    let opts = EditorOptConstants;

    if (typeof editor.getConfiguration === 'function') {
      return editor.getConfiguration();
    } else if ('EditorOption' in monacoEditor) { // for monaco 0.19.3 onwards
      opts = monacoEditor.EditorOption;
    }

    return {
      readOnly: editor.getOption(opts.readOnly),
      viewInfo: {
        cursorWidth: editor.getOption(opts.cursorWidth),
      },
      fontInfo: editor.getOption(opts.fontInfo),
    };
  }

  getOption(key) {
    if (key === 'readOnly') {
      return this.getConfiguration().readOnly;
    } else if (key === 'firstLineNumber') {
      return this.firstLine() + 1;
    } else if (key === 'indentWithTabs') {
      return !this.editor.getModel().getOptions().insertSpaces;
    } else {
      if (typeof this.editor.getConfiguration === 'function') {
        return this.editor.getRawConfiguration()[key];
      }
      return this.editor.getRawOptions()[key];
    }
    return this.state[key];
  }

  dispatch(signal, ...args) {
    const listeners = this.listeners[signal];
    if (!listeners) {
      return;
    }

    listeners.forEach(handler => handler(...args));
  }

  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(handler);
  }

  off(event, handler) {
    const listeners = this.listeners[event];
    if (!listeners) {
      return;
    }

    this.listeners[event] = listeners.filter(l => l !== handler);
  }

  firstLine() {
    return 0;
  }

  lastLine() {
    return this.lineCount() - 1;
  }

  lineCount() {
    return this.editor.getModel().getLineCount();
  }

  defaultTextHeight() {
    return 1;
  }

  getLine(line) {
    if (line < 0) {
      return '';
    }
    const model = this.editor.getModel();
    const maxLines = model.getLineCount();

    if (line + 1 > maxLines) {
      line = maxLines - 1;
    }

    return this.editor.getModel().getLineContent(line + 1);
  }

  getAnchorForSelection(selection) {
    if (selection.isEmpty()) {
      return selection.getPosition();
    }

    const selDir = selection.getDirection();
    return (selDir === SelectionDirection.LTR) ? selection.getStartPosition() : selection.getEndPosition();
  }

  getHeadForSelection(selection) {
    if (selection.isEmpty()) {
      return selection.getPosition();
    }

    const selDir = selection.getDirection();
    return (selDir === SelectionDirection.LTR) ? selection.getEndPosition() : selection.getStartPosition();
  }

  getCursor(type = null) {
    if (!type) {
      return toCmPos(this.editor.getPosition());
    }

    const sel = this.editor.getSelection();
    let pos;

    if (sel.isEmpty()) {
      pos = sel.getPosition();
    } else if (type === 'anchor') {
      pos = this.getAnchorForSelection(sel);
    } else {
      pos = this.getHeadForSelection(sel);
    }

    return toCmPos(pos);
  }

  getRange(start, end) {
    const p1 = toMonacoPos(start);
    const p2 = toMonacoPos(end);

    return this.editor.getModel().getValueInRange(Range.fromPositions(p1, p2));
  }

  getSelection() {
    return this.editor.getModel().getValueInRange(this.editor.getSelection());
  }

  replaceRange(text, start, end) {
    const p1 = toMonacoPos(start);
    const p2 = !end ? p1 : toMonacoPos(end);

    this.editor.executeEdits('vim', [{
      text,
      range: Range.fromPositions(p1, p2),
    }]);
    // @TODO - Check if this breaks any other expectation
    this.pushUndoStop();
  }

  pushUndoStop() {
    this.editor.pushUndoStop();
  }

  setCursor(line, ch) {
    let pos = line;

    if (typeof line !== 'object') {
      pos = {};
      pos.line = line;
      pos.ch = ch;
    }

    const monacoPos = this.editor.getModel().validatePosition(toMonacoPos(pos));
    this.editor.setPosition(toMonacoPos(pos));
    this.editor.revealPosition(monacoPos);
  }

  somethingSelected() {
    return !this.editor.getSelection().isEmpty();
  }

  operation(fn, force) {
    return fn();
  }

  listSelections() {
    const selections = this.editor.getSelections();

    if (!selections.length || this.inVirtualSelectionMode) {
      return [{
        anchor: this.getCursor('anchor'),
        head: this.getCursor('head'),
      }];
    }

    return selections.map(sel => {
      const pos = sel.getPosition();
      const start = sel.getStartPosition();
      const end = sel.getEndPosition();

      return {
        anchor: this.clipPos(toCmPos(this.getAnchorForSelection(sel))),
        head: this.clipPos(toCmPos(this.getHeadForSelection(sel))),
      };
    });
  }

  focus() {
    this.editor.focus();
  }

  setSelections(selections, primIndex) {
    const hasSel = !!this.editor.getSelections().length;
    const sels = selections.map((sel, index) => {
      const { anchor, head } = sel;

      if (hasSel) {
        return Selection.fromPositions(toMonacoPos(anchor), toMonacoPos(head));
      } else {
        return Selection.fromPositions(toMonacoPos(head), toMonacoPos(anchor));
      }
    });

    if (!primIndex) {
      sels.reverse();
    } else if (sels[primIndex]) {
      sels.push(sels.splice(primIndex, 1)[0]);
    }

    if (!sels.length) {
      return;
    }

    const sel = sels[0];
    let posToReveal;

    if (sel.getDirection() === SelectionDirection.LTR) {
      posToReveal = sel.getEndPosition();
    } else {
      posToReveal = sel.getStartPosition();
    }

    this.editor.setSelections(sels);
    this.editor.revealPosition(posToReveal);
  }

  setSelection(frm, to) {
    const range = Range.fromPositions(toMonacoPos(frm), toMonacoPos(to));
    this.editor.setSelection(range);
  }

  getSelections() {
    const { editor } = this;
    return editor.getSelections().map(sel => editor.getModel().getValueInRange(sel));
  }

  replaceSelections(texts) {
    const { editor } = this;

    editor.getSelections().forEach((sel, index) => {
      editor.executeEdits('vim', [{
        range: sel,
        text: texts[index],
        forceMoveMarkers: false,
      }]);
    })
  }

  toggleOverwrite(toggle) {
    if (toggle) {
      this.enterVimMode();
      this.replaceMode = true;
    } else {
      this.leaveVimMode();
      this.replaceMode = false;
      this.replaceStack = [];
    }
  }

  charCoords(pos, mode) {

    return {
      top: pos.line,
      left: pos.ch,
    };
  }

  coordsChar(pos, mode) {
    if (mode === 'local') {

    }
  }

  clipPos(p) {
    const pos = this.editor.getModel().validatePosition(toMonacoPos(p));
    return toCmPos(pos);
  }

  setBookmark(cursor, options) {
    const bm = new Marker(this, this.$uid++, cursor.line, cursor.ch);

    if (!options || !options.insertLeft) {
      bm.$insertRight = true;
    }

    this.marks[bm.id] = bm;
    return bm;
  }

  getScrollInfo() {
    const { editor } = this;
    const [ range ] = editor.getVisibleRanges();

    return {
      left: 0,
      top: range.startLineNumber - 1,
      height: editor.getModel().getLineCount(),
      clientHeight: range.endLineNumber - range.startLineNumber + 1,
    };
  }

  triggerEditorAction(action) {
    this.editor.trigger('vim', action);
  }

  dispose() {
    this.dispatch('dispose');
    this.removeOverlay();

    if (CMAdapter.keyMap.vim) {
      CMAdapter.keyMap.vim.detach(this);
    }

    this.disposables.forEach(d => d.dispose());
  }

  getInputField() {}
  getWrapperElement() {}

  enterVimMode(toVim = true) {
    this.ctxInsert.set(false);
    const config = this.getConfiguration();
    this.initialCursorWidth = config.viewInfo.cursorWidth || 0;

    this.editor.updateOptions({
      cursorWidth: config.fontInfo.typicalFullwidthCharacterWidth,
      cursorBlinking: 'solid',
    });
  }

  leaveVimMode() {
    this.ctxInsert.set(true);

    this.editor.updateOptions({
      cursorWidth: this.initialCursorWidth || 0,
      cursorBlinking: 'blink',
    });
  }

  virtualSelectionMode() {
    return this.inVirtualSelectionMode;
  }

  markText() {
    // only used for fat-cursor, not needed
    return {clear: function() {}, find: function() {}};
  }

  getUserVisibleLines() {
    const ranges = this.editor.getVisibleRanges();
    if (!ranges.length) {
      return {
        top: 0,
        bottom: 0,
      };
    }

    const res = {
      top: Infinity,
      bottom: 0,
    };

    ranges.reduce((acc, range) => {
      if (range.startLineNumber < acc.top) {
        acc.top = range.startLineNumber;
      }

      if (range.endLineNumber > acc.bottom) {
        acc.bottom = range.endLineNumber;
      }

      return acc;
    }, res);

    res.top -= 1;
    res.bottom -= 1;

    return res;
  }

  findPosV(startPos, amount, unit) {
    const { editor } = this;
    let finalAmount = amount;
    let finalUnit = unit;
    const pos = toMonacoPos(startPos);

    if (unit === 'page') {
      const editorHeight = editor.getLayoutInfo().height;
      const lineHeight = this.getConfiguration().fontInfo.lineHeight;
      finalAmount = finalAmount * Math.floor(editorHeight / lineHeight);
      finalUnit = 'line';
    }

    if (unit === 'line') {
      pos.lineNumber += finalAmount;
    }

    return toCmPos(pos);
  }

  findMatchingBracket(pos) {
    const mPos = toMonacoPos(pos);
    const res = this.editor.getModel().matchBracket(mPos);

    if (!res || !(res.length === 2)) {
      return {
        to: null,
      };
    }

    return {
      to: toCmPos(res[1].getStartPosition()),
    };
  }

  findFirstNonWhiteSpaceCharacter(line) {
    return this.editor.getModel().getLineFirstNonWhitespaceColumn(line + 1) - 1;
  }

  scrollTo(x, y) {
    if (!x && !y) {
      return;
    }
    if (!x) {
      if (y < 0) {
        y = this.editor.getPosition().lineNumber - y;
      }
      this.editor.setScrollTop(this.editor.getTopForLineNumber(y + 1));
    }
  }

  moveCurrentLineTo(viewPosition) {
    const { editor } = this;
    const pos = editor.getPosition();
    const range = Range.fromPositions(pos, pos);

    switch(viewPosition) {
      case 'top':
        editor.revealRangeAtTop(range);
        return;
      case 'center':
        editor.revealRangeInCenter(range);
        return;
      case 'bottom':
        // private api. no other way
        editor._revealRange(range, VerticalRevealType.Bottom);
        return;
    }
  }

  getSearchCursor(query, pos, caseFold) {
    let matchCase = false;
    let isRegex = false;

    if (query instanceof RegExp && !query.global) {
      matchCase = !query.ignoreCase;
      query = query.source;
      isRegex = true;
    }

    if (pos.ch == undefined) pos.ch = Number.MAX_VALUE;

    const monacoPos = toMonacoPos(pos);
    const context = this;
    const { editor } = this;
    let lastSearch = null;
    const model = editor.getModel();
    const matches = model.findMatches(query, false, isRegex, matchCase) || [];

    return {
      getMatches() {return matches;},
      findNext() {return this.find(false);},
      findPrevious() {return this.find(true);},
      jumpTo(index) {
        if (!matches || !matches.length) {
          return false;
        }
        var match = matches[index];
        lastSearch = match.range;
        context.highlightRanges([lastSearch], 'currentFindMatch');
        context.highlightRanges(matches.map(m => m.range).filter(r => !r.equalsRange(lastSearch)));

        return lastSearch;
      },
      find(back) {
        if (!matches || !matches.length) {
          return false;
        }

        let match;

        if (back) {
          const pos = lastSearch ? lastSearch.getStartPosition() : monacoPos;
          match = model.findPreviousMatch(query, pos, isRegex, matchCase);

          if (!match || !match.range.getStartPosition().isBeforeOrEqual(pos)) {
            return false;
          }
        } else {
          const pos = lastSearch ? lastSearch.getEndPosition() : monacoPos;
          match = model.findNextMatch(query, pos, isRegex, matchCase);
          if (!match || !pos.isBeforeOrEqual(match.range.getStartPosition())) {
            return false;
          }
        }

        lastSearch = match.range;
        context.highlightRanges([lastSearch], 'currentFindMatch');
        context.highlightRanges(matches.map(m => m.range).filter(r => !r.equalsRange(lastSearch)));

        return lastSearch;
      },
      from() {
        return lastSearch && toCmPos(lastSearch.getStartPosition());
      },
      to() {
        return lastSearch && toCmPos(lastSearch.getEndPosition());
      },
      replace(text) {
        if (lastSearch) {
          editor.executeEdits('vim', [{
            range: lastSearch,
            text,
            forceMoveMarkers: true,
          }]);

          lastSearch.setEndPosition(editor.getPosition());
          editor.setPosition(lastSearch.getStartPosition());
        }
      }
    };
  }

  highlightRanges(ranges, className = 'findMatch') {
    const decorationKey = `decoration${className}`;
    this[decorationKey] = this.editor.deltaDecorations(
      this[decorationKey] || [],
      ranges.map(range => ({
        range,
        options: {
          stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          zIndex: 13,
          className,
          showIfCollapsed: true,
        },
      })),
    );

    return this[decorationKey];
  }

  addOverlay({ query }, hasBoundary, style) {
    let matchCase = false;
    let isRegex = false;

    if (query && query instanceof RegExp && !query.global) {
      isRegex = true;
      matchCase = !query.ignoreCase;
      query = query.source;
    }

    const match = this.editor.getModel().findNextMatch(query, this.editor.getPosition(), isRegex, matchCase);

    if (!match || !match.range) {
      return;
    }

    this.highlightRanges([match.range]);
  }

  removeOverlay() {
    ['currentFindMatch', 'findMatch'].forEach(key => {
      this.editor.deltaDecorations(this[`decoration${key}`] || [], []);
    });
  }

  scrollIntoView(pos) {
    if (!pos) {
      return;
    }
    this.editor.revealPosition(toMonacoPos(pos));
  }

  moveH(units, type) {
    if (type !== 'char') {
      return;
    }
    const pos = this.editor.getPosition();
    this.editor.setPosition(new Position(pos.lineNumber, pos.column + units));
  }

  /**
   * Uses internal apis which not sure why is internal
   */
  scanForBracket(pos, dir, dd, config) {
    const mPos = toMonacoPos(pos);
    const model = this.editor.getModel();
    let range = model.matchBracket(mPos);

    if (!range || range.length !== 2) {
      const bracket = '{([';
      for(let i=0; i<bracket.length; i++) {
        const bracketRange = model.findMatchingBracketUp(bracket[i], mPos);

        if (bracketRange) {
          range = model.matchBracket(bracketRange.getEndPosition());
          break;
        }
      }
    }

    if (!range || range.length !== 2) {
      return null;
    }

    let res;

    if (dir === -1) {
      res = range[1].getStartPosition();
    } else {
      res = range[0].getStartPosition();
    }

    return {
      pos: toCmPos(res),
      ch: model.getValueInRange(dir === -1 ? range[0] : range[1]),
    };
  }

  indexFromPos(pos) {
    return this.editor.getModel().getOffsetAt(toMonacoPos(pos));
  }

  posFromIndex(offset) {
    return toCmPos(this.editor.getModel().getPositionAt(offset));
  }

  indentLine(line, indentRight = true) {
    const { editor } = this
    const cursors = editor._getCursors();
    const pos = new Position(line + 1, 1);
    const sel = Selection.fromPositions(pos, pos);
    // no other way than to use internal apis to preserve the undoStack for a batch of indents
    editor.executeCommands(
      `editor.action.${indentRight ? 'indent' : 'outdent'}Lines`,
      TypeOperations[indentRight ? 'indent' : 'outdent'](cursors.context.config, this.editor.getModel(), [sel]),
    );
  }

  setStatusBar(statusBar) {
    this.statusBar = statusBar;
  }

  openDialog(html, callback, options) {
    if (!this.statusBar) {
      return;
    }

    return this.statusBar.setSec(html, callback, options);
  }

  openNotification(html) {
    if (!this.statusBar) {
      return;
    }

    this.statusBar.showNotification(html);
  }
}

export default CMAdapter;
