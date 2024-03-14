import * as Api from "./api.js"
import {reactive} from "https://unpkg.com/petite-vue@0.3.0/dist/petite-vue.es.js"

export const store = reactive({
    consoleLines: [],
    consoleInput: "",
    connected: false,
    server: null,

    get getExampleInput() {
        return this.consoleInput;
    },

    sendMessage(event) {
        event.preventDefault();
        if (!this.connected) {
            return;
        }
        this.server.send(this.consoleInput);
        this.appendConsoleSendLine(this.consoleInput);
        this.setInput("");
    },

    appendConsoleLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'them',
        })
    },

    appendConsoleSendLine(line) {
        this.consoleLines.push({
            'text': line,
            'source': 'me',
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
            this.server = await Api.connect();
            this.server.onmessage = function(evt) {
                this.appendConsoleLines(evt.data);
            }.bind(this);
            this.server.onclose = function(evt) {
                this.setConnected(false);
            }.bind(this);
            this.connected = true;
        }
        catch (error) {
            console.log("Could not establish websocket connection.", error)
        }
    }
})
