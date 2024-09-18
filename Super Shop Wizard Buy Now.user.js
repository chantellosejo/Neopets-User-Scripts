// ==UserScript==
// @name         Neopets Super Shop Wizard Buy Now!
// @namespace    neopets.com
// @version      1.0
// @description  Whenever you run a SSW search, this will automatically open the first result in a tab for you!
// @author       darknstormy
// @match        http*://*.neopets.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

// Hello Neopian! For best results, I recommend changing your browser setting to allow tabs
// to be loaded in the background. You can do this by entering:
// `about:config` (without the ``)
// in your toolbar of your browser. Then set browser.tabs.loadDivertedInBackground to "true".
// For Firefox, you'll also want to go to Settings -> General -> Tabs, and make sure to turn off the setting that says "When you open a link, image or media in a new tab, switch to it immediately"

(function() {
    'use strict';

    listenForSswSearches()

    $("#ssw-button-resubmit").on('click', () => {
        $(this).click()
        listenForSswSearches()
    })

    $("#ssw-button-new-search").on('click', () => {
        $(this).click()
        listenForSswSearches()
    })
})();

function listenForSswSearches() {
    // Beta site
    waitForElement(".ssw-results-grid").then((searchResults) => {
        searchResults.find("a:first")[0].click()
    })

    // OG Site
    waitForElement("#ssw-tabs-2 #results_table").then((searchResults) => {
        searchResults.find("a:first")[0].click()
    })
}

function waitForElement(selector) {
    return new Promise(resolve => {
        if ($(selector).is(":visible")) {
            return resolve($(selector));
        }

        const observer = new MutationObserver(mutations => {
            if ($(selector).is(":visible")) {
                observer.disconnect();
                resolve($(selector));
            }
        })

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        })
    })
}
