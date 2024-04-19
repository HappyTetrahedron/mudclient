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
            file: "verbs",
            title: "Verben",
        },
    ],
    currentPage: "",


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
        this.scrollToBottom();
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
