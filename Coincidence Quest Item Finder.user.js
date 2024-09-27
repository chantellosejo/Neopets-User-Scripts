// ==UserScript==
// @name         Neopets The Coincidence Quest SSW & SDB Searcher
// @namespace    neopets.com
// @version      1.0
// @description  Adds buttons to check your safety deposit box and shop wizard for requested Coincidence quest items.
// @author       darknstormy
// @match        https://www.neopets.com/space/coincidence.phtml
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

function openShopWizardPage(itemName) {
    window.open(`https://www.neopets.com/shops/wizard.phtml?string=${itemName.replaceAll(" ","+")}`, '_blank')
}

function searchUsingSuperShopWizard(itemName, quantityDesired, priceElement) {
    if ($('#sswmenu .bar-button-selected').is(':hidden')) {
        $('#sswmenu .bar-button').click()
        waitForElement('#sswmenu #searchstr').then(() => {
            onNewSearchSubmitted(itemName, quantityDesired, priceElement)
        })
        return
    }

    if ($('#but2 #button-new-search').is(':visible')) {
        $('#but2 #button-new-search').click()
        waitForElement($("#ssw-tabs-1")).then((tab) => {
             onNewSearchSubmitted(itemName, quantityDesired, priceElement)
        })
        return
    }

    onNewSearchSubmitted(itemName, quantityDesired, priceElement)
}

function onNewSearchSubmitted(itemName, quantityDesired, priceElement) {
    $('#sswmenu #searchstr').val(itemName)
    $('#results_buttons #button-search').click()

     waitForElement("#ssw-tabs-2 #results_table").then((searchResults) => {
        var quantitySearched = 0
        var totalCost = 0

        let lowestPrice = searchResults.find("tr:not(:has(th))").slice(0, 3).each(function () {
            let quantityNeeded = quantityDesired - quantitySearched
            if (quantityNeeded < 1) {
                return
            }

            let price = Number($(this).find('td').last().text().replace(/\D/g, ''))
            let quantityAvailable = Number($(this).find('td').eq(1).text())
            let howManyWillBePurchasedFromThisShop = Math.min(quantityNeeded, quantityAvailable)
            totalCost += price * howManyWillBePurchasedFromThisShop
            quantitySearched += howManyWillBePurchasedFromThisShop
        })

        priceElement.text(totalCost)
        let priceList = GM_getValue("priceList", {})
        priceList[itemName] = totalCost
        GM_setValue("priceList", priceList)
        calculateTotal()
    })
}

function calculateTotal() {
    let priceList = GM_getValue("priceList", {})
    let searchedPrices = $("#questItems #total-cost")
        .get()
        .filter((priceHtmlSpanElement) => {
            return priceHtmlSpanElement.innerHTML.length > 0 })
        .map((priceHtmlSpanElement) => Number(priceHtmlSpanElement.innerHTML))

    let total = searchedPrices.reduce((accumulator, current) => accumulator + current)
    $('#grand-total').text(total)
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
    waitForElement('#questItems').then(it => {
        it.find('tbody').prepend('<tr><th colspan="3" style="padding: 8px;"><p><b>Grand Total for Priced Items: <span id="grand-total"></span> NP</b></p><th></tr>')

        it.find('td').each(function() {
            $(this).css("border", "2px solid gray")
            $(this).css("border-radius", "10px")
            $(this).css("margin-right", "12px")
            $(this).css("padding", "16px")
            $(this).css("width", "100px")
            let text = $(this).text()
            let name = text.substring(1, text.length - 2)
            let qty = Number(text.substring(text.length - 1, text.length))

            console.log("Name of item: " + name)

            $(this).append(`<div style="display: flex; flex-flow: column; align-items: center; width: fit-content;"><button id="sdb" class="shipButtonYellowSmall" style="display: inline; margin-top: 8px; margin-bottom: 8px; font-weight: bold;">Search SDB</button><button id="ssw" class="shipButtonYellowSmall" style="display: inline; margin-bottom: 8px; font-weight: bold;">Search SSW</button><button id="sw" class="shipButtonYellowSmall" style="display: inline; margin-bottom: 8px; font-weight: bold">Search SW</button><div><span id="cost-text">Total Cost: </span><span id="total-cost"></span> NP</div></div>`)

            let totalCostTextSpan = $(this).find("#total-cost")

            let price = GM_getValue("priceList", {})[name]

            if (price) {
                totalCostTextSpan.text(price)
            }

            let swButton = $(this).find('#sw')
            swButton.on('click', () => { openShopWizardPage(name) })

            let sswButton = $(this).find('#ssw')
            sswButton.on('click', () => { searchUsingSuperShopWizard(name, qty, totalCostTextSpan) })

            let sdbButton = $(this).find('#sdb')
            sdbButton.on('click', () => { window.open(`https://www.neopets.com/safetydeposit.phtml?obj_name=${encodeURIComponent(name)}&category=0`, "_blank") })
        })

        calculateTotal()
    })
})
