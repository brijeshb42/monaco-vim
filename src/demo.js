import * as monaco from 'monaco-editor';

import { initVimMode } from './';

const editorNode = document.getElementById('editor');
const statusNode = document.getElementById('status');
const editor = monaco.editor.create(editorNode, {
  value: [1, 2, 3, 4, 5, 6, 7, 8].map(t => 'import').join('\n'),
  minimap: {
    enabled: false,
  },
  theme: 'vs',
  language: 'typescript',
  fontSize: 15,
  scrollBeyondLastLine: false,
});
editor.focus();

const vimMode = initVimMode(editor, statusNode);
window.vim = vimMode;
window.editor = editor;

if (window.localStorage.getItem('value')) {
  editor.setValue(window.localStorage.getItem('value'));
}

setInterval(() => {
  window.localStorage.setItem('value', editor.getValue());
}, 2000)
