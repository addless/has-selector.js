// Polyfill for :has selector.  It replaces each :has declaration with a class alias,
// then uses JS to conditionally add/remove the class to/from DOM elements.
(function () {
    'use strict';

    var out2id = {__proto__: null}; // Maps parent selectors to unique ids
    var out2in = {__proto__: null}; // Maps parent selectors to :has selectors
    var watcher = Watcher();        // Watches and responds to DOM mutations
    var unique = Date.now();        // Base number used to create unique ids for each alias

    updateAllNodes();
    addEventListener('blur', updateParentNodes, true);          // :focus
    addEventListener('focus', updateParentNodes, true);         // :focus
    addEventListener('input', updateParentNodes, true);         // :valid
    addEventListener('mouseup', updateParentNodes, true);       // :active
    addEventListener('mousedown', updateParentNodes, true);     // :active
    addEventListener('mouseout', updateParentNodes, true);      // :hover
    addEventListener('mouseover', updateParentNodes, true);     // :hover
    addEventListener('change', updateRelatedParentNodes, true); // :checked

    // Watches and responds to DOM mutations.
    // Without it, we're unable to mimic the behavior of the :has selector in response to DOM changes.
    function Watcher() {
        var w = new MutationObserver(updateAllNodes);
        var o = {characterData: true, attributes: true, childList: true, subtree: true};
        return {on: w.observe.bind(w, document.documentElement, o), off: w.disconnect.bind(w)};
    }

    // This function loads each <link> element's stylesheet so that we can parse it.
    // Without it, we'd have no way of finding the :has selectors within <link> elements.
    function loadExternalStylesheets() {
        var n = document.getElementsByTagName('link'); // list of matched <link> elements
        var i;                                         // index of the current <link> element
        var x;                                         // an XMLHttpRequest instance

        for (i = 0; i < n.length; i++) switch(true) {
        case n[i].getAttribute('rel') !== 'stylesheet':
        case n[i].getAttribute('href') == null:
        case n[i]._hasSelectorApplied:
            continue;

        default:
            x = new XMLHttpRequest();
            x.addEventListener('load', addAliases.bind(null, x, n[i]));
            x.open('GET', n[i].getAttribute('href'), false);
            x.send();
        }
    }

    // This function parses each <style> element's stylesheet.
    // Without it, we'd have no way of finding the :has selectors within <style> elements.
    function parseInlineStylesheets() {
        var n = document.getElementsByTagName('style'); // list of matched <style> elements
        var i;                                          // index of the current <style> element

        for (i = 0; i < n.length; i++) switch(true) {
        case n[i].textContent.trim() === '':
        case n[i]._hasSelectorApplied:
            continue;

        default:
            addAliases({responseText: n[i].textContent}, n[i]);
        }
    }

    // This function finds the :has selectors, and replaces each one with a class alias.
    // It also replaces each <link> element with a <style> element containing the aliases.
    // Without it, we're unable to insert the aliases into the CSS in the appropriate position.
    function addAliases(xhr, oldElem) {
        var newStyle = document.createElement('style'); // <style> element to replace the <link> element
        var r = /[)(}{@;:>+~, ]|\bhas\b/g;              // RegExp to find important symbols within the CSS
        var styleTxt = xhr.responseText;                // the CSS text loaded via AJAX
        var inHasDec = 0;                               // indicates whether we're in a :has declaration
        var inPrnths = 0;                               // indicates whether we're in parentheses
        var inAtSlct = 0;                               // indicates whether we're in an at-rule selector
        var inAtBlck = 0;                               // indicates whether we're in an at-rule block
        var inStyles = 0;                               // indicates whether we're within a style block
        var inPseudo = 0;                               // indicates whether we're within a pseudo element declaration
        var outerBgn = 0;                               // index at which the current selector begins
        var outerEnd = 0;                               // index at which the current selector ends
        var innerBgn = 0;                               // index at which the :has declaration begins
        var innerEnd = 0;                               // index at which the :has declaration's content ends
        var f;                                          // the results of RegExp search

        while (f = r.exec(styleTxt)) switch (f[0]) {
        case '(':
            inPrnths++;
            break;

        case ')':
            if (inHasDec === inPrnths) innerEnd = f.index + 1;
            if (inHasDec === inPrnths) addHasAlias();
            if (inHasDec === inPrnths) inHasDec = 0;
            if (inPrnths) inPrnths--;
            break;

        case '@':
            inAtSlct++;
            break;

        case ';':
            if (inPseudo) inPseudo--;
            if (inAtSlct) inAtSlct--;
            outerBgn = f.index + 1;
            break;

        case '{':
            if (!inAtSlct) inStyles++;
            if (inAtSlct) inAtBlck++;
            if (inAtSlct) inAtSlct--;
            if (inPseudo) inPseudo--;
            break;

        case '}':
            if (inAtBlck) inAtBlck--;
            if (inStyles) inStyles--;
            outerBgn = f.index + 1;
            break;

        case ',':
            if (!inStyles && !inAtSlct && !inAtBlck) outerBgn = f.index + 1;
            if (inPseudo) inPseudo--;
            break;

        case '+':
        case '~':
        case ' ':
        case '>':
            if (inPseudo) inPseudo--;
            break;

        case ':':
            if (!inPrnths && !inStyles && !inAtSlct && !inAtBlck && !inPseudo) outerEnd = f.index;
            if (!inPrnths && !inStyles && !inAtSlct && !inAtBlck && !inPseudo) inPseudo++;
            break;

        case 'has':
            if (inPseudo) inHasDec = inPrnths + 1;
            if (inPseudo) innerBgn = f.index - 1;
            if (inPseudo) inPseudo--;
        }

        oldElem._hasSelectorApplied = true;
        newStyle._hasSelectorApplied = true;
        if (xhr.responseText !== styleTxt) {
            newStyle.appendChild(document.createTextNode(styleTxt));
            oldElem.parentNode.replaceChild(newStyle, oldElem);
        }

        // This function creates a unique alias, replaces the :has declaration with it,
        // and records the :has declaration's outer and inner element selectors.
        // Without it, it's content would be nested within  switch statement.
        function addHasAlias() {
            var L = 5;                                  // the length of the string ':has'
            var A = 'abcdefghijklmnopqrstuvwxyz';       // valid characters for the beginning of a class name
            var n = Math.random() * A.length | 0;       // index determining which of the above characters to use
            var o = styleTxt.slice(outerBgn, outerEnd); // selector for parent element

            r.lastIndex = innerBgn;
            (out2id[o] = out2id[o] || []).unshift(A[n] + (unique++).toString(36));
            (out2in[o] = out2in[o] || []).unshift(styleTxt.slice(innerBgn + L, innerEnd - 1));
            styleTxt = styleTxt.slice(0, innerBgn) + '.' + out2id[o][0] + styleTxt.slice(innerEnd);
        }
    }

    // This function evaluates only the parents of an event target to determine if any match a :has selector declaration.
    // Without it, we're unable to mimic the behavior of the :has selector in response to discrete DOM events.
    function updateParentNodes(event) {
        var i, s;
        var o = event.target;
        var t = event.timeStamp;
        var f = Element.prototype.matches
            || Element.prototype.matchesSelector
            || Element.prototype.oMatchesSelector
            || Element.prototype.msMatchesSelector
            || Element.prototype.mozMatchesSelector
            || Element.prototype.webkitMatchesSelector;

        watcher.off();
        while (o = o.parentElement) for (s in out2in) switch (true) {
        case o._hasSelectorTimeStamp === t:
        case !f.call(o, s):
            continue;

        default:
            o._hasSelectorTimeStamp = t;
            for (i = -1; out2id[s][++i];) updateNode(o, out2in[s][i], out2id[s][i]);
        }

        watcher.on();
    }

    // This function evaluates only the parents of grouped radio buttons to determine if any match a :has selector declaration.
    // Without it, we're unable to mimic the behavior of the :has selector in response to radio button group changes.
    function updateRelatedParentNodes(event) {
        var n;
        var i;
        var o = event.target;
        var t = event.timeStamp;
        var y = o.getAttribute('type');
        var a = o.getAttribute('name');

        switch (true) {
        case a === '':
        case y !== 'radio':
        case !(o instanceof HTMLInputElement):
            updateParentNodes(event);
        }

        n = document.querySelectorAll('input[type=radio][name=' + a + ']');
        for (i = -1; n[++i];) updateParentNodes({target: n[i], timeStamp: t});
    }

    // This function evaluates all elements to determine if any match a :has selector declaration.
    // Without it, we're unable to mimic the behavior of the :has selector in response to broad DOM changes.
    function updateAllNodes() {
        var s, o, i, n;

        watcher.off();
        loadExternalStylesheets();
        parseInlineStylesheets();

        for (s in out2id) {
            o = document.querySelectorAll(s);
            for (i = -1; o[++i];) {
                for (n = -1; out2id[s][++n];) updateNode(o[i], out2in[s][n], out2id[s][n]);
            }
        }

        watcher.on();
    }

    // This function adds/removes a class depending on whether the element matches the :has selector.
    // Without it, we're unable to mimic the behavior of the :has selector.
    function updateNode(node, selector, id) {
        var n;

        node.setAttribute('_' + unique, '');
        n = node.querySelector('[_' + unique + '] ' + selector);
        if (n == null) node.classList.remove(id);
        if (n != null) node.classList.add(id);
        node.removeAttribute('_' + unique);
    }
}());
