import * as Api from "./api.js"
import {reactive} from "https://unpkg.com/petite-vue@0.3.0/dist/petite-vue.es.js"

export const store = reactive({
    consoleLines: [],
    consoleInput: "",
    connected: false,
    server: null,
    historyPos: 0,
    draftInput: "",

    get sentLines() {
        return this.consoleLines.filter(it => it.source === "me");
    },

    get consoleLinesReversed() {
        var copy = this.consoleLines.map(it => it);
        copy.reverse();
        return copy;
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
    },

    appendConsoleSendLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'me',
        })
        window.localStorage.setItem("lines", JSON.stringify(this.consoleLines.filter(it => it.source != "meta")));
    },

    appendConsoleMetaLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'meta',
        })
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
        }
        catch (error) {
            console.log("Could not establish websocket connection.", error);
            this.appendConsoleMetaLine("Unable to connect. Try refreshing, or yell at Aline if that also doesn't work.")
        }
    }
})
