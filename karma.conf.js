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
    browsers: ['PhantomJS'],
    webpack: webpackConfig,
    webpackMiddleware: { noInfo: true },
    logLevel: config.LOG_INFO,
    autoWatch: true,
    colors: true,
    singleRun: false,
    concurrency: Infinity,
  })
}