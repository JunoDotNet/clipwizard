const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: './src/main.js',
    preload: './src/preload.js', // ✅ include preload explicitly
  },
  output: {
    filename: '[name].js', // ✅ output both main.js and preload.js
    path: path.resolve(__dirname, '.webpack/main'),
  },
  module: {
    rules: require('./webpack.rules'),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/whisper/whisper.exe'),
          to: 'whisper',
        },
        {
          from: path.resolve(__dirname, 'src/whisper/ggml-base.en.bin'),
          to: 'whisper',
        },
        {
          from: path.resolve(__dirname, 'src/whisper/ffmpeg.exe'),
          to: 'whisper',
        },
      ],
    }),
  ],
};
