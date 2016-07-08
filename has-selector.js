// Polyfill for :has selector.  It replaces each :has declaration with a class alias,
// then uses JS to conditionally add/remove the class to/from DOM elements.
(function () {
    "use strict";

    var unique = Date.now(); // Base number used to create unique ids for each alias
    var outer = [];          // Each entry is a CSS selector corresponding to the outer element
    var inner = [];          // Each entry is a CSS selector corresponding to the inner element
    var alias = [];          // Each entry is a unique class name

    parseInlineStylesheets();
    loadExternalStylesheets();
    addEventListener("load", toggleAliases);
    addEventListener("blur", toggleAliases);
    addEventListener("input", toggleAliases);
    addEventListener("click", toggleAliases);
    addEventListener("change", toggleAliases);
    addEventListener("focusin", toggleAliases);
    addEventListener("mouseout", toggleAliases);
    addEventListener("mousedown", toggleAliases);
    addEventListener("mouseenter", toggleAliases);

    // This function loads each <link> element's stylesheet so that we can parse it.
    // Without it, we'd have no way of finding the :has selectors within <link> elements.
    function loadExternalStylesheets() {
        var s = "link[rel=stylesheet][href]"; // Selector matching <link> elements
        var n = document.querySelectorAll(s); // list of matched <link> elements
        var i;                                // index of the current <link> element
        var x;                                // an XMLHttpRequest instance

        for (i = 0; i < n.length; i++) {
            x = new XMLHttpRequest();
            x.addEventListener("load", addAliases.bind(null, x, n[i]));
            x.open("GET", n[i].getAttribute("href"), true);
            x.send();
        }
    }

    // This function parses each <style> element's stylesheet.
    // Without it, we'd have no way of finding the :has selectors within <style> elements.
    function parseInlineStylesheets() {
        var s = "style[type='text/css']:not(:empty)"; // Selector matching <style> elements
        var n = document.querySelectorAll(s);         // list of matched <style> elements
        var i;                                        // index of the current <style> element

        for (i = 0; i < n.length; i++) {
            addAliases({responseText: n[i].textContent}, n[i]);
        }
    }

    // This function finds the :has selectors, and replaces each one with a class alias.
    // It also replaces each <link> element with a <style> element containing the aliases.
    // Without it, we're unable to insert the aliases into the CSS in the appropriate position.
    function addAliases(xhr, oldStyle) {
        var newStyle = document.createElement("style"); // <style> element to replace the <link> element
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
        case "(":
            inPrnths++;
            break;

        case ")":
            if (inHasDec === inPrnths) innerEnd = f.index + 1;
            if (inHasDec === inPrnths) addHasAlias();
            if (inHasDec === inPrnths) inHasDec = 0;
            if (inPrnths) inPrnths--;
            break;

        case "@":
            inAtSlct++;
            break;

        case ";":
            if (inAtSlct) inAtSlct--;
            outerBgn = f.index + 1;
            break;

        case "{":
            if (!inAtSlct) inStyles++;
            if (inAtSlct) inAtBlck++;
            if (inAtSlct) inAtSlct--;
            break;

        case "}":
            if (inAtBlck) inAtBlck--;
            if (inStyles) inStyles--;
            outerBgn = f.index + 1;
            break;

        case ",":
            if (!inStyles && !inAtSlct && !inAtBlck) outerBgn = f.index + 1;
            break;

        case "+":
        case "~":
        case " ":
        case ">":
            if (inPseudo) inPseudo--;
            break;

        case ":":
            if (!inPrnths && !inStyles && !inAtSlct && !inAtBlck && !inPseudo) outerEnd = f.index;
            if (!inPrnths && !inStyles && !inAtSlct && !inAtBlck && !inPseudo) inPseudo++;
            break;

        case "has":
            if (inPseudo) inHasDec = inPrnths + 1;
            if (inPseudo) innerBgn = f.index - 1;
        }

        // This function creates a unique alias, replaces the :has declaration with it,
        // and records the :has declaration's outer and inner element selectors.
        // Without it, it's content would be nested within  switch statement.
        function addHasAlias() {
            var A = "abcdefghijklmnopqrstuvwxyz"; // valid characters for the beginning of a class name
            var n = Math.random() * A.length | 0; // index determining which of the above characters to use
            var a = A[n] + unique.toString(36);   // unique class name
            var L = 5;                            // the length of the string ":has"

            unique += 1;
            alias.push(a);
            r.lastIndex = innerBgn;
            outer.push(styleTxt.slice(outerBgn, outerEnd));
            inner.push(styleTxt.slice(innerBgn + L, innerEnd - 1));
            styleTxt = styleTxt.slice(0, innerBgn) + "." + a + styleTxt.slice(innerEnd);
        }

        if (xhr.responseText !== styleTxt) {
            newStyle.appendChild(document.createTextNode(styleTxt));
            oldStyle.parentNode.replaceChild(newStyle, oldStyle);
        }
    }

    // This function adds/removes classes to/from DOM elements depending on whether they
    // meet the criteria of the :has selector.
    // Without it, we're unable to mimic the behavior of the :has selector.
    function toggleAliases() {
        var i, n, t, e;

        for (i = 0; i < alias.length; i++) {
            e = document.querySelectorAll(outer[i]);

            for (n = 0; n < e.length; n++) {
                t = !!e[n].querySelector(inner[i]);
                e[n].classList.toggle(alias[i], t);
            }
        }
    }
}());
