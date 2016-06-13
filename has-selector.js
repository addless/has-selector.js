// Polyfill for :has selector.  It replaces each :has declaration with a class alias,
// then uses JS to conditionally add/remove the class to/from DOM elements.
(function () {
    "use strict";

    var basis = Date.now(); // Base number used to create unique ids for each alias
    var outer = [];         // Each entry is a CSS selector corresponding to the outer element
    var inner = [];         // Each entry is a CSS selector corresponding to the inner element
    var alias = [];         // Each entry is a unique class name

    // We want to listen for events, then add/remove the aliases.
    addEventListener("mouseenter", applyAliases);
    addEventListener("mousedown", applyAliases);
    addEventListener("mouseout", applyAliases);
    addEventListener("focusin", applyAliases);
    addEventListener("change", applyAliases);
    addEventListener("click", applyAliases);
    addEventListener("input", applyAliases);
    addEventListener("blur", applyAliases);
    addEventListener("load", applyAliases);
    loadStylesheets();

    // This function loads each <link> element's stylesheet so that we can parse it.
    // Without it, we'd have no way of finding the :has selectors.
    function loadStylesheets() {
        var s = "link[rel=stylesheet][href]"; // Selector matching all <link> elements
        var n = document.querySelectorAll(s); // list of all <link> elements
        var i;                                // index of the current <link> element
        var x;                                // an XMLHttpRequest instance

        for (i = 0; i < n.length; i++) {
            x = new XMLHttpRequest();
            x.addEventListener("load", addAliases.bind(null, x, n[i]));
            x.open("GET", n[i].getAttribute("href"), true);
            x.send();
        }
    }

    // This function finds the :has selectors, and replaces each one with a class alias.
    // It also replaces each <link> element with a <style> element containing the aliases.
    // Without it, we're unable to insert the aliases into the CSS in the appropriate position.
    function addAliases(xhr, link) {
        var s = document.createElement("style"); // <style> element to replace the <link> element
        var r = /[)(}{@;,]|:has\b/g;             // RegExp to find important symbols within the CSS
        var t = xhr.responseText;                // the CSS text loaded via AJAX
        var inHasCls = 0;                        // indicates whether we're in a :has declaration
        var inAtSlct = 0;                        // indicates whether we're in an at-rule selector
        var inAtBlck = 0;                        // indicates whether we're in an at-rule block
        var inParens = 0;                        // indicates whether we're within parentheses
        var inStyles = 0;                        // indicates whether we're within a style block
        var i = 0;                               // index at which the current selector begins
        var h = 0;                               // index at which the :has declaration begins
        var f;                                   // the results of RegExp search

        while (f = r.exec(t)) switch (f[0]) {
        case "(":
            inParens++;
            break;

        case ")":
            if (inParens) inParens--;
            if (!inHasCls || inParens) break;
            inHasCls--;
            addAlias();
            break;

        case "@":
            inAtSlct++;
            break;

        case ";":
            if (inAtSlct) inAtSlct--;
            i = f.index + 1;
            break;

        case "{":
            if (!inAtSlct) inStyles++;
            if (inAtSlct) inAtBlck++;
            if (inAtSlct) inAtSlct--;
            break;

        case "}":
            if (inAtBlck) inAtBlck--;
            if (inStyles) inStyles--;
            i = f.index + 1;
            break;

        case ",":
            if (!inParens && !inStyles && !inAtSlct && !inAtBlck) i = f.index + 1;
            break;

        case ":has":
            h = f.index;
            inHasCls++;
        }

        // This function creates a unique alias, replaces the :has declaration with it,
        // and records the :has declaration's outer and inner element selectors.
        // Without it, it's content would be nested within  switch statement.
        function addAlias() {
            var A = "abcdefghijklmnopqrstuvwxyz"; // valid characters for the beginning of a class name
            var n = Math.random() * A.length | 0; // index determining which of the above characters to use
            var c = A[n] + basis.toString(36);    // unique class name
            var L = 5;                            // the number of characters in the string ":has"

            basis += 1;
            alias.push(c);
            r.lastIndex = h;
            outer.push(t.slice(i, h));
            inner.push(t.slice(h + L, f.index));
            t = t.slice(0, h) + "." + c + t.slice(f.index + 1);
        }

        s.appendChild(document.createTextNode(t));
        link.parentNode.replaceChild(s, link);
    }

    // This function adds/removes classes to/from DOM elements depending on whether they
    // meet the criteria of the :has selector.
    // Without it, we're unable to mimic the behavior of the :has selector.
    function applyAliases() {
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
