// ==UserScript==
// @author         darknstormy
// @name           Neopets - Max Till Withdrawal
// @description    Sets withdraw value to amount in till and autofills PIN, so all you have to do is hit enter!
//                 Note: this does expose your PIN to anyone using your computer, so please use this judiciously and not on a shared browser/account/device.
//                 The author is not responsible for any security breaches as a result of you typing your PIN in plaintext into a user script that runs in your browser.
// @include        *://*.neopets.com/market.phtml?type=till
// @license        MIT
// ==/UserScript==

// Put your PIN where the #### are
const PIN = "####"

var d = document;

var np = d.body.innerHTML.match(/You currently have <b>([0-9,\,]*) NP<\/b> in your till./)[1];
np = np.replace(/,/g, '');

if(np == 0) return;

$('[name="amount"]').val(np);

if (d.getElementById("pin_field")) {
   d.getElementById("pin_field").value = PIN
}
