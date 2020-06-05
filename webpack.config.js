/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  entry: {
    index: './src/index.ts'
  },
  /*devtool: 'inline-source-map',*/
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'dist')
  }
};
