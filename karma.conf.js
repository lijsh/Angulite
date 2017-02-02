const webpackEnv = { test: true }
const webpackConfig = require('./webpack.config')(webpackEnv)

module.exports = function karmaConf(config) {
    config.set({
        frameworks: ['jasmine'],
        files: [
            'src/**/*.js',
            'test/**/*_spec.js',
        ],
        preprocessors: {
            'src/**/*.js': ['webpack'],
            'test/**/*_spec.js': ['webpack'],
        },
        browsers: ['PhantomJS', 'Chrome', 'Firefox'],
        webpack: webpackConfig,
        webpackMiddleware: { noInfo: true },
        logLevel: config.LOG_INFO,
        autoWatch: false,
        colors: true,
        singleRun: true,
        concurrency: Infinity,
    })
}