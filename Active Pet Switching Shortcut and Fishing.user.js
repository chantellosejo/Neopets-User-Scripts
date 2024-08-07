// ==UserScript==
// @name         Neopets - Active Pet Switch & Fishing Vortex Plus (modified by Chanakin)
// @version      2.8
// @description  APS adds a button that lets you easily switch your active pet. In the classic theme, this will appear underneath your pet's image in the sidebar. In beta, it will appear next to the icons
//               that float at the top of every page (Bookmarks, Favorites, Shop Wizard). FVP adds additional info to the fishing vortex.
// @author       Metamagic, with modifications by chanakin
// @match        *://*.neopets.com/*
// @icon         https://i.imgur.com/RnuqLRm.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        window.focus
// @grant        window.close
// @downloadURL  https://github.com/Mettymagic/np-userscripts/raw/main/Neopets%20-%20Active%20Pet%20Switch.user.js
// @updateURL    https://github.com/Mettymagic/np-userscripts/raw/main/Neopets%20-%20Active%20Pet%20Switch.user.js
// ==/UserScript==

// You are free to modify this script for personal use but modified scripts must not be shared publicly without permission.
// Feel free to contact me at @mettymagic on discord for any questions or inquiries. ^^

// Trans rights are human rights ^^
// metty says hi

//===========
// APS config
//===========
//collected page data times out after this many hours. default: -1 (aka never)
const HOME_DATA_TIMEOUT = -1

//===========
// FVP config
//===========
//changes the display mode
// -1 = disable display entirely. still tracks enabled info.
// 0 = display table on fishing page w/o fishing info
// 1 = display table on fishing page, plus fishing info (default)
// 2 = display fishing info on all pages' pet table
const FISHING_DISPLAY_MODE = 1
//tracks and displays pet fishing levels
const FISHING_LEVEL_TRACK = true
//tracks time since last fishing reward
const FISHING_TIME_TRACK = true

//tracks fishing xp gained and displays level up chance based on /u/neo_truths' post
//https://old.reddit.com/r/neopets/comments/xqylkt/ye_olde_fishing_vortex/
const FISHING_XP_TRACK = true

//for my mom who keeps accidentally clicking it then getting confused
const REMOVE_CAST_BUTTON = true

//==============
// main function
//==============

const url = document.location.href
//check for the top left pet icon to know we're in beta
let isBeta = false
if ($("[class^='nav-pet-menu-icon']").length) isBeta = true

let timeoutId = null

if (url.includes("neopets.com/home")) {
    getPetData(document) //always update the data while we're here
    //close if flagged to
    let timeout = GM_getValue("stackpath-timeout")
    if (timeout) {
        GM_deleteValue("stackpath-timeout")
        // won't close tab after 15 second timeout
        if (new Date().valueOf() - timeout < 1000 * 15) {
            window.close()
        }
    }
}

if (url.includes("water/fishing.phtml")) {
    handleFishingVortex()
}

createMenuButton() //adds the button to open the menu
listenForPetUpdates() //adds a listener for updates to the script's stored pet list, which then updates the menu

//=========
// overhead
//=========
function clearPetList() {
    GM_setValue("petlist", {})
}

function updatePetList() {
    clearPetList()
    $.get("https://www.neopets.com/home/", function (data) {
        let doc = new DOMParser().parseFromString(data, "text/html")
        //sometimes stackpath blocks the page, in which case open a newtab and close it after
        if (doc.title !== "Welcome to Neopets!") {
            console.log("[APS] Home page request blocked by stackpath, opening tab manually.")
            GM_setValue("stackpath-timeout", new Date().valueOf())
            window.open("https://www.neopets.com/home/")
            window.focus()
        }
        getPetData(doc)
        console.log("[APS] Data successfully retrieved.")
    })
}

function timeoutForUpdateExceeded() {
    return new Date().valueOf() - GM_getValue("lastupdate", 0) > 1000 * 60 * 60 * HOME_DATA_TIMEOUT && HOME_DATA_TIMEOUT > 0
}

function usernameHasChanged() {
    return getUsername() !== GM_getValue("un")
}

function petListExists() {
    return GM_getValue("petlist", false)
}

function shouldUpdate() {
    //revalidates data if it times out or if username changes
    if (timeoutForUpdateExceeded()) {
        console.log("[APS] Updating data for new day.")
        return true
    }

    if (usernameHasChanged()) {
        console.log("[APS] Updating data for new user.")
        return true
    }

    if (!petListExists()) {
        console.log("[APS] Getting user pet data for first time.")
        return true
    }

    return false
}

function getPetData(doc) {
    GM_setValue("petlist", getPets(doc))
    GM_setValue("lastupdate", new Date().valueOf())
    GM_setValue("un", getUsername())

    console.log("[APS] Pet data updated.")
}

function emptyJson(newValue) {
    return JSON.stringify(newValue) === JSON.stringify({});
}

function setRefreshButtonVisible(visible) {
    Array.from($(".activetable > a")).forEach(link => {
        if (visible) {
            link.style.display = "none"
        } else {
            link.style.display = "block"
        }
    })
}

function listenForPetUpdates() {
    GM_addValueChangeListener("petlist", function (key, oldValue, newValue, _) {
        //if pet list is now empty, adds loading msg
        if (emptyJson(newValue)) {
            console.log("[APS] Cleared pet tables.")
            addLoadDivs()
            setRefreshButtonVisible(false)
            return
        }

        console.log("[APS] Updated pet tables.")
        console.log(newValue)
        clearTimeout(timeoutId)
        timeoutId = null
        populateTables()
        setRefreshButtonVisible(true)
    })
}

//=================
// element creation
//=================

function createMenuButton() {
    let parentElement = getButtonLocation()

    if (parentElement) {
        let changeActivePetShortcut

        if (isBeta) {
            changeActivePetShortcut = createShortcutIcon("#", "https://images.neopets.com/themes/h5/constellations/images/mypets-icon.svg")
        } else {
            changeActivePetShortcut = document.createElement("a")
            changeActivePetShortcut.href = "#"
            changeActivePetShortcut.innerHTML = "Change Active Pet"
        }

        addCSS()

        changeActivePetShortcut.classList.add("openmenubutton")
        changeActivePetShortcut.addEventListener("click", () => {
            openMenu()
        })

        parentElement.appendChild(changeActivePetShortcut);
        createMenu()
    }
}

function createMenu() {
    let menu = document.createElement("div")
    menu.id = "select-active-pet-menu"
    menu.style.display = "none" //starts not visible

    menu.appendChild(getTableHeader(`<b>Select an Active Pet:</b><br><small><small><small>(Click anywhere else to exit)</small></small></small>`))

    let table = document.createElement("table")
    table.classList.add("activetable")
    menu.appendChild(table)
    document.body.appendChild(menu)

    // revalidates if it needs to
    if (shouldUpdate()) {
        updatePetList()
        return
    }

    populateTables()
}

function populateTables() {
    let petList = Object.values(GM_getValue("petlist", {}))
    if (petList.length < 1) {
        addLoadDivs()
        updatePetList()
        return
    }

    Array.from($(".activetable")).forEach(table => {
        table.innerHTML = ""

        let activePet = getActivePet()

        for (let i = 0; i < 4; i++) { //4 rows
            let row = table.insertRow()
            for (let j = 0; j < 5; j++) { //5 per row
                let index = i * 5 + j
                if (index < petList.length) {
                    let img = petList[index].img.withBG //300x300
                    let name = petList[index].name

                    let cell = row.insertCell()
                    cell.setAttribute("name", name)
                    //name = "test"
                    let d1 = document.createElement("div"), d2 = document.createElement("div")
                    d1.innerHTML = `<img src=${img} width="150" height="150" alt=${name}>`
                    d1.style.width = "150px !important";
                    d1.style.height = "150px !important";
                    d2.innerHTML = name
                    cell.appendChild(d1)
                    cell.appendChild(d2)

                    if (activePet === name) {
                        cell.setAttribute("active", "")
                    } else {
                        cell.addEventListener("click", (event) => {
                            event.stopPropagation();
                            changeActivePet(name);
                        })
                        cell.style.cursor = "pointer"
                    }

                    if (url.includes("water/fishing.phtml") || FISHING_DISPLAY_MODE === 2) {
                        addFishingPetDisplay(cell, name)
                    }
                }
            }
        }

        let refresh = document.createElement("a")
        refresh.innerHTML = "(refresh pet list)"
        refresh.addEventListener("click", (event) => {
            event.stopPropagation()
            updatePetList() //updates pet list
        })
        table.appendChild(refresh)
        console.log(`[APS] Table populated with ${petList.length} pets.`)
    })
}

function addLoadDivs() {
    let loadMsg = '<div class="dot-spin"></div><div style="margin-top: 30px">Fetching pet data...</div>'
    Array.from($(".activetable")).forEach(table => table.innerHTML = loadMsg)

    // if it hasn't grabbed results after 5 seconds, display a message
    timeoutId = setTimeout(() => {
        Array.from($(".activetable")).forEach(table => {
            if (table.innerHTML === loadMsg) {
                table.innerHTML += '<div><a href="/home" target="_blank"><small>(click here if its taking too long)</small></a></div>'
            }
        })
    }, 3000)
}

function getTableHeader(innerHTML) {
    let header = document.createElement("div")
    header.classList.add("activetableheader")
    header.innerHTML = innerHTML
    return header
}

function addFishingTable(header) {
    let menu = document.createElement("div")
    menu.classList.add("vertical")
    $("#container__2020")[0].appendChild(menu)

    menu.appendChild(getTableHeader(header))

    let table = document.createElement("table")
    table.classList.add("activetable")
    table.style.margin = "auto"
    menu.appendChild(table)
}


//=====================
//element functionality
//=====================

function openMenu() {
    $("#select-active-pet-menu").css("display", "flex") //makes menu visible
    setTimeout(() => {
        document.body.addEventListener("click", exitClick, false)
    }, 50) //adds the exit click a short delay after menu is created
}

function exitClick(event) {
    event.stopPropagation()
    if (!(document.querySelector(".activetableheader").contains(event.target) || document.querySelector(".activetable").contains(event.target))) {
        $("#select-active-pet-menu")[0].style.display = "none"
        document.body.removeEventListener("click", exitClick, false)
    }
}

function changeActivePet(name) {
    let img = GM_getValue("petlist", {})[name].img.withBG

    Array.from($(".activetable")).forEach(table => {
        table.innerHTML = ""
        let d1 = document.createElement("div"), d2 = document.createElement("div"), d3 = document.createElement("div")
        d1.innerHTML = `<img src=${img} width="150" height="150" alt=${name}>`
        d1.style.opacity = "0.8"
        d1.style.width = "150px !important"
        d1.style.height = "150px !important"
        d1.style.display = "block"
        d1.style.position = "relative"
        d3.classList.add("dot-spin")
        d3.style.display = "block"
        d3.style.position = "absolute"
        d3.style.top = "50%"
        d3.style.left = "50%"
        d3.style.transform = "translate(-50%, -50%)"
        d1.appendChild(d3)
        d2.id = "set-active-msg"
        d2.innerHTML = `Setting ${name} as active pet...`
        table.appendChild(d1)
        table.appendChild(d2)
    })

    $.get("/process_changepet.phtml?new_active_pet=" + name, function () {
        console.log(`[APS] Active pet changed to ${name}.`)
        Array.from($(".activetable")).forEach(table => {
            table.querySelector(".dot-spin").style.display = "none"
            table.querySelector("#set-active-msg").innerHTML = `${name} is now your active pet!`
        })

        if (url.includes("water/fishing.phtml")) {
            window.location.replace("fishing.phtml")
        } else {
            window.location.reload()
        }
    })
}


//==================
// fvp functionality
//==================
function isFishingResultPage() {
    return Array.from($("#container__2020 > p")).some((p) => {
        return p.innerHTML === "You reel in your line and get..."
    })
}

function isFishingHomePage() {
    return $("#pageDesc").length > 0
}

function handleFishingVortex() {

    if (isFishingResultPage()) {
        if (FISHING_DISPLAY_MODE >= 0) {
            addFishingTable(`<b>Fish With:</b>`)
        }

        if (REMOVE_CAST_BUTTON) {
            removeCastButton()
        }

        if (FISHING_TIME_TRACK || FISHING_LEVEL_TRACK) {
            handleFishingResult()
        }
        return
    }

    if (isFishingHomePage()) {
        if (FISHING_DISPLAY_MODE >= 0) {
            addFishingTable(`<b>Change Active Pet:</b>`)
        }

        if (FISHING_LEVEL_TRACK) {
            initializePetLevel()
        }

        $(document).ready(function () {
            $('input[value="Reel In Your Line"]').click()
        })
    }
}

function initializePetLevel() {
    let list = GM_getValue("fishinglist", {})
    let name = getActivePet()
    if (!isNaN(list[name]?.lvl)) {
        let lvl = $("#container__2020 > p:last-of-type > b")[0].innerHTML

        list[name] = {
            lvl: lvl,
            xp: list[name]?.xp,
            lasttime: list[name]?.lasttime || null
        }

        if (list[name].xp === undefined) {
            list[name].xp = null
        }

        GM_setValue("fishinglist", list)
        console.log(`[FVP] Recorded ${name}'s fishing level. (${lvl})`)
    }
}

function removeCastButton() {
    $('#container__2020 > a[href="/water/fishing.phtml"]').css("display", "none")
    $("#container__2020 > br:last-of-type").css("display", "none")
    console.log("[FVP] Removed cast again button.")
}

function levelUp(data, lvlUpMessage) {
    data.lvl = lvlUpMessage[0].querySelector("b").innerHTML
    if (FISHING_XP_TRACK) {
        data.xp = 0
    }
}

function handleFishingResult() {
    //if theres a reward, do stuff
    if ($("#container__2020 > div.item-single__2020").length) {
        let list = GM_getValue("fishinglist", {})
        let name = getActivePet()
        let data = list[name] || {
            lvl: null,
            xp: null,
            lasttime: null
        }

        if (FISHING_TIME_TRACK) {
            data.lasttime = new Date().valueOf()
        }

        if (FISHING_LEVEL_TRACK) {
            let lvlUpMessage = Array.from($("#container__2020 > p")).filter((p) => {
                return p.innerHTML.includes("Your pet's fishing skill increases to")
            })

            if (lvlUpMessage.length) {
                levelUp(data, lvlUpMessage);
            } else if (FISHING_XP_TRACK && data.xp != null) {
                data.xp += 100
            }
        }

        list[name] = data
        console.log(`[FVP] Fishing results for ${name} recorded.`)
        GM_setValue("fishinglist", list)
    }
}

function addLevelDisplay(data, cell) {
    let ldiv = document.createElement("div")
    ldiv.classList.add("leveldisplay", "fishingdisplay")
    ldiv.innerHTML = `Lv.${data.lvl || "(?)"}`
    let lhover = document.createElement("div")
    lhover.classList.add("fishingdisplay")
    let chance = getLevelUpChance(data.xp, data.lvl)
    if (chance == null) lhover.innerHTML = "(?)% chance to lv up"
    else lhover.innerHTML = `${getLevelUpChance(data.xp, data.lvl)}% chance to lv up`
    if (data.xp == null) lhover.innerHTML += `<br>Exp: (?)`
    else lhover.innerHTML += `<br>Exp: ${data.xp}`
    ldiv.appendChild(lhover)
    cell.appendChild(ldiv)
}

function addTimeDisplay(data, cell) {
    let tdiv = document.createElement("div")
    tdiv.classList.add("timedisplay", "fishingdisplay", "circular-progress")
    //deals with display w/o a recorded time
    if (data.lasttime == null) {
        tdiv.innerHTML = `
          <div class="inner-circle fishingdisplay"></div>
          <p class="percentage fishingdisplay">(?)hr</p>
        `
        tdiv.style.background = `#c4c4c4`
    } else {
        let t = getTimeSinceFished(data.lasttime)
        tdiv.innerHTML = `
          <div class="inner-circle fishingdisplay"></div>
          <p class="percentage fishingdisplay">${t.toFixed(1)}hr</p>
        `
        tdiv.style.background = `conic-gradient(${getCircleColor(t / 26.0)} ${t / 26.0 * 360}deg, #c4c4c4 0deg)`
    }
    cell.appendChild(tdiv)
}

function addFishingPetDisplay(cell, name) {
    let data = GM_getValue("fishinglist", {})[name] || {
        lvl: null,
        xp: null,
        lasttime: null
    }

    addLevelDisplay(data, cell);
    addTimeDisplay(data, cell);
}

function getCircleColor(p) {
    if (p < 0.2) {
        return "#e87e72"
    }

    if (p < 0.4) {
        return "#e8b972"
    }

    if (p < 0.6) {
        return "#ebed77"
    }

    if (p < 0.8) {
        return "#c0ed77"
    }

    if (p < 1.0) {
        return "#77ed7d"
    }

    return "#88f2dd"
}

function getTimeSinceFished(tfish) {
    if (tfish == null) {
        return null
    }

    let t = new Date().valueOf() - tfish
    return Math.min(Math.floor((t / (1000.0 * 60.0 * 60.0)) * 10) / 10.0, 26.0) //# of hrs w/ 1 decimal place, rounded down
}

function getLevelUpChance(exp, lvl) {
    //if we dont have the data for either, our chance is unknown
    if (exp == null || lvl == null) {
        return null
    }

    //if (1-100) <= p, we win. (eg if p = 5, we have a 5% chance)
    let p = Math.floor(((exp + 100) - lvl - 20) / 1.8)
    return Math.max(p, 0.0).toFixed(1) //can't have negative percentage, rounds to 1 decimal
}


//========
// getters
//========
function petsSortedAlphabetically(petInfo) {
    return Object.keys(petInfo).sort().reduce((obj, key) => {
        obj[key] = petInfo[key]
        return obj
    }, {});
}

function getUsername() {
    if (isBeta) {
        return $("#navprofiledropdown__2020 > div:nth-child(3) a.text-muted")[0].innerHTML
    }

    return $("#header > table > tbody > tr:nth-child(1) > td.user.medText a[href]")[0].innerHTML
}

function getPets(doc) {
    let elements = Array.from(doc.querySelectorAll(".hp-carousel-pet"))
    let petNames = elements.map(e => e.getAttribute("data-name"))
    petNames = petNames.filter((n, index) => petNames.indexOf(n) === index)

    let petInfo = {}

    petNames.forEach(name => {
        let e = elements.find(e => e.getAttribute("data-name") === name)
        let img = {noBG: e.style.backgroundImage.replace('"', "").slice(5, -2), withBG: e.getAttribute("data-petimage")}
        let species = e.getAttribute("data-species")
        let color = e.getAttribute("data-color")
        let gender = e.getAttribute("data-gender")
        let hp = `${e.getAttribute("data-health")}/${e.getAttribute("data-maxhealth")}`
        let level = e.getAttribute("data-level")
        let hunger = e.getAttribute("data-hunger")
        let mood = e.getAttribute("data-mood")
        let p2 = getPetpet(e)
        petInfo[name] = {
            name: name,
            species: species,
            color: color,
            img: img,
            gender: gender,
            hp: hp,
            level: level,
            hunger: hunger,
            mood: mood,
            p2: p2
        }
    })

    if (petInfo === {}) return null
    return petsSortedAlphabetically(petInfo)
}

function getPetpet(e) {
    let petpet = null
    if (e.hasAttribute("data-petpet")) {
        let p = e.getAttribute("data-petpet").split(" ") //no, name, the, fir
        let name = p.slice(0, p.lastIndexOf("the")).join(" ")
        let species = p.slice(p.lastIndexOf("the") + 1, p.length).join(" ")
        let img = e.getAttribute("data-petpetimg")
        let p3 = null
        if (e.hasAttribute("data-p3")) p3 = {name: e.getAttribute("data-p3"), img: e.getAttribute("data-p3img")}
        petpet = {name: name, species: species, img: img, p3: p3}
    }
    return petpet
}

function getActivePet() {
    if (isBeta) {
        return $("#navprofiledropdown__2020 > div:nth-child(4) > a")[0].innerHTML
    }

    return $("#content > table > tbody > tr > td.sidebar > div:nth-child(1) > table > tbody > tr:nth-child(1) > td > a > b")[0].innerHTML
}


function getButtonLocation() {
    if (isBeta) var e = $(".navsub-left__2020")
    else e = $(".activePet")
    if (e.length) return e[0]
    else return null
}


//========
// css
//========

function addCSS() {
    var theme
    var button
    var text

    if (isBeta) {
        theme = $(".nav-profile-dropdown__2020").css("background-color")
        button = $(".nav-profile-dropdown-text").css("color")
        text = $(".nav-profile-dropdown-text a.text-muted").css("color")

        document.head.appendChild(document.createElement("style")).innerHTML = `
        .openmenubutton {
            height: 25px;
            width: 30px;

        }
        `
    } else {
        theme = $("#content > table > tbody > tr > td.sidebar > div:nth-child(1) > table > tbody > tr:nth-child(1) > td").css("background-color")
        button = "gray";
        text = "black";

        document.head.appendChild(document.createElement("style")).innerHTML = `
        .openmenubutton {
            margin-top: 3px;
            border: 1px solid black;
            background-color: #D3D3D3;
            cursor: pointer;
            font-size: 8pt;
            padding: 1px 0px 1px;
            width: 148px;
            height: 100%;
            display: block;
            font-weight: normal;
            text-align: center;
        }
        .openmenubutton:hover {
            background-color: #C0C0C0;
        }
        .openmenubutton:active {
            background-color: #808080;
        }
        `
    }

    document.head.appendChild(document.createElement("style")).innerHTML = `
        .shortcut {
            margin-left: 8px;
        }
        .vertical {
            display: flex;
            flex-direction: column;
            margin: auto;
            width: fit-content;
        }
        #select-active-pet-menu {
            position: fixed;
            z-index: 100000;
            background-color: #8a8a8a;
            flex-direction: column;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
        }
        #select-active-pet-menu::before {
            width: 100vw;
            height: 100vh;
            opacity: 0.7;
            background-color: black;
            z-index: -1;
            content: "";
            position: fixed;
            transform: translate(-50%, -50%);
            left: 50%;
            top: 50%;
        }
        .activetableheader {
            text-align: center;
            font-size: 16pt;
            cursor: default;
            background-color: ${theme};
            color: ${text};
            padding-top: 8px;
            padding-bottom: 8px;
            -webkit-user-select: none;
            -ms-user-select: none;
            user-select: none;
            position: relative;
            display: block;
            min-width: 300px;
        }
        .activetable > a {
            cursor: pointer;
            display: block;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: 0%;
            padding: 4px;
            color: blue;
            text-decoration: underline;
            font-size: 8pt;
        }
        .activetable {
            padding: 20px 20px;
            text-align: center;
            background-color: #FFFFFF;
            border-spacing: 5px;
            position: relative;
        }
        .activetable td {
            font-weight: bold;
            text-align: center;
            background-color: #e6e6e6;
            border-radius: 8px;
            padding-top: 10px;
            padding-bottom: 5px;
            position: relative;
        }
        .activetable td img {
            margin: 0;
            padding: 0;
            width: 150px !important;
            pointer-events: none;
            -webkit-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        .activetable td:hover {
            background-color: #c9e3b3;
        }
        .activetable td:active {
            background-color: #a2cf7c;
        }
        .activetable td:hover img {
            opacity: 0.85;
        }

        .activetable td[active] {
            cursor: not-allowed;
            background-color: #8f8f8f;
            color: #4a4a4a;
        }
        .activetable td[active]::after {
            opacity: 0.6;
            font-size: 16pt;
            text-align: center;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            cursor: not-allowed;
            color: black;
            content: "(already active)";
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            transform: rotate(25deg)
        }
        .activetable td[active] img {
            opacity: 0.3;
        }

        .leveldisplay {
            border-radius: 50%;
            width: 40px;
            height: 40px;
            border: 3px solid #c4c4c4;
            font-size: 8pt;
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(255,255,255,0.95);
            right: 55px;
            top: 118px;
            transition: 0.5s;
            box-sizing: border-box;
        }
        .leveldisplay:hover {
            background-color: #d9d9d9;
        }
        .leveldisplay > div {
            justify-content: center;
            align-items: center;
            display: flex;
            transition: 0.2s;
            visibility: hidden;
            position: absolute;
            width: 120px;
            height: 40px;
            opacity: 0;
            top: -4px;
            left: -4px;
            background-color: white;
            border-radius: 4px;
            z-index: 100000;
        }
        .leveldisplay:hover > div {
            transition-delay:0.5s;
            opacity: 1;
            visibility: visible;
        }
        .timedisplay {
            position: absolute;
            top: 118px;
            right: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            opacity: 0.95;
        }
    `

    //radial progress bar taken from https://dev.to/shubhamtiwari909/circular-progress-bar-css-1bi9
    document.head.appendChild(document.createElement("style")).innerHTML = `
        :root {
          --progress-bar-width: 40px;
          --progress-bar-height: 40px;
        }
        .circular-progress {
            width: var(--progress-bar-width);
            height: var(--progress-bar-height);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .inner-circle {
            position: absolute;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: rgba(255,255,255,0.95);
        }

        .percentage {
            position: relative;
            font-size: 8pt !important;
            color: black;
        }
    `

    //dot spin animation taken from https://codepen.io/nzbin/pen/GGrXbp
    document.head.appendChild(document.createElement("style")).innerHTML = `
    .dot-spin::before {
        position: absolute;
        width: 60px;
        height: 60px;
        left: 50%;
        top: 50%;
        background-color: white;
        opacity: 0.5;
        transform: translate(-50%, -50%) translateZ(-1px);
        border-radius: 50%;
        content: "";
        display: block;
        z-index: -1;

    }
    .dot-spin {
        transform-style: preserve-3d;
        margin: auto;
        position: relative;
        width: 10px !important;
        height: 10px !important;
        border-radius: 5px;
        background-color: transparent;
        color: transparent;
        box-shadow: 0 -18px 0 0 #9880ff, 12.727926px -12.727926px 0 0 #9880ff, 18px 0 0 0 #9880ff, 12.727926px 12.727926px 0 0 rgba(152, 128, 255, 0), 0 18px 0 0 rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 0 rgba(152, 128, 255, 0), -18px 0 0 0 rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 0 rgba(152, 128, 255, 0);
        animation: dot-spin 1.5s infinite linear;
    }

    @keyframes dot-spin {
        0%, 100% {
            box-shadow: 0 -18px 0 0 #9880ff, 12.727926px -12.727926px 0 0 #9880ff, 18px 0 0 0 #9880ff, 12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), 0 18px 0 -5px rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), -18px 0 0 -5px rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0);
        }
        12.5% {
            box-shadow: 0 -18px 0 -5px rgba(152, 128, 255, 0), 12.727926px -12.727926px 0 0 #9880ff, 18px 0 0 0 #9880ff, 12.727926px 12.727926px 0 0 #9880ff, 0 18px 0 -5px rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), -18px 0 0 -5px rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0);
        }
        25% {
            box-shadow: 0 -18px 0 -5px rgba(152, 128, 255, 0), 12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0), 18px 0 0 0 #9880ff, 12.727926px 12.727926px 0 0 #9880ff, 0 18px 0 0 #9880ff, -12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), -18px 0 0 -5px rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0);
        }
        37.5% {
            box-shadow: 0 -18px 0 -5px rgba(152, 128, 255, 0), 12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0), 18px 0 0 -5px rgba(152, 128, 255, 0), 12.727926px 12.727926px 0 0 #9880ff, 0 18px 0 0 #9880ff, -12.727926px 12.727926px 0 0 #9880ff, -18px 0 0 -5px rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0);
        }
        50% {
            box-shadow: 0 -18px 0 -5px rgba(152, 128, 255, 0), 12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0), 18px 0 0 -5px rgba(152, 128, 255, 0), 12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), 0 18px 0 0 #9880ff, -12.727926px 12.727926px 0 0 #9880ff, -18px 0 0 0 #9880ff, -12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0);
        }
        62.5% {
            box-shadow: 0 -18px 0 -5px rgba(152, 128, 255, 0), 12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0), 18px 0 0 -5px rgba(152, 128, 255, 0), 12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), 0 18px 0 -5px rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 0 #9880ff, -18px 0 0 0 #9880ff, -12.727926px -12.727926px 0 0 #9880ff;
        }
        75% {
            box-shadow: 0 -18px 0 0 #9880ff, 12.727926px -12.727926px 0 -5px rgba(152, 128, 255, 0), 18px 0 0 -5px rgba(152, 128, 255, 0), 12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), 0 18px 0 -5px rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), -18px 0 0 0 #9880ff, -12.727926px -12.727926px 0 0 #9880ff;
        }
        87.5% {
            box-shadow: 0 -18px 0 0 #9880ff, 12.727926px -12.727926px 0 0 #9880ff, 18px 0 0 -5px rgba(152, 128, 255, 0), 12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), 0 18px 0 -5px rgba(152, 128, 255, 0), -12.727926px 12.727926px 0 -5px rgba(152, 128, 255, 0), -18px 0 0 -5px rgba(152, 128, 255, 0), -12.727926px -12.727926px 0 0 #9880ff;
        }
    }
    `
}

function createShortcutIcon(link, iconUrl, cssClasses) {
    var htmlForIcon = "<div style=\"display: inline-block;\"><img style=\"height: 30px; width: 30px;\" class=\"" + cssClasses + "\" src=\"" + iconUrl + "\"/></div>"

    var addedIcon = document.createElement('a')
    addedIcon.href = link
    addedIcon.innerHTML = htmlForIcon

    return addedIcon
}
