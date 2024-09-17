// ==UserScript==
// @name         Kitchen Quest Shop Wizard Helper
// @namespace    neopets.com
// @version      1.0
// @description  Adds a button for each requested ingredient in a Kitchen Quest for fast Shop Wizard searches.
// @author       darknstormy
// @match        http*://www.neopets.com/island/kitchen.phtml
// @grant        none
// @license      MIT
// ==/UserScript==

$(document).ready(function(){
    let openShopWizard = (it) => {
        window.open(`https://www.neopets.com/shops/wizard.phtml?string=${it.replaceAll(" ","+")}`, '_blank')
    }

    let searchSuperShopWizard = (it) => {
        if ($('#ssw__2020').is(':hidden')) {
            $('.navsub-ssw-icon__2020').click()
        }
        $('.ssw-search__2020 #searchstr').val(it)
        $('#ssw-button-search .button-search-white__2020').click()
    }

    $('.ingredient-grid div').each(function() {
        let name = $(this).find('p').text()
        console.log("Found KQ item: " + name)

        $(this).append('<div style="width: auto; margin: 0 auto;"><button id="sw" style="display: inline-block; margin-right: 20px;">SW</button><button id="ssw" style="display: inline-block; margin-right: 20px;">SSW</button></div>')

        let swb = $(this).find('#sw')

        swb.on('click', () => { openShopWizard(name) });

        let sswb = $(this).find('#ssw')
        sswb.on('click', () => { searchSuperShopWizard(name) });
    })
});
