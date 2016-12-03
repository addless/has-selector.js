describe('has-selector.js', function () {
    'use strict';

    var root = document.querySelector('#jasmine_fixture');

    forEachTest('base/spec/has-selector.json', function (done) {

        runStep('setup HTML', function (html) {
            root.innerHTML = html;
        });

        runStep('invoke element methods', function (selector, key, args) {
            var element = root.querySelector(selector);
            element[key].apply(element, args);
        });

        runStep('set element properties', function (selector, key, val) {
            root.querySelector(selector)[key] = val;
        });

        requestAnimationFrame(function () {

            runStep('check elements', function (selector, key, val) {
                var style = getComputedStyle(root.querySelector(selector));
                expect(style[key]).toEqual(val);
            });

            done();
        });
    });
});