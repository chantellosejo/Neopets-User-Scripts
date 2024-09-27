// ==UserScript==
// @name         Neopets - Open Void Essence Maps from JellyNeo Guide
// @namespace    neopets.com
// @version      1.0
// @description  When the Daily Void Essence Page is opened, automatically opens the corresponding maps for the essences on Neopets
// @author       darknstormy
// @license      MIT
// @match        https://www.jellyneo.net/?go=the_void_within&id=essence_collection
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jellyneo.net
// @grant        none
// ==/UserScript==

$(window).load(function(){
    $('.alert-box > .button').each(function () {
        $(this).attr("target", "_blank");
        $(this)[0].click();
    });
});
