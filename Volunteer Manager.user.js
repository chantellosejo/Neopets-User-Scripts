// ==UserScript==
// @name         Neopets - The Void Within NeoHospital Volunteer Manager
// @namespace    neopets.com
// @version      1.0
// @description  Finishes any completed shifts, then signs up random pets (excluding ones specified in the script) for a volunteer shift at the NeoHospital. NOTE: this script likely breaks TNT's rules about automation. Proceed at your own risk.
// @match        https://www.neopets.com/hospital/volunteer.phtml
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

// Put any pets you DO NOT want to have volunteer in this array!
const DO_NOT_VOLUNTEER_LIST = [
    "YourBattledomePetNameHere"
]

$(document).ready(function() {
    checkForShifts()
})

function checkForShifts() {
    $("#Act2PaneBtn").click()
    completeFinishedShifts()
}

function completeFinishedShifts() {
    let completeShiftButtonId = $(".vc-fights").find(".vc-fight.finished").find(":button").first().attr("id")

    if (!completeShiftButtonId) {
        signUpForOpenShifts()
        return
    }

    $(`#${completeShiftButtonId}`).click()
    waitForElement("#VolunteerFinishPopup").then((rewardPopup) => {
        rewardPopup.find(":button").first().click()
        completeFinishedShifts() // Attempt to complete any remaining finished shifts
    })
}

function signUpForOpenShifts() {
    let joinShiftButtonId = $(".vc-fights").find(".vc-fight.open"").find(":button").first().attr("id")

    if (!joinShiftButtonId) {
        return
    }

    $(`#${joinShiftButtonId}`).click()
    waitForElement("#VolunteerJoinPopup").then((popup) => {
        let readyButton = popup.find(":button").last()
        if (readyButton) {
            readyButton.click()
            waitForElement("#VolunteerPetList").then((petList) => {
                let eligiblePets = petList.find(".vc-pet:not(.vc-ineligible)").filter(function(i) {
                    return DO_NOT_VOLUNTEER_LIST.indexOf($(this).data("petname") + "") == -1
                })

                // Pick at random!
                let indexOfPickedPet = getRandomIntBetween(0, eligiblePets.length)

                console.log("Selecting eligible pet: " + eligiblePets[indexOfPickedPet] + " at index: " + indexOfPickedPet)
                eligiblePets[indexOfPickedPet].click()
                $("#VolunteerJoinButton").click()
                waitForElement("#VolunteerJoinedPopup").then((popup) => {
                    popup.find(":button").first().click()
                    signUpForOpenShifts() // Attempt to sign up for another open shift, if any exists
                })
            })
        }
    })
}

function getRandomIntBetween(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
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
