const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ffprobeStatic = require('ffprobe-static');


module.exports = {
  entry: {
    main: './src/main.js',
    preload: './src/preload.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '.webpack/main'),
  },
  module: {
    rules: require('./webpack.rules'),
  },
  externals: {
    'ffprobe-static': 'commonjs2 ffprobe-static', // 👈 prevents it from being bundled
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
        {
          from: ffprobeStatic.path, 
          to: 'whisper/ffprobe.exe',
        },
      ],
    }),
  ],
};
