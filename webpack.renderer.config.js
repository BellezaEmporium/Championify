const path = require('path');

module.exports = {
  entry: './electron.js', // Ensure this path is correct
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js'
  },
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.marko$/,
        loader: '@marko/webpack/loader'
      },
      {
        test: /\.html$/,
        use: 'html-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.marko', '.html']
  }
};
