## monaco-vim

Vim keybindings for monaco-editor [demo](https://editor-a5ea1.firebaseapp.com)

[![npm version](https://badge.fury.io/js/monaco-vim.svg)](https://www.npmjs.com/package/monaco-vim)

### Install

#### Webpack/browserify
```sh
npm install monaco-vim
```

#### As global

Add this script [https://unpkg.com/monaco-vim/dist/monaco-vim.js](https://unpkg.com/monaco-vim/dist/monaco-vim.js) after monaco-editor's `script` tag.
Make sure that `monaco` is already available on the `window` global. Vim will be available as `MonacoVim` global.

### Usage

```js
import { initVimMode } from 'monaco-vim';

const vimMode = initVimMode(editor, document.getElementById('my-statusbar'))
```

OR

```js
var initVimMode = window.MonacoVim.initVimMode;
var vimMode = initVimMode(editor, document.getElementById('my-statusbar'));
```

#### AMD

If you are following the official guide and integrating the AMD version of `monaco-editor`, you can follow this -

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8" >
</head>
<body>

<div id="container" style="width:800px;height:600px;border:1px solid grey"></div>
<div id="status"></div>

<script src="https://unpkg.com/monaco-editor/min/vs/loader.js"></script>
<script>
  require.config({
    paths: {
      'vs': 'https://unpkg.com/monaco-editor/min/vs',
      'monaco-vim': 'https://unpkg.com/monaco-vim@0.0.7/dist/monaco-vim',
    }
  });
  require(['vs/editor/editor.main', 'monaco-vim'], function(a, MonacoVim) {
    var editor = monaco.editor.create(document.getElementById('container'), {
      value: [
        'function x() {',
        '\tconsole.log("Hello world!");',
        '}'
      ].join('\n'),
      language: 'javascript'
    });
    var statusNode = document.getElementById('status');
    var vimMode = MonacoVim.initVimMode(editor, statusNode);

    // remove vim mode by calling
    // vimMode.dispose();
  });
</script>
</body>
</html>
```

Here, `editor` is initialized instance of monaco editor and the 2nd argument should be the node where you would like to place/show the VIM status info.

To remove the attached VIM bindings, call

```js
vimMode.dispose();
```

See [demo.js](https://github.com/brijeshb42/monaco-vim/tree/master/src/demo.js) for full usage.

If you would like to customize the statusbar or provide your own implementation, see `initVimMode`'s implementation in [src/index.js](https://github.com/brijeshb42/monaco-vim/tree/master/src/index.js).

This implementaion of VIM is a layer between Codemirror's VIM keybindings and monaco. There may be issues in some of the keybindings, especially those that expect extra input like the Ex commands or search/replace. If you encounter such bugs, create a new [issue](https://github.com/brijeshb42/monaco-vim/issues). PRs to resolve those are welcome too.
