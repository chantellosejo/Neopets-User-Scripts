// ==UserScript==
// @name         Neopets Lab Rat Filter
// @namespace    https://greasyfork.org/en/users/798613
// @version      0.1
// @description  Hide all pets except your specified lab rats so you don't accidentally zap them!
// @author       darknstormy
// @match        http*://www.neopets.com/lab2.phtml
// @icon         https://www.google.com/s2/favicons?domain=neopetsclassic.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const LAB_RATS = ["YourLabRatPetNameGoesHere", "AnotherLabRatPetName"]

    waitForElement('form[action="process_lab2.phtml"]').then(form => {
        form.find("input").filter(
            function() {
                // Do not hide the submit button or any lab rats
                return $(this).attr('type') !== "submit" && $.inArray($(this).val(), LAB_RATS) === -1
            }).parent().hide()
    });
})();


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
