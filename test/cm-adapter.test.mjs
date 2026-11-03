import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const KeyCode = {};
for (const [index, name] of [
  "Unknown",
  "Shift",
  "Meta",
  "Alt",
  "Ctrl",
  "Escape",
  "Space",
  "LeftArrow",
  "KeyH",
].entries()) {
  KeyCode[name] = index;
  KeyCode[index] = name;
}
const module = { exports: {} };
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/cm_adapter.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
vm.runInNewContext(compiled, {
  module,
  exports: module.exports,
  console,
  require: () => ({ KeyCode, editor: { EditorOption: {} } }),
});
const CMAdapter = module.exports.default;

function keyboard(key, overrides = {}) {
  const code = key === " " ? "Space" : key;
  return {
    key,
    code,
    keyCode: KeyCode[code] ?? KeyCode.Unknown,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    isComposing: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
    ...overrides,
  };
}

function adapterFixture(hasNode = true) {
  const listeners = new Map();
  let legacyListener;
  const node = {
    addEventListener(type, callback, capture) {
      listeners.set(type, { callback, capture });
    },
    removeEventListener(type, callback, capture) {
      assert.equal(listeners.get(type)?.callback, callback);
      assert.equal(listeners.get(type)?.capture, capture);
      listeners.delete(type);
    },
  };
  const editor = {
    getDomNode: () => (hasNode ? node : null),
    onDidChangeCursorPosition: () => ({ dispose() {} }),
    onDidChangeModelContent: () => ({ dispose() {} }),
    onKeyDown: (listener) => {
      legacyListener = listener;
      return { dispose() {} };
    },
    createContextKey: () => ({}),
    deltaDecorations: () => [],
  };
  const adapter = new CMAdapter(editor);
  adapter.attached = true;
  const commands = [];
  adapter.state.keyMap = "test";
  CMAdapter.keyMap.test = { call: (key) => () => commands.push(key) };
  return { adapter, commands, listeners, legacy: () => legacyListener };
}

for (const [key, modifiers, expected] of [
  ["h", {}, "'h'"],
  ["V", { shiftKey: true }, "'V'"],
  ["ArrowLeft", {}, "Left"],
  ["ArrowLeft", { ctrlKey: true }, "Ctrl-Left"],
  [" ", {}, "Space"],
  [" ", { shiftKey: true }, "Shift-Space"],
  ["Escape", {}, "Esc"],
]) {
  test(`normalizes DOM key ${JSON.stringify(key)} as ${expected}`, () => {
    const event = keyboard(key, modifiers);
    assert.equal(
      CMAdapter.keyName({ ...event, browserEvent: event }),
      expected,
    );
  });
}

test("captures handled Vim commands once before Monaco and releases its DOM listener", () => {
  const fixture = adapterFixture();
  assert.equal(fixture.listeners.get("keydown")?.capture, true);
  assert.equal(fixture.legacy(), undefined);
  const event = keyboard("h");
  fixture.listeners.get("keydown").callback(event);
  assert.deepEqual(fixture.commands, ["'h'"]);
  assert.equal(event.defaultPrevented, true);
  fixture.adapter.dispose();
  assert.equal(fixture.listeners.size, 0);
});

test("respects a previously handled event while allowing Escape", () => {
  const fixture = adapterFixture();
  fixture.listeners
    .get("keydown")
    .callback(keyboard("h", { defaultPrevented: true }));
  assert.deepEqual(fixture.commands, []);
  fixture.listeners
    .get("keydown")
    .callback(keyboard("Escape", { defaultPrevented: true }));
  assert.deepEqual(fixture.commands, ["Esc"]);
});

test("does not intercept an IME composition", () => {
  const fixture = adapterFixture();
  const event = keyboard("h", { isComposing: true });
  fixture.listeners.get("keydown").callback(event);
  assert.deepEqual(fixture.commands, []);
  assert.equal(event.defaultPrevented, false);
});

test("falls back to Monaco key events when no editor DOM node exists", () => {
  const fixture = adapterFixture(false);
  assert.equal(typeof fixture.legacy(), "function");
  const event = keyboard("h");
  fixture.legacy()({ ...event, browserEvent: event });
  assert.deepEqual(fixture.commands, ["'h'"]);
});
