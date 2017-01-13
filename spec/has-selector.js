describe('has-selector.js', function () {
    'use strict';

    var root = document.querySelector('#jasmine_fixture');

    forEachTest('base/spec/has-selector.json', function () {

        runAsyncStep('setup HTML', function (html) {
            requestAnimationFrame(endAsyncStep);
            root.innerHTML = html;
        });

        runAsyncStep('invoke element methods', function (selector, key, args) {
            var element = root.querySelector(selector);
            element[key].apply(element, args);
            requestAnimationFrame(endAsyncStep);
        });

        runAsyncStep('set element properties', function (selector, key, val) {
            root.querySelector(selector)[key] = val;
            requestAnimationFrame(endAsyncStep);
        });

        runStep('check elements', function (selector, key, val) {
            var style = getComputedStyle(root.querySelector(selector));
            expect(style[key]).toEqual(val);
        });
    });
});