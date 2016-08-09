module.exports = function karmaConf(config) {
    config.set({
        frameworks: ['browserify', 'jasmine'],
        files: [
            'src/**/*.js',
            'test/**/*_spec.js',
        ],
        preprocessors: {
            'src/**/*.js': ['browserify'],
            'test/**/*_spec.js': ['browserify'],
        },
        browsers: ['PhantomJS'],
        browserify: {
            debug: true,
            configure(bundle) {
                bundle.once('prebundle', () => {
                    bundle.transform('babelify', { presets: ['es2015'] })
                })
            },
        },
    })
}