const path = require('path');

module.exports = {
  target: 'electron-preload',
  entry: './src/preload.js',
  output: {
    path: path.resolve(__dirname, '.webpack/preload'),
    filename: 'preload.js',
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
      },
    ],
  },
};
