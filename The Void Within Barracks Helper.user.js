// ==UserScript==
// @name         Neopets The Void Within Barracks Helper
// @namespace    http://tampermonkey.net/
// @version      2024-09-27
// @description  Expands all the acts by default so you can see all the battle options. Selects difficulty based on defined default value
// @author       darknstormy
// @match        https://www.neopets.com/dome/barracks.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @license      MIT
// @grant        none
// ==/UserScript==

const EASY_DIFFICULTY = ".tvw-fight_difficulty.easyButton"
const MEDIUM_DIFFICULTY = ".tvw-fight_difficulty.advanceButton"
const HARD_DIFFICULTY = ".tvw-fight_difficulty.extremeButton"

// CHANGE THIS IF YOU WANT TO HAVE A DIFFERENT DIFFICULTY LEVEL PRE-SELECTED!! Choose one of the constants above :)
const PRE_SELECT_DIFFICULTY = HARD_DIFFICULTY
const BD_PET_NAME = "PrincessKu"

$(PRE_SELECT_DIFFICULTY).trigger('click')
$(".tvw-act_container.minimize:not(.locked)").toggleClass('minimize', 'maximize')

waitForElement("#tvwBattleConfirmationPopup").then((popup) => {
    let readyButton = popup.find(":button").last()
    if (readyButton) {
        readyButton.click()
    }
    waitForElement("#tvw-fight_petsListContainer div[data-name='" + BD_PET_NAME + "']").then((pet) => {
        pet.click()
        $(".tvw-battle_continueBattle").trigger("click")
    })
})

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
