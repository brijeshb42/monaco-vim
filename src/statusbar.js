export default class VimStatusBar {
  constructor(node, editor) {
    this.node = node;
    this.modeInfoNode = document.createElement('span');
    this.secInfoNode = document.createElement('span');
    this.notifNode = document.createElement('span');
    this.notifNode.className = 'vim-notification';
    this.keyInfoNode = document.createElement('span');
    this.keyInfoNode.setAttribute('style', 'float: right');
    this.node.appendChild(this.modeInfoNode);
    this.node.appendChild(this.secInfoNode);
    this.node.appendChild(this.notifNode);
    this.node.appendChild(this.keyInfoNode);
    this.toggleVisibility(false);
    this.editor = editor;
  }

  setMode(e) {
    this.setText(`--${e.mode.toUpperCase()}--`);
  }

  setKeyBuffer(key) {
    this.keyInfoNode.textContent = key;
  }

  setSec(text, callback, options) {
    this.notifNode.textContent = '';
    if (text === undefined) {
      return;
    }

    this.secInfoNode.innerHTML = text;
    const input = this.secInfoNode.querySelector('input');

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
  }

  setText(text) {
    this.modeInfoNode.textContent = text;
  }

  toggleVisibility(toggle) {
    if (toggle) {
      this.node.style.display = 'block';
    } else {
      this.node.style.display = 'none';
    }

    if (this.input) {
      this.removeInputListeners();
    }

    clearInterval(this.notifTimeout);
  }

  closeInput = () => {
    this.removeInputListeners();
    this.input = null;
    this.setSec('');

    if (this.editor) {
      this.editor.focus();
    }
  };

  inputKeyUp = (e) => {
    const { options } = this.input;
    if (options && options.onKeyUp) {
      options.onKeyUp(e, e.target.value, this.closeInput);
    }
  };

  inputBlur = () => {
    const { options } = this.input;

    if (options.closeOnBlur) {
      this.closeInput();
    }
  };

  inputKeyDown = (e) => {
    const { options, callback } = this.input;

    if (options && options.onKeyDown && options.onKeyDown(e, e.target.value, this.closeInput)) {
      return;
    }

    if (e.keyCode === 27 || (options && options.closeOnEnter !== false && e.keyCode == 13)) {
      this.input.node.blur();
      e.stopPropagation();
      this.closeInput();
    }

    if (e.keyCode === 13 && callback) {
      e.stopPropagation();
      e.preventDefault();
      callback(e.target.value);
    }
  };

  addInputListeners() {
    const { node } = this.input;
    node.addEventListener('keyup', this.inputKeyUp);
    node.addEventListener('keydown', this.inputKeyDown);
    node.addEventListener('input', this.inputKeyInput);
    node.addEventListener('blur', this.inputBlur);
  }

  removeInputListeners() {
    if (!this.input || !this.input.node) {
      return;
    }

    const { node } = this.input;
    node.removeEventListener('keyup', this.inputKeyUp);
    node.removeEventListener('keydown', this.inputKeyDown);
    node.removeEventListener('input', this.inputKeyInput);
    node.removeEventListener('blur', this.inputBlur);
  }

  showNotification(text) {
    const sp = document.createElement('span');
    sp.innerHTML = text;
    this.notifNode.textContent = sp.textContent;
    this.notifTimeout = setTimeout(() => {
      this.notifNode.textContent = '';
    }, 5000);
  }
}
