// ==UserScript==
// @name         Neopets SSW Always Use Identical Match
// @namespace    neopets.com
// @version      1.0
// @description  Set SSW to always use "Identical to my phrase" option
// @author       darknstormy
// @match        http://www.neopets.com/*
// @match        https://www.neopets.com/*
// @match        https://neopets.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==


var d = document

var sswCriteria = d.getElementById("ssw-criteria")

if (sswCriteria) {
    sswCriteria.value = 'exact'
}
