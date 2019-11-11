const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const pkg = require('./package.json');

function getOutput(isProd = false) {
  const data = {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  };

  if (!isProd) {
    return data;
  }

  data.libraryTarget = 'umd';
  data.library = 'MonacoVim';
  data.globalObject = 'self';
  return data;
}

module.exports = (_env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    target: 'web',
    entry: {
      'monaco-vim': isProd ? './src/index.js' : './src/demo.js',
    },
    output: getOutput(isProd),
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            compact: false,
          },
        },
      }, {
        test: /\.css$/,
        // exclude: /node_modules/,
        use: [
          'style-loader',
          'css-loader',
        ],
      }],
    },
    plugins: isProd ? [
      new webpack.BannerPlugin({
        banner: [
          pkg.name,
          `Version - ${pkg.version}`,
          `Author - ${pkg.author}`,
          `License - ${pkg.license}`,
        ].join('\n'),
      }),
    ] : [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, './index.html'),
      }),
      new MonacoWebpackPlugin(),
    ],
    externals: isProd ? {
      'monaco-editor/esm/vs/editor/editor.api': {
        root: 'monaco',
        commonjs: 'monaco-editor/esm/vs/editor/editor.api',
        commonjs2: 'monaco-editor/esm/vs/editor/editor.api',
        amd: 'vs/editor/editor.api',
      },
      'monaco-editor/esm/vs/editor/common/controller/cursorTypeOperations': {
        commonjs: 'monaco-editor/esm/vs/editor/common/controller/cursorTypeOperations',
        commonjs2: 'monaco-editor/esm/vs/editor/common/controller/cursorTypeOperations',
        amd: 'vs/editor/common/controller/cursorTypeOperations',
      },
    } : {},
  }
};
