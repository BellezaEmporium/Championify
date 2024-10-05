import path from 'path'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import plugin from '@marko/webpack/plugin.js'

const markoPlugin = plugin
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default [{
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-main',
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
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
        }
      },
      {
        test: /\.marko$/,
        loader: '@marko/webpack/loader'
      }
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    markoPlugin.browser,
  ],
  resolve: {
    extensions: ['.js'],
  },
}]
