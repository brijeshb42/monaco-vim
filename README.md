## monaco-vim

Vim keybindings for monaco-editor [demo](https://editor-a5ea1.firebaseapp.com)

[![npm version](https://badge.fury.io/js/monaco-vim.svg)](https://www.npmjs.com/package/monaco-vim)

### Install

#### Webpack/browserify
```sh
npm install monaco-vim
```

##### As global

This package will only work when bundled using webpack/browserify or using AMD. Including globally
is not possible due to the use of an internal dependency of monaco-editor which is not exposed in
the API. Loading 'monaco' globally is also not possible as you'll have to use its `loader.js` file.
If you are using that, then there will be no problem. See [AMD](#AMD).

### Usage

```js
import { initVimMode } from 'monaco-vim';

const vimMode = initVimMode(editor, document.getElementById('my-statusbar'))
```

Here, `editor` is initialized instance of monaco editor and the 2nd argument should be the node where you would like to place/show the VIM status info.

To remove the attached VIM bindings, call

```js
vimMode.dispose();
```

### Handling key presses

If you would like a particular keypress to not be handled by this extension, add
your `onKeyDown` handler before initializing `monaco-vim` and call
`preventDefault()` on it. `monaco-vim` will ignore such events and won't do
anything. This can be useful if you want to handle events like running code on
`CTRL/CMD+Enter` which otherwise would have been eaten up by `monaco-vim`.
(Available from v0.0.14 onwards).

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
      'monaco-vim': 'https://unpkg.com/monaco-vim/dist/monaco-vim',
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

See [demo.js](https://github.com/brijeshb42/monaco-vim/tree/master/src/demo.js) for full usage.

If you would like to customize the statusbar or provide your own implementation, see `initVimMode`'s implementation in [src/index.js](https://github.com/brijeshb42/monaco-vim/tree/master/src/index.js).

### Adding custom key bindings

Actual vim implementation can be imported as:

```js
import { VimMode } from 'monaco-vim';
```

#### Defining ex mode command

```js
// VimMode.Vim.defineEx(name, shorthand, callback);
VimMode.Vim.defineEx('write', 'w', function() {
  // your own implementation on what you want to do when :w is pressed
  localStorage.setItem('editorvalue', editor.getValue());
});
```

For advanced usage, refer [codemirror](https://github.com/codemirror/CodeMirror/issues/2840#issuecomment-58125831).  `CodeMirror.Vim` is available as `VimMode.Vim`;

This implementaion of VIM is a layer between Codemirror's VIM keybindings and monaco. There may be issues in some of the keybindings, especially those that expect extra input like the Ex commands or search/replace. If you encounter such bugs, create a new [issue](https://github.com/brijeshb42/monaco-vim/issues). PRs to resolve those are welcome too.
