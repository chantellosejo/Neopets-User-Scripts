// ==UserScript==
// @name         Neopets - Battledome Set Selector (BD+) <MettyNeo>
// @description  Adds a toolbar to define and select up to 5 different loadouts. can default 1 loadout to start as selected. Also adds other QoL battledome features, such as disabling battle animations and auto-selecting 1P opponent.
// @author       Metamagic
// @version      2.8.4
// @icon         https://i.imgur.com/RnuqLRm.png
// @match        https://www.neopets.com/dome/*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_deleteValue
// @downloadURL  https://github.com/Mettymagic/np-userscripts/raw/main/Neopets%20-%20Battledome%20Set%20Selector.user.js
// @updateURL    https://github.com/Mettymagic/np-userscripts/raw/main/Neopets%20-%20Battledome%20Set%20Selector.user.js
// @run-at       document-start
// ==/UserScript==

// Trans rights are human rights ^^
// metty says hi

// Changelog: Fixed a bug with the datetime where you can't use PST/PDT in the wrong daylight savings time period; used America/Los_Angeles instead
// You are free to modify this script for personal use but modified scripts must not be shared publicly without permission.
// Modify aspects of this script at your own risk as modifications that give an advantage are against the Neopets rules.
// Feel free to contact me at @mettymagic on discord for any questions or inquiries. ^^

const HIGHLIGHT_MAX_REWARDS = true //makes the victory box green tinted if you're maxed on items. set to false to disable
const ANIMATION_DELAY = 0 //delay (in ms) before skipping animations. 0 = no animation, -1 = disable animation skip
const HIDE_USELESS_BUTTONS = true //hides the useless chat/animation buttons
const IMPROVE_CHALLENGER_LIST = true //enables the 1P challenger list improvements, such as the favorites list and auto-selection.
const LOOT_DISPLAY = true //displays earned loot in the form of pretty progress bars
const LOOSE_OBELISK_RESTRICTIONS = true //allows the script to be used in obelisk battles if you haven't done your 10 battles or if you haven't earned your max items. honor means nothing compared to convenience.

const MAX_NP = 50000
const MAX_ITEMS = 30
const MAX_PP = 200

//TO-DO:
// - give obelisk opponents own section in BD list


//==========
// constants
//==========

let firstLoad = true

//button colors in rgb
const red = [180, 75, 75]
const blue = [107, 168, 237]
const green = [123, 199, 88]
const yellow = [249, 204, 14]
const magenta = [179, 89, 212]
const gray = [99, 99, 99]
const colormap = [red, blue, green, magenta, yellow]

const nullset = {set: null, name: null, default: null}
const nullautofill = {turn1: null, turn2: null, default: null}

const ROW_COLORS = {
    1: "#a9bad4",
    2: "#cce9eb",
    3: "#cae3cf",
    4: "#e3cbc8",
    5: "#9fb9cc",
    6: "#d6cbc1",
    7: "#e6e4d8",
    8: "#dcd3e3"
}

//=====
// main
//=====

//index page - redirects
if (window.location.href.includes("/dome/index.phtml") || window.location.href === "https://www.neopets.com/dome/" || window.location.href.includes("/dome/?")) {
    window.location.replace("https://www.neopets.com/dome/fight.phtml")
}

let difficulty = null //tracked for obelisk point calculation
let obeliskContribution = 0
let isTVW = false

function isBeginningOfTVWBattle() {
    let waveNumber = $("#introdiv .tvw-fight_waveNumber")

    if (waveNumber && waveNumber.text()) {
        // Wave number text looks like "Wave : #", so if we split on :, then we will end up with an array like
        // ["Wave ", " #"]
        // grab the second element in the array and trim the whitespace from the start,
        // then convert to a number. If it's wave 1, then we've begun a new TVW Battle.
        return Number(waveNumber.text().split(":")[1].trimStart()) === 1
    }

    return false
}

function getObeliskTrack() {
    return GM_getValue(OBELISK_TRACK_KEY, {count: 0, points: 0, date: -1});
}

function checkAndResetTrackers() {
    if (shouldResetDailyLoot()) {
        GM_deleteValue(BD_LOOT_TRACK_KEY)
        GM_deleteValue(BD_TVW_TRACK_KEY)
    }

    if (obeliskWarIsOver(getObeliskTrack().date)) {
        GM_deleteValue(OBELISK_TRACK_KEY)
    }

    if (isBeginningOfTVWBattle()) {
        let tvwTracker = getTvwTrack()
        // Go ahead and credit anything in progress as completed
        // This will catch any edge cases where for some reason the previous battle was disrupted
        tvwTracker.completedBattlePoints += tvwTracker.inProgressBattlePoints
        console.log(`[BD+] TVW Battle has begun! Adding points that were in progress from a previous plot battle: ${tvwTracker.inProgressBattlePoints} to make new total: ${tvwTracker.completedBattlePoints}. Then resetting in progress fields...`)
        tvwTracker.inProgressBattlePoints = 0
        tvwTracker.inProgressNp = 0
        tvwTracker.inProgressItems = []
        GM_setValue(BD_TVW_TRACK_KEY, tvwTracker)
        console.log(`[BD+] TVW Battle Stats: Points: ${tvwTracker.completedBattlePoints}, in progress points, np, items: ${tvwTracker.inProgressBattlePoints}, ${tvwTracker.inProgressNp}, ${tvwTracker.inProgressItems}`)
    }
}

//runs on page load
window.addEventListener("DOMContentLoaded", function () {
    //arena page (battle)
    if (window.location.href.includes("/dome/arena.phtml")) {
        checkAndResetTrackers();

        addArenaCSS()
        //adds set selector bar once bd intro disappears
        //the magic happens from there :)
        const introObs = new MutationObserver(mutations => {
            introbreak:
                for (const mutation of mutations) {
                    for (const removed of mutation.removedNodes) {
                        if (removed.id === "introdiv") {
                            isTVW = isVoidOpponent() //plot stuff
                            difficulty = $("#p2hp")[0].innerHTML
                            addBar() //adds set bar
                            handleRewards() //deals with winning rewards
                            //removes buttons if bar isn't disabled and animations are disabled
                            if (HIDE_USELESS_BUTTONS && (!limitObelisk() && !is2Player()) && ANIMATION_DELAY >= 0) {
                                $("#skipreplay")[0].style.visibility = "hidden"
                                $("#chatbutton")[0].style.visibility = "hidden"
                            }
                            introObs.disconnect() //observation done
                            break introbreak
                        }
                    }
                }
        })
        introObs.observe($("#arenacontainer #playground")[0], {childList: true})
    }

    //fight page (select)
    else if (window.location.href.includes("/dome/fight.phtml") && IMPROVE_CHALLENGER_LIST) {
        applyDefaultNPC()
        applyDefaultPet()
        addFightCSS()
        addTableCollapse()
        modifyTable()
        addStep3Toggle()
        //obelisk npc special case
        let favobnpcs = GM_getValue("favobnpcs", [])
        for (const id of favobnpcs) {
            popObeliskFavorite(id)
        }
    }
})

//TVW stuff
function isVoidOpponent() {
    let url = $("#p2image")[0].style.backgroundImage.slice(4, -1).replace(/"/g, "")
    let regex = new RegExp(`.*?dome\/npcs.*?_tvw\/.*`)
    return regex.test(url)
}

//================
// create elements
//================

const OBELISK_TRACK_KEY = "obelisktrack";

const BD_LOOT_TRACK_KEY = "bdloottrack";

const BD_TVW_TRACK_KEY = "bdtvwtrack";

function getPetHp(hud) {
    return Number(hud.children[5].innerHTML)
}

function getOpponentHp(hud) {
    return Number(hud.children[6].innerHTML)
}

function isTie(hud) {
    return getPetHp(hud) === 0 && getOpponentHp(hud) === 0;
}

function isWin(hud) {
    return getPetHp(hud) > 0 && getOpponentHp(hud) === 0;
}

function isLoss(hud) {
    return getPetHp(hud) === 0 && getOpponentHp(hud) !== 0;
}

const DURATION_FOUR_DAYS = 1000 * 60 * 60 * 24 * 4

function obeliskWarIsOver(lastTrackedObeliskDate) {
    // Obelisk Wars only last for 4 days
    return new Date().valueOf() - lastTrackedObeliskDate > DURATION_FOUR_DAYS;
}

function recordObeliskPointsEarned(hud) {
    let obelisktrack = getObeliskTrack()
    // tracks obelisk contribution
    if (isTie(hud)) obeliskContribution = difficulty * 0.5
    else if (isWin(hud)) obeliskContribution = difficulty * 1.0
    else if (isLoss(hud)) obeliskContribution = difficulty * 0.2

    obelisktrack.count += 1
    obelisktrack.points += obeliskContribution

    if (obelisktrack.date < 0) {
        obelisktrack.date = new Date().valueOf()
    }

    GM_setValue(OBELISK_TRACK_KEY, obelisktrack)
}

function endOfBattle(hud) {
    return hud.children[5].innerHTML <= 0 || hud.children[6].innerHTML <= 0;
}

function shouldResetDailyLoot() {
    return getDate() !== getRecordedLoot().date;
}

function addBar() {
    let bar = document.createElement("div")
    bar.id = "bdsetbar"
    bar.classList.add("bdsetbar", "bdbartext")
    bar.style.fontSize = "24px"
    bar.innerHTML = "(waiting for battle to start)"

    //place bar above status
    let status = $("#statusmsg")[0]
    status.parentNode.insertBefore(bar, status)

    let autofilled = -1 //prevents autofilling twice in same round
    //checks status bar for when turn is ready
    const statusObs = new MutationObserver(_ => {
        if (status.textContent === "Plan your next move...") {
            // populates the bar
            if (firstLoad) {
                bar.innerHTML = ""
                fillBar(bar)
            }
            // after first load, skips animation if not obelisk
            else if (!limitObelisk()) {
                skipAnimation()
            }
            if (autofilled < getRoundCount() && (!limitObelisk() && !is2Player())) {
                autofilled = getRoundCount()
                setDefault()
                if (firstLoad) {
                    skipAnimation(true)
                } //fuck neopets for this one frfr
            }
            firstLoad = false
        }
    })
    statusObs.observe(status, {childList: true})

    // checks hud for when battle is over
    let hud = $("#arenacontainer #playground #gQ_scenegraph #hud")[0]
    const hpObs = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            //battle ends when someone reaches 0 hp
            if (endOfBattle(hud)) {
                //skips final animation
                if (!limitObelisk() && ANIMATION_DELAY >= 0) {
                    skipAnimation()
                }

                if (isObelisk()) {
                    recordObeliskPointsEarned(hud);
                }

                hpObs.disconnect()
                break
            }

        }
    })
    hpObs.observe(hud, {childList: true, subtree: true})
}

//checks to see if bar should be populated before doing that
function fillBar(bar) {
    //script is disabled for obelisk once item limit hit
    if (isObelisk()) {
        if (!limitObelisk()) {
            if (firstLoad) {
                console.log("[BSS] Obelisk battle permitted, honor discarded.")
                console.log("[BSS] Populating BSS bar.")
            } else {
                console.log("[BSS] Refreshing BSS bar.")
            }
            populateBar(bar)

        }
        //hit item limit today, blocked
        else {
            console.log("[BSS] Obelisk battle detected, BSS denied to prevent advantage.")
            bar.innerHTML = "<i>A true warrior enters the battlefield with honor.</i>\n<i><small>The Obelisk rejects those who require assistance in battle. Prove your faction's worth on your own.</small></i>"
        }
    }
    //script is disabled for 2p
    else if (is2Player()) {
        console.log("[BSS] 2P battle detected, BSS disabled.")
        bar.innerHTML = "<i>A true warrior enters the battlefield with honor.</i><i><small>League regulations require you to be on your own in these battles. May fate be by your side.</small></i>"
    } else {
        if (firstLoad) {
            console.log("[BSS] Populating BSS bar.")
        } else {
            console.log("[BSS] Refreshing BSS bar.")
        }
        populateBar(bar)
    }
}

function populateBar(bar) {
    //puts each sets container on the bar
    let bdsetdata = getData("bdsets")
    //in cases where setdata gets set to undefined/null by accident
    if (!bdsetdata) {
        setData("bdsets", clone([nullset, nullset, nullset, nullset, nullset]))
        setData("bdautofill", nullautofill)
        bdsetdata = getData("bdsets")
        window.alert("BSS data corrupted, clearing sets.\nSorry for any inconvenience.")
    }
    bdsetdata.forEach((set, index) => {
        //main container of a set
        let container = document.createElement("div"), options = document.createElement("div")
        //sets element classes
        container.classList.add("bdsetcontainer", "bdbartext")
        container.id = `bdsetc${index}`
        container.style.backgroundColor = getHex(colormap[index])

        let button = makeSetButton(set.name, set.set, index)
        container.appendChild(button)

        //adds option buttons to container
        options.classList.add("bdsetoptioncontainer")
        container.appendChild(options)
        let save = makeSaveButton(index)
        let opt = makeSettingsButton(index)
        //adds label to container
        let defc = document.createElement("div")
        defc.style.textAlign = "right"
        defc.style.marginTop = "2px"
        switch (set.default) {
            case "1":
                defc.innerHTML = "<b>T1</b>"
                break
            case "2":
                defc.innerHTML = "<b>T2</b>"
                break
            case "3":
                defc.innerHTML = "<b>Default</b>"
                break
        }

        options.appendChild(save)
        options.appendChild(opt)
        options.appendChild(defc)

        //adds container to bar
        bar.appendChild(container)
    })

}

//main button to select set
function makeSetButton(name, itemurls, i) {
    //null name means empty set

    //button
    let button = document.createElement("div")
    button.classList.add("bdsetbutton", "bdbarclickable", "setbutton")
    if (name != null) button.classList.add("activebutton")
    else {
        button.style.color = "#949494"
        button.style.backgroundColor = "#DEDEDE"
    }
    if (itemurls != null) {
        button.setAttribute("item1", itemurls[0])
        button.setAttribute("item2", itemurls[1])
        button.setAttribute("ability", itemurls[2])
        button.addEventListener("click", function () {
            useSet(itemurls[0], itemurls[1], itemurls[2], i)
        })
    }

    //icons on top of button
    let icons = document.createElement("div")
    icons.classList.add("bdsetthumbnail")
    if (itemurls != null) {
        itemurls.forEach(url => {
            let iconc = document.createElement("div")
            iconc.classList.add("bdseticoncontainer")
            if (url != null) {
                iconc.innerHTML = `<img src='${url}' class='bdseticon' alt="set icon">`
            }
            icons.appendChild(iconc)
        })
    }
    button.appendChild(icons)

    //title on bottom of button
    let text = document.createElement("div")
    text.classList.add("bdbartext")
    if (name == null) {
        text.innerHTML = "(empty set)"
    } else {
        text.innerHTML = name
    }
    button.appendChild(text)

    return button
}

//button to save set
function makeSaveButton(i) {
    let button = document.createElement("div")
    button.classList.add("bdsetoption", "bdbarclickable", "bdbartext", "activeoption")
    button.index = i
    button.innerHTML = "Save"
    button.addEventListener("click", function () {
        saveNewSet(i)
    })
    return button
}

//button to set autofill options
function makeSettingsButton(i) {
    let button = document.createElement("div")
    button.classList.add("bdsetoption", "bdbarclickable", "bdbartext", "options_btn")
    if (getData("bdsets", i).name != null) {
        button.classList.add("activeoption")
        button.addEventListener("click", function () {
            makeSettingsMenu(i)
        })
    } else {
        button.style.color = "#4C5252"
        button.style.backgroundColor = "#A5B5B5"
    }
    button.index = i
    button.innerHTML = "Options"
    return button
}

//one hell of a function that uses JS to make the setting menu
function makeSettingsMenu(i) {
    closeSettingsMenus() //closes other menus

    let set = getData("bdsets", i)
    let isEmptySet = JSON.stringify(set) === JSON.stringify(nullset)

    //menu box
    let menuc = document.createElement("div")
    menuc.id = "bdsettingsmenu"
    menuc.classList.add("settingswindow")
    menuc.setAttribute("index", i)
    let header = document.createElement("div")
    header.style.display = "flex"
    header.style.justifyContent = "space-between"
    header.style.cursor = "pointer"
    header.style.backgroundColor = getHex(colormap[i])
    header.innerHTML = ` < b > Set ${i + 1}
        Options < /b>`
    header.style.padding = "4px"
    let x = document.createElement("a")
    x.innerHTML = "<b>x</b>"
    x.style.marginRight = "4px"
    x.addEventListener("click", function () {
        closeSettingsMenus(false, i)
    })
    header.append(x)
    let container = document.createElement("div")
    container.classList.add("container-vertical")
    menuc.appendChild(header)
    menuc.appendChild(container)

    //change name
    let namec = document.createElement("div")
    namec.classList.add("container-horizontal")
    let nametext = document.createElement("div")
    nametext.innerHTML = "Name:"
    let namebox = document.createElement("INPUT")
    namebox.id = "setname"
    namebox.type = "text"
    namebox.style.width = "65%"
    if (set.name == null) namebox.value = "(empty set)"
    else namebox.value = set.name
    //adjusts name length to fit
    namebox.addEventListener("focus", function () {
        namebox.setAttribute("old", namebox.value)
    })
    namebox.addEventListener("blur", function () {
        namebox.value = namebox.value.substring(0, 12);
        if (namebox.value.length < 3) {
            window.alert("ERROR: The name is too short! (3-12 characters)")
            namebox.value = namebox.getAttribute("old")
        }
    })
    if (isEmptySet) namebox.disabled = true
    namec.appendChild(nametext)
    namec.appendChild(namebox)
    container.appendChild(namec)

    //change autofill settings
    let defc = document.createElement("div")
    defc.classList.add("container-horizontal")
    let deftext = document.createElement("div")
    deftext.innerHTML = "Autofill:"
    let defselect = createSelect(i, set)
    if (isEmptySet) defselect.disabled = true
    defc.appendChild(deftext)
    defc.appendChild(defselect)
    container.appendChild(defc)

    //delete
    let del = document.createElement("BUTTON")
    del.innerHTML = "Delete Set"
    del.style.marginRight = "0"
    del.style.marginLeft = "auto"
    del.style.width = "120px"
    //disabled if empty set
    if (isEmptySet) del.disabled = true
    else {
        del.addEventListener("click", function () {
            if (deleteSet(i)) {
                closeSettingsMenus(false, i)
                window.alert(`Set ${i + 1} successfully deleted.`)
            }
        })
    }
    container.appendChild(del)

    let div = document.createElement("div")
    div.style.height = "12px"
    container.appendChild(div)

    //close menu
    let close = document.createElement("BUTTON")
    close.innerHTML = "Save Changes"
    close.addEventListener("click", function () {
        closeSettingsMenus(true, i)
    })
    container.appendChild(close)

    $("#arenacontainer")[0].parentElement.appendChild(menuc)
}

//saves and closes the setting menu
function closeSettingsMenus(save, i) {
    let menu = $("#bdsettingsmenu")[0]
    if (menu === undefined) return
    //save changes
    if (save) {
        //check for differences
        let previousSet = getData("bdsets", i)
        let name = $("#bdsettingsmenu #setname")[0].value
        let autofill = $("#bdsettingsmenu #setautofill")[0].value
        //if no differences, do nothing
        if (name === previousSet.name && autofill === previousSet.default)
            window.alert("No changes were saved.")
        //if differences, update the set
        else {
            previousSet.name = name
            previousSet.default = autofill
            updateStoredSet(i, previousSet, true)
        }
    }
    //remove setting menu
    menu.innerHTML = ""
    menu.remove()
}

function createSelect(i, set) {
    let afset = getData("bdautofill")

    let defselect = document.createElement("SELECT")
    defselect.id = "setautofill"
    //options
    let o1 = document.createElement("OPTION"), o2 = document.createElement("OPTION"),
        o3 = document.createElement("OPTION"), o4 = document.createElement("OPTION")
    o1.value = null
    o1.label = "Never"
    o1.innerHTML = "Never"
    o2.value = 1
    o2.label = "First Turn"
    o2.innerHTML = "First Turn"
    if (afset.turn1 != null && afset.turn1 !== i) o2.disabled = true
    o3.value = 2
    o3.label = "Second Turn"
    o3.innerHTML = "Second Turn"
    if (afset.turn2 != null && afset.turn2 !== i) o3.disabled = true
    o4.value = 3
    o4.label = "Default"
    o4.innerHTML = "Default"
    if (afset.default != null && afset.default !== i) o4.disabled = true

    //adds options
    defselect.appendChild(o1)
    defselect.appendChild(o2)
    defselect.appendChild(o3)
    defselect.appendChild(o4)

    //sets default value
    defselect.value = set.default
    console.log(defselect)
    return defselect
}

//=====================
// button functionality
//=====================

//selects items from saved set
function useSet(item1, item2, ability, i) {
    //clears slots before selecting
    clearSlots()
    let error = false //doesnt check rest of slots if error encountered

    //item 1
    if (item1 != null) error = selectSlot($("#arenacontainer #p1e1m")[0], item1)
    //item 2
    if (item2 != null && !error) {
        // selects second available if 2 of same item chosen
        if (item1 === item2) error = selectSlot($("#arenacontainer #p1e2m")[0], item2, 2)
        else error = selectSlot($("#arenacontainer #p1e2m")[0], item2)
    }
    //ability
    if (ability != null && !error) selectSlot($("#arenacontainer #p1am")[0], ability)

    console.log(`[BSS] Set ${i} applied.`)
}

//save current selection to set
function saveNewSet(i) {
    let oldset = getData("bdsets", i)
    let newset = getCurrentItems()

    //if the new set is empty
    if (JSON.stringify(newset) === JSON.stringify([null, null, null])) {
        window.alert("ERROR: You cannot save an empty set!")
        return
    }
    //if there are no changes
    else if (JSON.stringify(oldset.set) === JSON.stringify(newset)) {
        window.alert("ERROR: There are no changes to save!")
        return
    } else if (JSON.stringify(oldset) !== JSON.stringify(nullset)) {
        if (!window.confirm("WARNING: Are you sure you wish to update your previous set?")) return
    }

    //creates new set object
    let bdset = {set: newset, name: oldset.name, default: oldset.default}

    //choose a name if no name
    if (oldset.name == null) {
        let n = prompt("Enter a name for the set:", `Weapon Set ${i + 1}`)
        if (n == null) return
        while (n.length < 3 || n.length > 12) {
            n = prompt("ERROR: Name must be between 3-12 chars!\nEnter a name for the set:", `Weapon Set ${i + 1}`)
        }
        bdset.name = n
    }

    updateStoredSet(i, bdset)
    console.log(`[BSS] Set slot ${i} saved.`)
    updateBar()
}

function clearSlots() {
    let e1 = $("#arenacontainer #p1e1m")[0]
    e1.children[1].style.opacity = "1"
    if (e1.classList.contains("selected")) e1.click()
    let e2 = $("#arenacontainer #p1e2m")[0]
    if (e2.classList.contains("selected")) e2.click()
    e2.children[1].style.opacity = "1"
    let a = $("#arenacontainer #p1am")[0]
    a.children[1].style.opacity = "1"
    if (a.classList.contains("selected")) {
        a.click()
        $("#arenacontainer #p1ability")[0].style.display = "none"
    }
}

//=================
// helper functions
//=================

async function skipAnimation(ignoreDelay = false) {
    let d = ANIMATION_DELAY
    if (ignoreDelay) d = 0

    if (d === 0) {
        pressSkipButton()
        if (firstLoad) console.log(`[BSS] First animation cancelled.`)
        else console.log(`[BSS] Animation cancelled.`)
    } else if (d > 0) {
        setTimeout(pressSkipButton, d)
        setTimeout(() => {
            console.log(`[BSS] Animation skipped after ${d}ms.`)
        }, d)
    }
}

function pressSkipButton() {
    let button = $("#arenacontainer #skipreplay")[0]
    button.click()
}

function applyDefaultSet(i) {
    let set = getData("bdsets", i).set
    if (set == null) {
        setData("bdautofill", nullautofill)
        window.alert("BSS data corrupted, clearing autofill settings.\nSorry for any inconvenience.")
        return
    }
    useSet(set[0], set[1], set[2], i)
    console.log(`[BSS] Set ${i} autofilled.`)
}

//selects the default set
function setDefault() {
    let round = getRoundCount()
    let autofill = getData("bdautofill")

    if (round === 1 && autofill.turn1 != null) applyDefaultSet(autofill.turn1)
    else if (round === 2 && autofill.turn2 != null) applyDefaultSet(autofill.turn2)
    else if (autofill.default != null) applyDefaultSet(autofill.default)
}

//gets the selection id from an item's image url
//selects the nth occurrence of the item (defaults to first)
function getItemInfo(url, n = 1) {
    let info = null
    let items = $("#arenacontainer #p1equipment")[0].children[2].getElementsByTagName("li")
    let count = 0
    //iterates through each item in bd menu (even if its hidden it still exists)
    for (const item of items) { //each column
        if (item.children[0].src === url) {
            count++
            if (count === n) {
                info = {id: item.children[0].id, name: item.children[0].alt, node: item.children[0]}
                break
            }
        }
    }
    return info
}

//for some reason ability list is a table whereas item lists aren't??
function getAbilityInfo(url) {
    let info = null
    let table = $("#arenacontainer #p1ability")[0].children[2].children[0].getElementsByTagName("td")

    for (const node of table) {
        if (node.getAttribute("title") != null) {
            //we found our node
            let nodeUrl = node.children[0].innerHTML.match(/img src="(.*?)"/)[1]
            //sometimes image links dont include 'https:' for some reason
            if (!nodeUrl.includes("https:")) {
                nodeUrl = "https:" + nodeUrl
            }
            if (nodeUrl === url) {
                //ability on cd
                if (node.children[0].classList.contains("cooldown")) info = -1
                else info = {id: node.children[0].getAttribute("data-ability"), name: node.title, node: node}
                break
            }
        }
    }

    return info
}

//sets a bd item to a saved slot's item
function selectSlot(slot, item, n = 1) {
    let isAbility = slot.id === "p1am"
    let info = null
    if (isAbility) {
        info = getAbilityInfo(item, n)
    } else {
        info = getItemInfo(item, n)
    }
    if (info === -1 && isAbility) {
        window.alert("WARNING: The selected ability is on cooldown and has not been selected!")
        return true
    }
    if (info == null) {
        window.alert(`ERROR: Tried to assign item not equipped to pet!\nURL of missing item: ${item}`)
        return true
    }

    let slotid = slot.id.slice(0, -1)
    $(`#arenacontainer #${slotid}`)[0].value = info.id

    //updates slot icon
    slot.classList.add("selected")
    slot.children[1].style.backgroundPosition = "0px 0px"
    slot.children[1].style.backgroundSize = "60px 60px"
    slot.children[1].style.backgroundImage = `url("${item}")`
    if (!isAbility) {
        slot.addEventListener("click", function () {
            info.node.removeAttribute("style")
        })
        info.node.style.display = "none"
    }

    return false
}


//remove and re-adds bar to update visuals
function updateBar() {
    let bar = $("#bdsetbar")[0]
    bar.innerHTML = ""
    fillBar(bar)
}

//returns array of currently selected stuff from arena
function getCurrentItems() {
    return [getItemURL($("#arenacontainer #p1e1m")[0]),
        getItemURL($("#arenacontainer #p1e2m")[0]),
        getItemURL($("#arenacontainer #p1am")[0], true)]
}


//==================
// challenger select
//==================

function applyDefaultPet() {
    let name = GM_getValue("skiptopet")
    if (name) {
        let icon = $(`#bxlist > li > div.petThumbContainer[data-name="${name}"]`)
        if (icon.length === 0) {
            GM_deleteValue("skiptopet")
            console.log(`[BD+] Pet ${name} not found, pet selection cleared.`)
        } else {
            console.log(`[BD+] Skipping to Step 3 with pet ${name}.`)
            //1ms delay added between clicks
            icon[0].click()
            setTimeout(() => {
                $("#bdFightStep1 > div.nextStep").click()
            }, 1)
            setTimeout(() => {
                $("#bdFightStep2 > div.nextStep").click()
            }, 2)
        }
    }
}

function applyDefaultNPC() {
    let npc = GM_getValue("defnpc")
    let applyDefault = true //to prevent it from being applied multiple times
    const obs = new MutationObserver(_ => {
        if ($("#bdFightStep3").css("display") === "block" && applyDefault) {
            if (npc) {
                console.log("[BD+] Default challenger selected.")
                $(`#npcTable tr.npcRow.favorite.default div.tough[data-tough="${npc.diff}"`)[0].click()
            }
            applyDefault = false
        } else {
            applyDefault = true
        }
    })
    obs.observe($("#bdFightStep3")[0], {attributes: true})
}

function step3Toggle() {
    return $("#step3toggle > label > input")[0];
}

function addStep3Toggle() {
    let div = document.createElement("div")
    div.id = "step3toggle"
    div.innerHTML = "Automatically select this pet for 1P"
    let toggle = document.createElement("label")
    toggle.classList.add("switch")
    toggle.innerHTML = `<input type="checkbox"><span class="slider round"></span>`
    if (GM_getValue("skiptopet")) toggle.querySelector("input").checked = true
    //records pet name
    toggle.addEventListener("click", (event) => {
        //overrides default behavior
        event.stopPropagation()
        event.preventDefault()
        let toggled = !(step3Toggle().checked)
        step3Toggle().checked = toggled

        if (toggled) {
            let name = $(`#bdFightPetInfo > div.petInfoBox[style="display: block;"]`)[0].getAttribute("data-name")
            GM_setValue("skiptopet", name)
            console.log(`[BD+] Set to automatically select ${name} next time.`)
        } else {
            GM_deleteValue("skiptopet")
            console.log(`[BD+] Removed automatic pet selected.`)
        }
    })
    //updates recorded pet name if pet is swapped
    $("#bxlist")[0].addEventListener("click", (event) => {
        if ((event.target.tagName.toLowerCase() === "div" || event.target.tagName.toLowerCase() === "img") && step3Toggle().checked) {
            let name = $(`#bdFightPetInfo > div.petInfoBox[style="display: block;"]`)[0].getAttribute("data-name")
            GM_setValue("skiptopet", name)
            console.log(`[BD+] Set to automatically select ${name} next time.`)
        }
    })
    div.appendChild(toggle)
    $("#bdFightStep1")[0].appendChild(div)
}

function addTableCollapse() {
    let collapse = document.createElement("div")
    collapse.classList.add("npccollapse")
    //starts collapsed if user has any favorites
    if (GM_getValue("favnpcs", []).length > 0) {
        $("#bdFightStep3UI > div.npcContainer")[0].classList.add("collapsed")
        collapse.innerHTML = "▼"
    } else {
        collapse.innerHTML = "▲"
        collapse.style.display = "none"
    }
    //toggles between all and favorites on click
    collapse.addEventListener("click", () => {
        //expand
        let bdFightStep3UI = $("#bdFightStep3UI > div.npcContainer")
        if (bdFightStep3UI[0].classList.contains("collapsed")) {
            bdFightStep3UI[0].classList.remove("collapsed")
            $(".npccollapse")[0].innerHTML = "▲"
        }
        //retract
        else {
            bdFightStep3UI[0].classList.add("collapsed")
            $(".npccollapse")[0].innerHTML = "▼"
        }
        //recalculate height - from page source code
        let tableHeight = $("#npcTable").outerHeight();
        let bdFightTable = $('#bdFight')
        bdFightTable.css('min-height', tableHeight + 257);
        let containerHeight = bdFightTable.outerHeight();

        $('#bdFightStepContainer').css('min-height', containerHeight + -60);
        $('#bdFightStep3').css('min-height', containerHeight + -63);
        $('#bdFightBorderExpansion').css('min-height', containerHeight + -263);
        $('#bdFightBorderBottom').css('top', containerHeight + -18);
    })
    $("#domeTitle")[0].appendChild(collapse)
}

//sorts the "better" domes first
function getDomePriority(id) {
    switch (id) {
        case 1:
            return 6
        case 2:
            return 3
        case 3:
            return 7
        case 4:
            return 2
        case 5:
            return 1
        case 6:
            return 5
        case 7:
            return 4
        case 8:
            return 0
        default:
            return 10
    }
}

function getDifficulty(tr) {
    return tr.querySelector("td.diff").getAttribute("data-diffs").replaceAll(",", "").split(";").map(Number)
}

function compareDifficulty(a, b) {
    let da = getDifficulty(a), db = getDifficulty(b)
    for (let i = 0; i < 3; i++) {
        let n = da[i] - db[i]
        if (n !== 0) return n
    }
    return 0
}

function modifyTable() {
    //gets and sorts rows
    let rows = Array.from($("#npcTable > tbody > tr.npcRow"))
    rows.sort((a, b) => {
        let t = getDomePriority(+a.getAttribute("data-domeid")) - getDomePriority(+b.getAttribute("data-domeid"))
        if (t === 0) return compareDifficulty(a, b) //sorts by difficulties within its row
        else return t
    })
    let table = $("#npcTable > tbody")[0]
    table.innerHTML = ""

    //modifies each row and adds it back
    for (const row of rows) {
        table.appendChild(modifyRow(row))
    }
}

function isObeliskNPC(tr) {
    let style = tr.querySelector("td.image > div").getAttribute("style")
    for (const tag of OBELISK_TAGS) {
        if (style.includes(tag)) {
            let regex = new RegExp(`.*?dome\/npcs.*?${tag}(\\d).*`)
            return style.match(regex)[1]
        }
    }
    return undefined
}

function popObeliskFavorite(obeliskId) {
    //add to favorites list
    if (GM_getValue("favobnpcs", []).includes(obeliskId)) {
        let list = Array.from($("#npcTable tr.npcRow:not(.favorite)")).filter((tr) => {
            let notFavoriteNpcId = isObeliskNPC(tr)
            return notFavoriteNpcId === obeliskId
        })
        for (let tr of list) {
            tr.classList.add("favorite")
        }
    }
    //remove from favorites list
    else {
        let list = Array.from($("#npcTable tr.npcRow.favorite")).filter((tr) => {
            let favoriteNpcId = isObeliskNPC(tr)
            return favoriteNpcId === obeliskId
        })
        for (let tr of list) {
            tr.classList.remove("favorite")
        }
    }
}

function modifyRow(tr) {
    //adds favorite button
    let fav = document.createElement("div")
    fav.classList.add("fav")
    //updates favorite list on click
    fav.addEventListener("click", (event) => {
        const target = event.target || event.srcElement
        const oppID = target.parentElement.getAttribute("data-oppid")
        let favNPCs = GM_getValue("favnpcs", [])

        //favorites list, sets default
        if ($("#bdFightStep3UI > div.npcContainer.collapsed").length > 0) {
            //make new default
            if (!target.parentElement.classList.contains("default")) {
                //get toughness selected
                let diff = target.parentElement.querySelector("div.tough.selected")?.getAttribute("data-tough")
                if (!diff) window.alert("You must select a difficulty to set this challenger as your default!")
                else {
                    //remove any other defaults
                    let defaultFavorite = $("tr.npcRow.favorite.default")
                    if (defaultFavorite.length > 0) {
                        defaultFavorite[0].classList.remove("default")
                    }
                    //sets new default
                    target.parentElement.classList.add("default")
                    GM_setValue("defnpc", {id: tr.getAttribute("data-oppid"), diff: diff})
                    console.log(`[BD+] NPC ID ${oppID} at difficulty ${diff} set as default.`)
                }
            }
            //remove default
            else {
                target.parentElement.classList.remove("default")
                GM_deleteValue("defnpc")
                console.log(`[BD+] Default NPC removed.`)
            }
        } else {
            //remove as favorite
            let obeliskId = target.parentElement.getAttribute("obelisk-id")

            if (target.parentElement.classList.contains("favorite")) {
                //special case for obelisk challenger
                if (obeliskId) {
                    let favobnpcs = GM_getValue("favobnpcs", [])
                    let i = favobnpcs.indexOf(obeliskId);
                    if (i !== -1) {
                        favobnpcs.splice(i, 1);
                    }
                    GM_setValue("favobnpcs", favobnpcs)
                    popObeliskFavorite(obeliskId)
                } else {
                    let i = favNPCs.indexOf(oppID);
                    if (i !== -1) {
                        favNPCs.splice(i, 1);
                    }
                    GM_setValue("favnpcs", favNPCs)
                    target.parentElement.classList.remove("favorite")
                    //also removes as a default
                    if (target.parentElement.classList.contains("default")) {
                        target.parentElement.classList.remove("default")
                        GM_deleteValue("defnpc")
                    }
                }
            }
            //add to favorites
            else {
                //special case for obelisk challenger
                if (obeliskId) {
                    let favobnpcs = GM_getValue("favobnpcs", [])
                    favobnpcs.push(obeliskId)
                    GM_setValue("favobnpcs", favobnpcs)
                    popObeliskFavorite(obeliskId)
                } else {
                    favNPCs.push(oppID)
                    GM_setValue("favnpcs", favNPCs)
                    target.parentElement.classList.add("favorite")
                }
            }

            let collapsedDiv = $("div.npccollapse")[0]
            if (favNPCs.length === 0) {
                collapsedDiv.style.display = "none"
            } else {
                collapsedDiv.style.display = "block"
            }
        }
    })
    tr.appendChild(fav)

    //remembers settings
    if (GM_getValue("favnpcs", []).includes(tr.getAttribute("data-oppid"))) tr.classList.add("favorite")
    if (GM_getValue("defnpc")?.id?.includes(tr.getAttribute("data-oppid"))) tr.classList.add("default")

    //marks obelisk npcs
    let n = isObeliskNPC(tr)
    if (n) tr.setAttribute("obelisk-id", n)

    //tints row
    tr.style.backgroundColor = ROW_COLORS[+tr.getAttribute("data-domeid")]

    return tr
}

//===============
// data functions
//===============

//'deletes' a set by making it nullset
function deleteSet(i) {
    let select = window.confirm("WARNING: Are you sure you want to delete this set?")
    if (select) {
        let sets = getData("bdsets")
        sets[i] = nullset
        setData("bdsets", sets)
        updateBar()
        console.log(`[BSS] Set ${i} deleted.`)
    }
    return select
}

//updates set at index i
function updateStoredSet(i, newset, updateAutofill = false) {
    //updates stored set
    let sets = getData("bdsets")
    sets[i] = newset
    setData("bdsets", sets)
    //updates autofill
    if (updateAutofill) {
        let autofill = getData("bdautofill")
        //remove index from autofill
        if (autofill.turn1 === i) autofill.turn1 = null
        else if (autofill.turn2 === i) autofill.turn2 = null
        else if (autofill.default === i) autofill.default = null
        //add to autofill
        switch (newset.default) {
            case "1":
                autofill.turn1 = i
                break;
            case "2":
                autofill.turn2 = i
                break;
            case "3":
                autofill.default = i
                break;
        }
        //saves new autofill
        setData("bdautofill", autofill)
    }
    updateBar()
}

//keeps support from cookies
function getData(tag, i = null) {
    if (tag === "bdsets") {
        let ns = clone([nullset, nullset, nullset, nullset, nullset])

        //still supports browser cookies to prevent set wipes
        let cookie = window.localStorage.getItem("bdsets")
        if (cookie != null) {
            if (i != null) return JSON.parse(JSON.parse(cookie)[i])
            else {
                let arr = JSON.parse(cookie)
                for (i = 0; i < 5; i++) {
                    arr[i] = JSON.parse(arr[i])
                }
                return arr
            }
        } else {
            if (i != null) return GM_getValue("bdsets", ns)[i]
            else return GM_getValue("bdsets", ns)
        }
    } else if (tag === "bdautofill") {
        //still supports browser cookies to prevent set wipes
        let cookie = window.localStorage.getItem("bdautofill")
        if (cookie != null) return JSON.parse(cookie)
        else return GM_getValue("bdautofill", clone(nullautofill))
    } else {
        return GM_getValue(tag, null)
    }
}

//clears cookies if they exist to convert over to script storage
function setData(tag, value) {
    window.localStorage.removeItem(tag)
    GM_setValue(tag, value)
}

//================
// misc. functions
//================

function getRoundCount() {
    return Number($("#logheader #flround")[0].innerHTML)
}

//used for legitimacy checks to disable in areas that give advantage
const OBELISK_TAGS = [
    "_order",
    "_thief",
    "_awakened",
    "_seekers",
    "_brute",
    "_sway"
]
const GUILD_MAP = {
    "_order": "Order",
    "_thief": "Thieves",
    "_awakened": "Awakened",
    "_seekers": "Seekers",
    "_brute": "Brutes",
    "_sway": "Sway"
}

function isObelisk() {
    let p2 = $("#arenacontainer #playground #gQ_scenegraph #p2 #p2image")[0]
    let url = p2.style.backgroundImage
    let res = null
    for (const tag of OBELISK_TAGS) {
        if (url.includes(tag)) {
            res = GUILD_MAP[tag]
            break
        }
    }
    return res
}

//reads the reward screen
function handleRewards() {
    const lootObs = new MutationObserver(_ => {
        lootObs.disconnect()
        let rewardCount = countRewards() //counts and records rewards earned

        if (LOOT_DISPLAY) {
            addLootBars()
            addRewardList()

            if (rewardCount === 0) {
                addEmptyDisplay()
            }
        }

        if (hitItemLimit()) {
            highlightItemLimit()
        }

        addObeliskContribution()
    })
    lootObs.observe($("#arenacontainer #bdPopupGeneric-winnar #bd_rewards")[0], {childList: true, subtree: true})
}

const HIGH_VALUE_LIST = ["armoured negg", "frozen negg", "bubbling fungus", "chocolate ice cream"]
const RED_LIST = ["cui codestone", "kew codestone", "mag codestone", "sho codestone", "vux codestone", "zed codestone"]

function rewardSort(name) {
    name = name.toLowerCase()
    if (name.includes("nerkmid")) return 50
    else if (HIGH_VALUE_LIST.includes(name)) return 40
    else if (name.includes("codestone")) {
        if (RED_LIST.includes(name)) return 30
        else return 20
    } else if (name.includes("dubloon coin")) return 10 + dubloonSort(name)
    else if (name.includes("neocola token")) return 10
    else return 0
}

function dubloonSort(name) {
    if (name === "one dubloon coin") return 1
    else if (name === "two dubloon coin") return 2
    else if (name === "five dubloon coin") return 3
    else if (name === "ten dubloon coin") return 4
    else return 0
}

function addRewardList() {
    let list = getRecordedLoot().items
    let table = document.createElement("table")
    table.id = "bdlootdisplay"
    let tbody = table.appendChild(document.createElement("tbody"))
    let th = document.createElement("th")
    th.innerHTML = "Today's Prizes"
    let copy = document.createElement("a")
    copy.innerHTML = "(copy)"
    copy.style = "position:absolute; display: block; top: 5px; right: 5px; font-size: 6pt; color: blue; cursor: pointer;"
    //copies the formatted item list for convenience
    copy.addEventListener("click", (event) => {
        let str = "__Battledome Prizes - " + getDate() + "__\n"
        for (const tr of Array.from($("#bdlootdisplay tr"))) {
            if (tr.getAttribute("style")) str += "*"
            str += tr.querySelector("td").innerHTML
            if (tr.getAttribute("style")) str += "*"
            str += "\n"
        }
        navigator.clipboard.writeText(str.trim());
        event.target.innerHTML = "(copied!)"
        console.log("[BD+] Copied prize list to clipboard.")
    })
    th.appendChild(copy)
    tbody.appendChild(th)

    //sorts reward list
    let items = Object.keys(list)
    items.sort((a, b) => {
        let t = rewardSort(b) - rewardSort(a)
        if (t === 0) return b.localeCompare(a)
        else return t
    })

    //empty list
    if (items.length === 0) {
        let row = document.createElement("tr")
        let cell = document.createElement("td")
        cell.innerHTML = `<i>You haven't won anything!</i>`
        row.appendChild(cell)
        tbody.appendChild(row)
    }
    //displays each item in list
    else {
        for (const name of items) {
            let row = document.createElement("tr")
            let cell = document.createElement("td")
            cell.innerHTML = `${name} x ${list[name]}`
            row.appendChild(cell)
            tbody.appendChild(row)
            //unfocus junk items
            if (rewardSort(name.toLowerCase()) === 0) {
                row.style.backgroundColor = "lightgray"
                row.style.fontStyle = "italic"
            }
        }
    }

    $("#bdPopupGeneric-winnar")[0].appendChild(table)
    console.log("[BD+] Displaying prize table.")
}

//lets have some fun with the no reward display
const SAD_ITEMS = [
    "https://images.neopets.com/items/hfo_depressed_potato.gif",
    "https://images.neopets.com/items/plu_grey_kacheek.gif",
    "https://images.neopets.com/items/petpet_frowny.gif",
    "https://images.neopets.com/items/grey_ghostkerchief.gif",
    "https://images.neopets.com/items/boo_jubjub_tellmewhy.gif",
    "https://images.neopets.com/items/cirrus_grey.gif",
    "https://images.neopets.com/items/plu_grundo_grey.gif",
    "https://images.neopets.com/items/foo_grey_toast.gif"
]
const SAD_BGS = [
    "https://outfits.openneo-assets.net/outfits/2908566/v/1693339777/150.png",
    "https://outfits.openneo-assets.net/outfits/2908567/v/1693339872/150.png",
    "https://outfits.openneo-assets.net/outfits/2908568/v/1693339886/150.png"

]

function addEmptyDisplay() {
    if (hitItemLimit()) var msg = "You can't get any more items. :("
    else msg = "You didn't win anything. :("
    let td = document.createElement("td")
    td.style = "width:90px; position:relative;"
    td.innerHTML = `
        <div style="background-image: url(${SAD_BGS[Math.floor(Math.random() * SAD_BGS.length)]}); background-size: 84px 84px; background-position:top; background-repeat: no-repeat;">
            <div style="width:80px;height:80px;border:2px solid black;"><img src="${SAD_ITEMS[Math.floor(Math.random() * SAD_ITEMS.length)]}" alt="No Prize" height="80" width="80" style="opacity:0.7;-webkit-filter:grayscale(100%);filter:grayscale(100%);"></div><span class="prizname" style="color: #303030; font-weight: normal; font-style: italic;">${msg}</span>
        </div>
    `
    $("#bd_rewardsloot > tbody > tr")[0].appendChild(td)
}

function getRecordedLoot() {
    return GM_getValue(BD_LOOT_TRACK_KEY, EMPTY_LOOT);
}

//creates the loot progress bars on the victory screen
function addLootBars() {
    let barCont = document.createElement("div")
    barCont.classList.add("lootprogress")
    //framework
    let bar1 = document.createElement("div")
    bar1.classList.add("lootprogress-cont")
    let pbar = document.createElement("div")
    pbar.classList.add("lootprogress-bar")
    let tbar = document.createElement("div")
    tbar.classList.add("lootprogress-text")
    bar1.appendChild(pbar)
    bar1.appendChild(tbar)
    let bar2 = bar1.cloneNode(true)
    if (isTVW) {
        var bar3 = bar1.cloneNode(true)
    }
    //item bar
    let w1 = getRecordedLoot().itemCount
    bar1.querySelector(".lootprogress-bar").style.backgroundColor = "#1E90FF"
    bar1.querySelector(".lootprogress-bar").style.width = `${Math.min(w1 / MAX_ITEMS * 100.0, 100)}%`
    bar1.querySelector(".lootprogress-text").innerHTML = `${w1} / ${MAX_ITEMS} Items`
    //np bar
    let w2 = getRecordedLoot().np
    bar2.querySelector(".lootprogress-bar").style.backgroundColor = "#DAA520"
    bar2.querySelector(".lootprogress-bar").style.width = `${Math.min(w2 / MAX_NP * 100.0, 100)}%`
    bar2.querySelector(".lootprogress-text").innerHTML = `${w2} / ${MAX_NP} NP`

    if (isTVW) {
        let w3 = getTvwTrack().completedBattlePoints
        bar3.querySelector(".lootprogress-bar").style.backgroundColor = "#A171BF"
        bar3.querySelector(".lootprogress-bar").style.width = `${Math.min(w3 / MAX_PP * 100.0, 100)}%`
        bar3.querySelector(".lootprogress-text").innerHTML = `${w3} / ${MAX_PP} Plot Points`
    }

    //adds loot bars to page
    barCont.appendChild(bar1)
    barCont.appendChild(bar2)
    if (isTVW) {
        barCont.appendChild(bar3)
        barCont.style.height = "60px"
    }
    $("#bd_rewards")[0].appendChild(barCont)

    //hides some messages that flood up the reward box with the bars
    for (let li of Array.from($("#bd_rewardsloot li")).filter((li) => {
        return li.innerHTML.includes("limit for today!") || li.innerHTML.includes("Sorry, you didn't win")
    })) {
        li.style.display = "none"
    }
    console.log("[BD+] Added loot bar display and hid redundant messages.")
}

const EMPTY_LOOT = {
    itemCount: 0,
    items: {},
    np: 0,
    date: null
}

function isEndOfPlotBattleWaves() {
    return $(".end_ack.collect").is(":visible");
}

function getTvwTrack() {
    return GM_getValue(BD_TVW_TRACK_KEY, {
        completedBattlePoints: 0,
        inProgressBattlePoints: 0,
        inProgressItems: [],
        inProgressNp: 0
    });
}

function countRewards() {
    if (isTVW) {
        // The plot behaves weirdly, because it works with "waves" of enemies that you fight back to back, with rewards "granted"
        // at the end of the final wave. It seems TNT enabled this "wave" mechanism simply by not showing the popup dialog or "Collect Winnings"
        // button that normally appears at the end of a battle until the final enemy is defeated.
        // However, the HTML for this dialog as well as the button still exists in the DOM,
        // so if we only look for them to be present, then we end up double-counting
        // plot points when they share the "total" at the end of all 4 or 5 battles. To solve this,
        // we'll only add plot points based on what is shown when the Collect button is NOT visible.
        // It is better to add them up after each battle, since a full wave of enemies could be disrupted by various means,
        // meaning you could have a scenario when the final dialog isn't shown to the user. In this scenario, waiting until
        // the end to calculate the points earned could result in not correctly adding points that have been granted.
        let tvwTrack = getTvwTrack()
        let ppEarned = getPlotPointsAwarded()
        let itemsWon = getItemRewards()
        let npWon = getNpRewards()

        if (!isEndOfPlotBattleWaves()) {
            tvwTrack.inProgressBattlePoints += ppEarned
            if (itemsWon && itemsWon.length > 0) {
                tvwTrack.inProgressItems = tvwTrack.inProgressItems.concat(itemsWon)
            }
            tvwTrack.inProgressNp += Number(npWon)
            GM_setValue(BD_TVW_TRACK_KEY, tvwTrack)
            // Always record the items and np won as we go in our main loot track
            console.log(`[BD+] Recording in progress values in TVW Track: Points = ${tvwTrack.inProgressBattlePoints}, Items = ${tvwTrack.inProgressItems}, NP = ${tvwTrack.inProgressNp}`)
            return recordLoot(itemsWon, npWon) || ppEarned > 0
        }

        console.log(`[BD+] In progress values in TVW Track: Points = ${tvwTrack.inProgressBattlePoints}, Items = ${tvwTrack.inProgressItems}, NP = ${tvwTrack.inProgressNp}`)

        // We have to get the diff now, between what we've already recorded and what was earned by defeating the last enemy
        let itemsWonInLastWave = itemsWon.filter(function (v) {
            return !this.get(v) || !this.set(v, this.get(v) - 1);
        }, tvwTrack.inProgressItems.reduce((acc, v) => acc.set(v, (acc.get(v) || 0) + 1), new Map()));
        console.log(`[BD+] Items won in last wave: ${itemsWonInLastWave}`)
        let npWonInLastWave = Number(npWon) - tvwTrack.inProgressNp
        console.log(`[BD+] Np won in last wave: ${npWonInLastWave}`)

        tvwTrack.completedBattlePoints += ppEarned
        // Reset our in-progress; we no longer need to keep track of these
        tvwTrack.inProgressItems = []
        tvwTrack.inProgressNp = 0
        tvwTrack.inProgressBattlePoints = 0
        GM_setValue(BD_TVW_TRACK_KEY, tvwTrack)
        console.log(`[BD+] Points won in completed plot battle: ${ppEarned} were added to total: ${tvwTrack.completedBattlePoints}`)

        return recordLoot(itemsWonInLastWave, npWonInLastWave) || ppEarned > 0
    } else {
        return recordLoot(getItemRewards(), getNpRewards())
    }
}

function recordLoot(items, np) {
    let loot = getRecordedLoot()

    if (items.length > 0 || np > 0) {
        loot.items = updateLootList(loot.items, items)
        loot.itemCount += items.length
        loot.np = Number(loot.np) + Number(np) //because js is fucky, np is grabbed as a string so we have to make them numbers first
    }

    loot.date = getDate() //records current date
    GM_setValue(BD_LOOT_TRACK_KEY, loot)
    console.log(`[BD+] ${items.length} item(s) and ${np} NP earned, loot recorded.`)

    return items.length > 0 || np > 0
}

function getPlotPointsAwarded() {
    let pp = $("#bd_rewards > p:nth-child(4) > span")

    if (pp.length > 0) {
        return Number(pp[0].innerHTML.split(" ")[0])
    }

    return 0
}

function getItemRewards() {
    return Array.from($("#bd_rewardsloot td")).filter((td) => {
        return !td.querySelector("img").getAttribute("src").includes("images.neopets.com/reg/started_bagofnp.gif")
    }).map((td) => td.querySelector("span").innerHTML)
}

function getNpRewards() {
    return Number(Array.from($("#bd_rewardsloot td > img")).find((img) => {
        return img.getAttribute("src").includes("images.neopets.com/reg/started_bagofnp.gif")
    })?.getAttribute("alt")?.split(" ")?.[0]) || Number(0)
}

function updateLootList(lootList, items) {
    if (lootList === undefined) lootList = {}

    for (const name of items) {
        if (lootList.hasOwnProperty(name)) {
            lootList[name] += 1
        } else {
            lootList[name] = 1
        }
    }

    return lootList
}

function hitItemLimit() {
    return getRecordedLoot().itemCount >= MAX_ITEMS
}

function highlightItemLimit() {
    if (HIGHLIGHT_MAX_REWARDS && hitItemLimit() && !isObelisk()) {
        let popup = $("#arenacontainer #bdPopupGeneric-winnar")[0]
        popup.getElementsByClassName("middle")[0].style.backgroundColor = "#D0EDCA"
        popup.getElementsByClassName("bg")[0].style.backgroundColor = "#D0EDCA"
    }
}

//obelisk limits apply if you've done less than 10 obelisk fights and you've collected your daily prizes
function limitObelisk() {
    return isObelisk() && ((getObeliskTrack().count >= 10 && hitItemLimit()) || !LOOSE_OBELISK_RESTRICTIONS)
}

function addObeliskContribution() {
    let plural;
    let guild = isObelisk()
    if (guild) {
        let div = document.createElement("div")
        div.style = "border-radius: 1px; position:absolute; display:block; bottom: -82px; text-align: center; height: 64px; z-index: 1; right: 0px; border: 2px solid black; background-color: lightgrey; background-image: url(https://i.imgur.com/VttRWYx.png); background-size:100%; background-position: bottom;"
        let msg = div.appendChild(document.createElement("div"))
        msg.style = "background-color:rgba(255,255,255,0.9); padding: 6px; height: 30px; margin: 13px; border-radius: 1px;"
        let data = GM_getValue(OBELISK_TRACK_KEY, {count: 0, points: 0, date: -1})
        if (guild.slice(-1) === 's') {
            plural = "have";
        } else plural = "has"
        msg.innerHTML = `<b>Your contributions against The ${guild} ${plural} been recorded.</b><br>
        <b>Total Battles: ${data.count} | Total Points: ${data.points} ( +${obeliskContribution} )</b>`
        $("#bdPopupGeneric-winnar")[0].appendChild(div)
    }
}

function is2Player() {
    let p2 = $("#arenacontainer #playground #gQ_scenegraph #p2 #p2image")[0]
    return p2.style.backgroundImage.includes("pets.neopets.com");
}

//helpers
function clone(data) {
    return JSON.parse(JSON.stringify(data))
}

function getDate() {
    return new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"}).slice(0, 10).replace(",", "")
}

function getItemURL(node, ability = false) {
    // for some reason the ability's class isn't changed to selected
    if (!node.classList.contains("selected") && !ability) {
        return null
    } else {
        let str = node.children[1].style.backgroundImage
        if (str.length < 1) return null
        else {
            let s = str.slice(5, -2)
            if (!s.includes("https:")) s = "https:" + s
            return s
        }
    }
}

function getHex(color) {
    let hex = "#"
    color.forEach(c => {
        hex += c.toString(16).padStart(2, "0")
    })
    return hex
}


//==========
// style css
//==========

function addArenaCSS() {
    //bar
    document.head.appendChild(document.createElement("style")).innerHTML = `
        .bdbartext {
            font-family: "MuseoSansRounded500", "Arial", sans-serif;
            text-align: center;
            text-overflow: hidden;
            overflow: hidden;
            padding: 2px;
            max-width: 100%;
            max-height: 100%;
            font-size: 14px;
            line-height: 100%;
            color: inherit;
            cursor: default;
        }

        .bdbarclickable {
            border-style: solid;
            border-width: 1px;
            border-color: #000;
        }

        .bdsetbar {
            height: 80px;
            width: 98%;
            background-color: #CCCCCC;
            margin: auto;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 0px 10px;
            position: relative;
        }

        .bdsetcontainer {
            height: 60px;
            padding: 5px;
            width: 18%;
            display: flex;
            align-items: center;
        }

        .bdsetbutton {
            background-color: #FFFFFF;
            height: 60px;
            width: 100px;
            margin: 2px;
            display: flex;
            justify-content: center;
            flex-direction: column;
            container-type: inline-size;
        }

        .activebutton {
            cursor: pointer !important;
        }
        .activebutton:active {
            background-color: #DEDEDE; /* haha nice */
        }

        .bdsetthumbnail {
            display: inline-flex;
            justify-content: space-evenly;
            align-items: center;
            height: 70%;
            width: 100%;
        }

        .bdseticoncontainer {
            margin: auto;
            padding: 4px;
            height: 100%;
            flex: 1;
            display: flex;
            align-items: center;
        }

        .bdseticon {
            max-width:100%;
            max-height:100%;
            object-fit: cover;
            position: relative;
        }

        .bdsetoptioncontainer {
            display: flex;
            flex-direction: column;
            height: 100%;
            flex: 1;
            margin: 0 0 0 2px;
        }

        .bdsetoption {
            background-color: #ffde00;
            padding: 2px 4px;
        }

        .options_btn {
            margin: 2px 0;
        }

        .activeoption {
            cursor: pointer !important;
        }
        .activeoption:active {
            background-color: #A5B5B5;
        }

        .lootprogress {
            display: flex;
            flex-direction: column;
            height: 40px;
            align-items: center;
            justify-content: center;
            position: relative;
            width: 100%;
        }
        .lootprogress-cont {
            margin: 2px;
            display: block;
            position: relative;
            width: 80%;
            height: 18px;
            background-color: #d1d1d1;
            border-radius: 6px;
        }
        .lootprogress-bar {
            display: block;
            position: absolute;
            left: 0;
            height: 100%;
            border-radius: 6px;
        }
        .lootprogress-text {
            display: block;
            position: absolute;
            left: 10px;
            font-weight: bold;
        }
        #bdrewards p {
            margin-top: 0px;
        }
        .bdPopupGeneric.contents {
            padding-bottom: 50px !important;
        }
        #bdlootdisplay {
            display: table;
            width: 210px;
            position: absolute;
            z-index: 1;
            left: 103%;
            top: 0;
            background-color: white;
            border: 2px solid;
            border-collapse: collapse;
        }
        #bd_rewardsloot {
            height: auto !important;
        }
        #bd_rewardsnav {
            top: 286px !important;
        }
        #bdlootdisplay th, #bdlootdisplay tr {
            border: 1px solid black;
            font-size: 8pt;
            padding: 4px;
        }
        #bdlootdisplay td {
            padding: 2px 4px;
        }
        #bdlootdisplay th {
            border-bottom: 2px solid black;
            font-size: 10pt;
            background-color: #ffffb3;
        }
    `
    /*
        #bd_rewardsloot tr {
            display: flex !important;
            justify-content: center;
        }
        #bd_rewardsloot tr td {
            display: block !important;
        }
    */

    //settings window
    document.head.appendChild(document.createElement("style")).innerHTML = `
        .settingswindow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 100;
            background-color: #FFFFFF;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        .container-vertical {
            display: flex;
            justify-content: flex-start;
            flex-direction: column;
            padding: 10px;
        }

        .container-horizontal {
            display: inline-flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
    `
}

//fight.phtml
function addFightCSS() {
    document.head.appendChild(document.createElement("style")).innerHTML = `
        div.npcContainer.collapsed tr.npcRow.favorite.default div.fav:hover::before {
            content: "Remove Default";
            width: 124px;
        }
        div.npcContainer.collapsed tr.npcRow.favorite div.fav:hover::before {
            content: "Set as Default";
            width: 110px;
        }
        div.npcContainer tr.npcRow.favorite div.fav:hover::before {
            content: "Remove from Favorites";
            width: 174px;
        }
        div.npcContainer div.fav:hover::before {
            content: "Set as Favorite";
            width: 110px;
            padding: 2px;
            text-align: center;
            display: block;
            position: absolute;
            background-color: rgba(255,255,255,0.95);
            border: 1px solid black;
            font-size: 0.9em;
            left: 60%;
            bottom: 60%;
            border-radius: 4px;
            pointer-events: none;
            opacity: 1.0 !important;
            visibility: visible;
        }
        div.npcContainer div.fav::before {
            content: "";
            opacity: 0;
            transition-duration: 0.2s;
            transition-property: opacity;
        }
        /*these 3 should be layered into 1 sprite sheet but i cant be assed*/
        tr.favorite > div.fav {
            background-image: url(https://i.imgur.com/P5xOsKL.png);
        }
        tr.favorite.default > div.fav {
            background-image: url(https://i.imgur.com/8FAMSEM.png);
        }
        tr.selectedPveNpc > div.fav {
        }
        tr > div.fav {
            width: 16px;
            height: 16px;
            background-size: 16px 16px;
            background-image: url(https://i.imgur.com/PMhcKWC.png);
            display: block;
            position: absolute;
            left: 287px;
            top: 3px;
            cursor: pointer;
        }
        tr.npcRow.selectedPveNpc {
            background-color: #F0E68C !important;
        }
        .npcRow {
            position: relative;
        }
        td.diff {
            width: 75px;
        }
        td.tough {
            width: 151px;
        }
        #bdFightStep3 {
            min-height: fit-content !important;
        }
        .npccollapse {
            font-size: 15px;
            cursor: pointer;
            user-select: none !important;
        }
        #domeTitle:has(+ div.npcContainer.collapsed) {
            background-image: url(https://i.imgur.com/KY67k7i.png);
        }
        div.npcContainer.collapsed #npcTable tr:not(.favorite) {
            display: none !important;
        }
        div.borderExpansion > br {
            display: none;
        }
        #bdFightStep3FightButton {
            transform: translateY(48px);
        }
        #quickfight {
            top: 0px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
        }
        #step3toggle {
            bottom: 5px;
            right: 132px;
            display: flex;
            align-items: center;
            color: #ccc;
            -webkit-transition: .4s;
            transition: .4s;
        }
        #step3toggle:has(input:checked) {
            color: #2196F3;
        }
        /* modified from https://www.w3schools.com/howto/howto_css_switch.asp */
        .switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 23px;
          margin-left: 6px;
          font-size: 0.9em;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .4s;
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 17px;
          width: 17px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          -webkit-transition: .4s;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: #2196F3;
        }
        input:focus + .slider {
          box-shadow: 0 0 1px #2196F3;
        }
        input:checked + .slider:before {
          -webkit-transform: translateX(17px);
          -ms-transform: translateX(17px);
          transform: translateX(17px);
        }
        .slider.round {
          border-radius: 34px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
    `
}
