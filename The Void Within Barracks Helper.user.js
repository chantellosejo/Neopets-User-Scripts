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

$(PRE_SELECT_DIFFICULTY).trigger('click')
$(".tvw-act_container.minimize:not(.locked)").toggleClass('minimize', 'maximize')
