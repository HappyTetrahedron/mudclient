import * as Api from "./api.js"
import {reactive} from "https://unpkg.com/petite-vue@0.3.0/dist/petite-vue.es.js"

export const store = reactive({
    consoleLines: [],
    consoleInput: "",
    connected: false,
    server: null,
    historyPos: 0,
    draftInput: "",
    lastScrollHeight: 0,

    gameState: {},

    sidebarPane: "none",
    helpPages: [
        {
            file: "looking",
            title: "Sich zurechtfinden",
        },
        {
            file: "interacting",
            title: "Mit der Welt interagieren",
        },
        {
            file: "moving",
            title: "Rumlaufen",
        },
        {
            file: "customizing",
            title: "Deine Spielfigur",
        },
        {
            file: "creating",
            title: "Dinge erstellen",
        },
        {
            file: "building",
            title: "Räume bauen",
        },
        {
            file: "verbs",
            title: "Verben",
        },
        {
            file: "help",
            title: "Sich selber helfen",
        },
    ],
    currentPage: "",

    thing: {
        name: "",
        desc: "",
        use: "",
        ouse: "",
        lock: false,
        fail: "",
        ofail: "",
        createError: "",
    },

    room: {
        name: "",
        desc: "",
        exitNameTo: "",
        exitAliasesTo: "",
        exitNameFrom: "",
        exitAliasesFrom: "",
        teleport: true,
        link: false,
        hasOpenPermission: false,
    },

    get sentLines() {
        return this.consoleLines.filter(it => it.source === "me");
    },

    sendMessage(event) {
        event.preventDefault();
        if (!this.connected) {
            return;
        }
        this.server.send(this.consoleInput);
        this.appendConsoleSendLine(this.consoleInput);
        this.setInput("");
        this.historyPos = 0;
    },

    sendAutoMessage(message) {
        console.log(message);
        this.server.send(message);
        this.appendConsoleAutoSendLine(message);
    },

    processKeyEvent(event) {
        if (event.keyCode == '38') { // up
            event.preventDefault();
            if (this.historyPos === 0) {
                this.draftInput = this.consoleInput;
            }
            this.historyPos = this.historyPos - 1;
            this.consoleInput = this.sentLines.at(this.historyPos).text;
        }
        if (event.keyCode == '40' && this.historyPos < 0) { // down
            event.preventDefault();
            this.historyPos = this.historyPos + 1;
            this.consoleInput = this.historyPos === 0 ? this.draftInput : this.sentLines.at(this.historyPos).text;
        }
    },

    appendConsoleLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'them',
        })
        window.localStorage.setItem("lines", JSON.stringify(this.consoleLines.filter(it => it.source != "meta")));
        this.scrollToBottom();
    },

    appendConsoleSendLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'me',
        })
        window.localStorage.setItem("lines", JSON.stringify(this.consoleLines.filter(it => it.source != "meta")));
        this.scrollToBottom(true);
    },

    appendConsoleAutoSendLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'auto-me',
        })
        window.localStorage.setItem("lines", JSON.stringify(this.consoleLines.filter(it => it.source != "meta")));
        this.scrollToBottom(true);
    },

    appendConsoleMetaLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'meta',
        })
        this.scrollToBottom();
    },

    appendConsoleLines(linesText) {
        var lines = linesText.split('\n')
        lines.forEach(element => {
            this.appendConsoleLine(element);
        });
    },

    autoCreateThing(event) {
        console.log("Creating thing...")
        event.preventDefault();
        if (this.thing.name == "") {
            this.thing.createError = "Please specify a name for your thing.";
            return;
        }
        let name = this.sanitize(this.thing.name);
        this.sendAutoMessage(`@create ${name}`);

        if (this.thing.desc != "") {
            this.sendAutoMessage(`@desc ${name}=${this.sanitize(this.thing.desc)}`);
        }

        if (this.thing.use != "") {
            this.sendAutoMessage(`@use ${name}=${this.sanitize(this.thing.use)}`);
        }

        if (this.thing.ouse != "") {
            this.sendAutoMessage(`@ouse ${name}=${this.sanitize(this.thing.ouse)}`);
        }

        if (this.thing.lock) {
            this.sendAutoMessage(`@lock ${name}=#0`);

            if (this.thing.fail != "") {
                this.sendAutoMessage(`@fail ${name}=${this.sanitize(this.thing.fail)}`);
            }

            if (this.thing.ofail != "") {
                this.sendAutoMessage(`@ofail ${name}=${this.sanitize(this.thing.ofail)}`);
            }
        }

        this.resetThing();
    },

    autoCreateRoom(event) {
        console.log("Creating room...")
        event.preventDefault();
        if (this.room.name == "") {
            this.room.createError = "Please specify a name for your room.";
            return;
        }

        if (this.room.link) {
            if (this.room.exitNameFrom == "" || this.room.exitNameTo == "") {
                this.room.createError = "If you want to link this room up, please specify names for both exits.";
                return;
            }
            let exitTo = this.genExitList(this.room.exitNameTo, this.room.exitAliasesTo)
            let exitFrom = this.genExitList(this.room.exitNameFrom, this.room.exitAliasesFrom)
            if (this.room.hasOpenPermission) {
                this.sendAutoMessage(`@dig ${this.sanitize(this.room.name)}=${exitTo},${exitFrom}`)
            }
            else {
                this.sendAutoMessage(`@dig ${this.sanitize(this.room.name)}`)
                this.sendAutoMessage(`@qmail Alinea/Link Request from %n=Please create an exit named ${exitTo} from [name(loc(me))] ([loc(me)]) to ${this.sanitize(this.room.name)} ([lastcreate(me, R)]), and a corresponding return exit called ${exitFrom}. Thanks :)%r@tel me=[loc(me)]%r@open ${exitTo}=[lastcreate(me, R)]%r@tel me=[lastcreate(me, R)]%r@open ${exitFrom}=[loc(me)]`)
            }
        }
        else {
            this.sendAutoMessage(`@dig ${this.sanitize(this.room.name)}`)
        }

        if (this.room.desc != "") {
            this.sendAutoMessage(`@desc lastcreate(me, R)=${this.sanitize(this.room.desc)}`)
        }

        if (this.room.teleport) {
            this.sendAutoMessage("@tel me=[lastcreate(me, R)]")
        }

        this.resetRoom();

    },

    resetThing() {
        this.thing.createError = "";
        this.thing.name = "";
        this.thing.desc = "";
        this.thing.fail = "";
        this.thing.ofail = "";
        this.thing.use = "";
        this.thing.ouse = "";
    },

    resetRoom() {
        this.room.createError = "";
        this.room.name = "";
        this.room.desc = "";
        this.room.exitNameTo = "";
        this.room.exitNameFrom = "";
        this.room.exitAliasesTo = "";
        this.room.exitAliasesFrom = "";
    },

    sanitize(message) {
        let msg = message.normalize();
        msg = msg.replace(/(?:\r\n|\r|\n)/g, '%r');
        return msg;
    },

    genExitList(exitName, exitAliases) {
        let aliasList = exitAliases.split(',').map(it => it.trim()).map(it => this.sanitize(it)).filter(it => it != "");
        aliasList.unshift(this.sanitize(exitName));
        return aliasList.join(";")
    },

    setInput(consoleInput) {
        this.consoleInput = consoleInput;
    },

    setConnected(connected) {
        this.connected = connected;
    },

    setGameState(state)  {
        this.gameState = state
    },

    closeSidebar(evt) {
        this.sidebarPane = "none";
    },

    activateHelp(evt) {
        this.sidebarPane = "help";
    },

    activateState(evt) {
        this.sidebarPane = "state";
    },

    activateThingCreator(evt) {
        this.sidebarPane = "thingcreator";
    },

    activateRoomCreator(evt) {
        this.sidebarPane = "roomcreator";
    },

    switchDoc(newPage) {
        this.currentPage = newPage;
        updatePageContent(this.currentPage);
    },

    scrollToBottom (force) {
        setTimeout(() => {
            let scrollback = document.getElementById("scrollback");
            if (force || scrollback.scrollTop >= this.lastScrollHeight - 100 - scrollback.clientHeight ) {
                scrollback.scrollTop = scrollback.scrollHeight;
            }
            this.lastScrollHeight = scrollback.scrollHeight
        }, 10)
    },

    async init() {
        try {
            var lines = window.localStorage.getItem("lines");
            if (!!lines) {
                this.consoleLines = JSON.parse(lines);
            }
            this.server = await Api.connect();
            this.server.onmessage = function(evt) {
                this.appendConsoleLines(evt.data);
            }.bind(this);
            this.server.onclose = function(evt) {
                this.appendConsoleMetaLine("Connection closed. Refresh to re-connect.")
                this.setConnected(false);
            }.bind(this);
            this.connected = true;
            setInterval(() => {
                Api.fetchApi().then(json => this.setGameState(json))
            }, 5000)
            this.scrollToBottom(true);
        }
        catch (error) {
            console.log("Could not establish websocket connection.", error);
            this.appendConsoleMetaLine("Unable to connect. Try refreshing, or yell at Aline if that also doesn't work.")
        }
    }
})

let updatePageContent = async (page) => {
    let resp = await fetch(`/docs/${page}.html`);
    let text = await resp.text();
    document.getElementById("manual-content").innerHTML = text;
}
