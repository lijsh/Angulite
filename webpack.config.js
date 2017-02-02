const { resolve } = require('path')

module.exports = env => ({
    entry: './src/scope.js',
    output: {
        filename: 'bundle.js',
        path: resolve(__dirname, 'dist'),
        pathinfo: !env.prod,
    },
    // context: resolve(__dirname, 'src'),
    devtool: env.prod ? 'source-map' : 'eval',
    bail: env.prod,
    module: {
        loaders: [
            { test: /\.js$/, loader: 'babel-loader!eslint-loader', exclude: /node_modules/ },
        ],
    },
})