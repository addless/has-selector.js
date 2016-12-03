module.exports = function(config) {
    config.set({
        browsers: [
            'Chrome',
            'Firefox',
            'Safari',
            'Opera'
        ],
        files: [
            {pattern: 'node_modules/driven-js/src/**.js', included: true},
            {pattern: 'karma.include.js', included: true},
            {pattern: 'src/**.js', included: true},
            {pattern: 'spec/**.js', included: true},
            {pattern: 'spec/**', included: false}
        ],
        frameworks: [
            'jasmine'
        ],
        reporters: [
            'progress',
            'growl-notifications'
        ]
    });
};
