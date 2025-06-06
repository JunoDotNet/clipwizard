const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/main.js',
  module: {
    rules: require('./webpack.rules'),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/whisper/whisper.exe'),
          to: 'whisper', // relative path inside dist
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
