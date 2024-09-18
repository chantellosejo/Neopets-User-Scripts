// ==UserScript==
// @name         Kitchen Quest Shop Wizard Helper
// @namespace    neopets.com
// @version      1.1
// @description  Adds a button for each requested ingredient in a Kitchen Quest for fast Shop Wizard searches.
// @author       darknstormy
// @match        http*://www.neopets.com/island/kitchen.phtml
// @grant        none
// @license      MIT
// ==/UserScript==

function openShopWizardPage(itemName) {
    window.open(`https://www.neopets.com/shops/wizard.phtml?string=${itemName.replaceAll(" ","+")}`, '_blank')
}

function searchUsingSuperShopWizard(itemName) {
    openSSW()
    $('.ssw-search__2020 #searchstr').val(itemName)
    $('#ssw-button-search .button-search-white__2020').click()

}

function openSSW() {
   if ($('#ssw__2020').is(':hidden')) {
       $('.navsub-ssw-icon__2020').click()
   }
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

$(document).ready(function() {
    waitForElement('.ingredient-grid').then(it => {
        it.children('div').each(function() {
            $(this).css("border", "4px solid lightgray")
            $(this).css("border-radius", "10px")
            $(this).css("padding", "16px")
            $(this).css("margin-right", "8px")
            let nameElement = $(this).find('p')
            nameElement.css("min-height", "40px")

            let name = nameElement.text()

            $(this).append('<div style="display: flex; justify-content: space-between;  align-items: center; width: auto"><button id="sw" class="button-default__2020 button-yellow__2020" style="display: inline; width: 50%; margin: 8px;">SW</button><button id="ssw" class="button-default__2020 button-yellow__2020" style="display: inline; width: 50%; margin: 8px;">SSW</button></div>')

            let swb = $(this).find('#sw')
            swb.on('click', () => { openShopWizardPage(name) });

            let sswb = $(this).find('#ssw')
            sswb.on('click', () => { searchUsingSuperShopWizard(name) });
        })
    })
})
