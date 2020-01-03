import * as monaco from 'monaco-editor';

import { initVimMode } from './';

const editorNode = document.getElementById('editor1');
const statusNode = document.getElementById('status1');
const editor = monaco.editor.create(editorNode, {
  value: [1, 2, 3, 4, 5, 6, 7, 8].map(t => `import${t}`).join('\n'),
  minimap: {
    enabled: false,
  },
  theme: 'vs',
  language: 'javascript',
  fontSize: 15,
  scrollBeyondLastLine: false,
});
editor.focus();
const vimMode = initVimMode(editor, statusNode);

const editorNode2 = document.getElementById('editor2');
const statusNode2 = document.getElementById('status2');
const editor2 = monaco.editor.create(editorNode2, {
  value: [1, 2, 3, 4, 5, 6, 7, 8].map(t => `import${t}`).join('\n'),
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

window.editor = editor;
window.vimMode = vimMode;
window.editor2 = editor;
window.vimMode2 = vimMode2;
