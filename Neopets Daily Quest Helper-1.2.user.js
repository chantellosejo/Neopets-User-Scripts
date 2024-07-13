// ==UserScript==
// @name         Neopets Daily Quest Helper
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Add a "Go!" button to aid your daily questing
// @author       Harvey, with modifications by chanakin
// @match        https://www.neopets.com/questlog/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neopets.com
// @grant        none
// ==/UserScript==

const SPIN_WHEEL_OF_MEDIOCRITY = {
    text: "Spin Wheel",
    link: "/prehistoric/mediocrity.phtml"
}

const SPIN_WHEEL_OF_EXCITEMENT = {
    text: "Spin Wheel",
    link: "/faerieland/wheel.phtml"
}

const SPIN_WHEEL_OF_MISFORTUNE = {
    text: "Spin Wheel",
    link: "/halloween/wheel/index.phtml"
}

const SPIN_WHEEL_OF_KNOWLEDGE = {
    text: "Spin Wheel",
    link: "/medieval/knowledge.phtml"
}

const MAKE_PURCHASE_GEN_STORE = {
    text: "Visit General Store",
    link: "/generalstore.phtml"
}

const MAKE_PURCHASE_HEALING_SPRINGS = {
    text: "Visit Healing Springs",
    link: "/faerieland/springs.phtml"
}

const MAKE_PURCHASE_BOOK_STORE = {
    text: "Visit Magical Bookshop",
    link: "/objects.phtml?type=shop&obj_type=7"
}

const PLAY_FASHION_FEVER = {
    text: "Play Fashion Fever",
    link: "/games/h5game.phtml?game_id=1391"
}

const CUSTOMIZE = {
    text: "Customize",
    link: "/customise.phtml"
}

const GO_TO_INVENTORY = {
    text: "Go to Inventory",
    link: "/inventory.phtml"
}

const GO_TO_PETS = {
    text: "Go to Pets",
    link: "/home/index.phtml"
}

GM_addStyle (`
    .button-grid2__2020{
     grid-template:auto / repeat(5, 1fr)!important;
     max-width: 4000px !important;
    }`);

function adjustDailyChunks()
{
    var results = document.getElementsByClassName("questlog-quest");
    for (var i = 0; i < results.length; i++)
    {
        var questText = results[i].getElementsByClassName("ql-task-description")[0].innerHTML;
        var questTaskNum = results[i].getElementsByClassName("ql-task-num")
        var questTaskCount = 1;

        if (questTaskNum != null && questTaskNum.length > 0) {
            questTaskCount = Number(questTaskNum[0].innerHTML.split("/").pop())
        }

        var actions = turnQuestTypeToActions(questText, questTaskCount);
        console.log("Actions: " + actions);
        let buttons = results[i].getElementsByClassName("ql-quest-buttons")[0];

        if (actions) {
            actions.forEach((action) => {
                var helpButton = document.createElement("button");
                helpButton.classList.add("button-default__2020");
                helpButton.classList.add("button-yellow__2020");

                var linkWrapper = document.createElement("a");
                linkWrapper.href = action.link

                linkWrapper.appendChild(helpButton);
                linkWrapper.target = "_blank";

                helpButton.innerHTML = action.text;
                buttons.appendChild(linkWrapper);
            });
        }
    }
}

function turnQuestTypeToActions(questText, questTaskCount)
{
    var quest = questText.toLowerCase();

    if (quest.includes("wheel"))
    {
        if(quest.includes("mediocrity"))
        {
            return [SPIN_WHEEL_OF_MEDIOCRITY];
        }

        if (quest.includes("excitement"))
        {
            return [SPIN_WHEEL_OF_EXCITEMENT];
        }

        if (quest.includes("misfortune"))
        {
            return [SPIN_WHEEL_OF_MISFORTUNE];
        }

        if (quest.includes("knowledge"))
        {
            return [SPIN_WHEEL_OF_KNOWLEDGE];
        }

        return null
    }

    if (quest.includes("purchase"))
    {
        switch (questTaskCount) {
            case 2: {
                console.log("2 tasks");
                return [MAKE_PURCHASE_HEALING_SPRINGS, MAKE_PURCHASE_GEN_STORE];
            }

            case 3: {

                return [MAKE_PURCHASE_HEALING_SPRINGS, MAKE_PURCHASE_GEN_STORE, MAKE_PURCHASE_BOOK_STORE];
            }

            default: {
                return [MAKE_PURCHASE_HEALING_SPRINGS];
            }
        }
    }

    if (quest.includes("game"))
    {
        return [PLAY_FASHION_FEVER];
    }

    if (quest.includes("customise"))
    {
        return [CUSTOMIZE];
    }

    return [GO_TO_INVENTORY, GO_TO_PETS];
}

adjustDailyChunks();


function GM_addStyle(css) {
  const style = document.getElementById("GM_addStyleBy8626") || (function() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = "GM_addStyleBy8626";
    document.head.appendChild(style);
    return style;
  })();
  const sheet = style.sheet;
  sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
}