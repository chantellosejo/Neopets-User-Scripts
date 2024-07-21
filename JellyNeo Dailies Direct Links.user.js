// ==UserScript==
// @name         JellyNeo Direct Dailies Links
// @namespace    http://tampermonkey.net/
// @version      2024-07-2101
// @description  Love JellyNeo's Dailies list, but hate that some of the links take extra work (like unnecessary clicks)? Skip the trouble and go straight to the end!
// @author       darknstormy
// @match        https://www.jellyneo.net/index.php?go=dailies
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jellyneo.net
// @grant        none
// @license      MIT
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// ==/UserScript==

const COCONUT_SHY_DIRECT_LINK_NO_FLASH = "https://www.neopets.com/halloween/process_cocoshy.phtml?coconut=3"
const GERAPTIKUS_TOMB_FINAL_URL = "https://www.neopets.com/worlds/geraptiku/process_tomb.phtml"
const EXPELLIBOX_DIRECT_LINK_NO_FLASH = "https://ncmall.neopets.com/games/giveaway/process_giveaway.phtml"
const DAILY_PUZZLE_SOLUTION = "https://www.jellyneo.net/?go=dailypuzzle"
const TEST_YOUR_STRENGTH_NO_FLASH = "http://www.neopets.com/halloween/strtest/process_strtest.phtml"
const BAGATELLE_NO_FLASH = "http://www.neopets.com/halloween/process_bagatelle.phtml"
const CORKGUN_NO_FLASH = "http://www.neopets.com/halloween/process_corkgun.phtml"
const SECRET_LAB = "https://www.neopets.com/lab2.phtml"

replaceLinks();

function replaceLinks() {
    $("a[href='https://www.neopets.com/halloween/coconutshy.phtml']").attr("href", COCONUT_SHY_DIRECT_LINK_NO_FLASH);
    $("a[href='https://www.neopets.com/worlds/geraptiku/tomb.phtml']").attr("href", GERAPTIKUS_TOMB_FINAL_URL);
    $("a[href='http://ncmall.neopets.com/mall/shop.phtml?page=giveaway']").attr("href", EXPELLIBOX_DIRECT_LINK_NO_FLASH);
    $("a[href='https://ncmall.neopets.com/mall/shop.phtml?page=giveaway']").attr("href", EXPELLIBOX_DIRECT_LINK_NO_FLASH);
    $("a[href='https://www.neopets.com/community/']").attr("href", DAILY_PUZZLE_SOLUTION);
    $("a[href='https://www.neopets.com/halloween/strtest/index.phtml']").attr("href", TEST_YOUR_STRENGTH_NO_FLASH);
    $("a[href='https://www.neopets.com/halloween/bagatelle.phtml']").attr("href", BAGATELLE_NO_FLASH);
    $("a[href='https://www.neopets.com/halloween/corkgun.phtml']").attr("href", CORKGUN_NO_FLASH)
    $("a[href='https://www.neopets.com/lab.phtml']").attr("href", SECRET_LAB)
}
