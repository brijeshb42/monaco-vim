const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

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
    plugins: isProd ? [] : [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, './index.html'),
      }),
      new MonacoWebpackPlugin(),
    ],
    externals: isProd ? {
      'monaco-editor': {
        root: 'monaco',
        commonjs: 'monaco-editor',
        commonjs2: 'monaco-editor',
        amd: 'monaco-editor',
      }
    } : {},
  }
};
