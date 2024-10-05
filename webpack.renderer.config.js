import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import MarkoWebpackPlugin from '@marko/webpack/plugin.js'

const markoPlugin = MarkoWebpackPlugin
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default [{
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-renderer',
  entry: './src/renderer.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|tasks|tests/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-syntax-import-attributes']
          },
        },
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.marko$/,
        loader: '@marko/webpack/loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/app/index.html' }),
    markoPlugin.browser
  ],
  resolve: {
    extensions: ['.js']
  }
}]
