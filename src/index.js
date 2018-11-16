import { default as VimMode } from './cm/keymap_vim';
import StatusBar from './statusbar';

export function initVimMode(editor, statusbarNode = null, StatusBarClass = StatusBar) {
  const vimAdapter = new VimMode(editor);

  if (!statusbarNode) {
    vimAdapter.attach();
    return vimAdapter;
  }

  const statusbar = new StatusBarClass(statusbarNode, editor);
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

  VimMode.defineExtension('openDialog', function(html, callback, options) {
    return statusbar.setSec(html, callback, options);
  });

  VimMode.defineExtension('openNotification', function(html) {
    statusbar.showNotification(html);
  });

  vimAdapter.attach();
  statusbar.toggleVisibility(true);

  return vimAdapter;
}

export {
  VimMode,
  StatusBar,
};
