import * as monaco from 'monaco-editor';

import { initVimMode } from './';

const editorNode = document.getElementById('editor1');
const statusNode = document.getElementById('status1');
const editor = monaco.editor.create(editorNode, {
  value: [1, 2, 3, 4, 5, 6, 7, 8].map(t => 'print("hi")').join('\n'),
  minimap: {
    enabled: false,
  },
  theme: 'vs',
  language: 'javascript',
  fontSize: 15,
  scrollBeyondLastLine: false,
});
editor.addCommand(
    monaco.KeyCode.Escape,
    () => {
       alert('hello!')
    });

editor.addCommand(monaco.KeyCode.DownArrow, () => {
  alert('monaco down');
});
editor.focus();
document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key == "Escape" || evt.key == "Esc");
    } else {
        isEscape = (evt.keyCode == 27);
    }
    if (isEscape) {
        alert("Escape");
        return;
    }
    let isDown = false;
    if ("key" in evt) {
      isDown = (evt.key == "ArrowDown" || evt.key == "ArrowDown");
    } else {
      isDown = (evt.keyCode == 40);
    }
    if (isDown) {
      alert("Down");
      return;
    }
};
const vimMode = initVimMode(editor, statusNode);

const editorNode2 = document.getElementById('editor2');
const statusNode2 = document.getElementById('status2');
const editor2 = monaco.editor.create(editorNode2, {
  value: [1, 2, 3, 4, 5, 6, 7, 8].map(t => 'print("hi")').join('\n'),
  minimap: {
    enabled: false,
  },
  theme: 'vs',
  language: 'javascript',
  fontSize: 15,
  scrollBeyondLastLine: false,
});
editor.focus();
const vimMode2 = initVimMode(editor2, statusNode2);

window.vimMode = vimMode;
window.vimMode2 = vimMode2;
