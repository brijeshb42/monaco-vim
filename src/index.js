import { KeyCode, KeyMod } from 'monaco-editor';

import { default as VimMode } from './cm/keymap_vim';
import StatusBar from './statusbar';

export function initVimMode(editor, statusbarNode, StatusBarClass = StatusBar) {
  const statusbar = new StatusBarClass(statusbarNode, editor);
  const vimAdapter = new VimMode(editor, {
    ignoredKeys: [
      KeyMod.CtrlCmd | KeyCode.KEY_R,
      KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_I,
      KeyMod.CtrlCmd | KeyCode.KEY_1,
      KeyMod.CtrlCmd | KeyCode.KEY_2,
      KeyMod.CtrlCmd | KeyCode.KEY_3,
      KeyMod.CtrlCmd | KeyCode.KEY_4,
      KeyMod.CtrlCmd | KeyCode.KEY_5,
      KeyMod.CtrlCmd | KeyCode.KEY_6,
      KeyMod.CtrlCmd | KeyCode.KEY_7,
      KeyMod.CtrlCmd | KeyCode.KEY_8,
      KeyMod.CtrlCmd | KeyCode.KEY_9,
    ]
  });

  let keyBuffer = '';

  vimAdapter.on('vim-mode-change', (mode) => {
    statusbar.setMode(mode);
  });

  vimAdapter.on('vim-keypress', (key) => {
    if (key === ':') {
      keyBuffer = '';
    } else {
      keyBuffer += key;
    }
    statusbar.setKeyBuffer(keyBuffer);
  });

  vimAdapter.on('vim-command-done', () => {
    keyBuffer = '';
    statusbar.setKeyBuffer(keyBuffer);
  });

  vimAdapter.on('dispose', function() {
    statusbar.toggleVisibility(false);
    statusbar.closeInput();
    statusbar.innerHTML = '';
  });
  vimAdapter.attach();
  statusbar.toggleVisibility(true);

  VimMode.defineExtension('openDialog', function(html, callback, options) {
    statusbar.setSec(html, callback, options);
  });

  VimMode.defineExtension('openNotification', function(html) {
    statusbar.showNotification(html);
  });

  return vimAdapter;
}

export {
  VimMode,
  StatusBar,
};
