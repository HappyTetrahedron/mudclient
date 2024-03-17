import {createApp} from "https://unpkg.com/petite-vue@0.3.0/dist/petite-vue.es.js"
import {reactive} from "https://unpkg.com/petite-vue@0.3.0/dist/petite-vue.es.js"

let updatePageContent = async (page) => {
    let resp = await fetch(`/docs/${page}.html`);
    let text = await resp.text();
    document.getElementById("help-content").innerHTML = text;
}

let app = createApp(
    reactive(
        {
            currentPage: "looking",

            switchDoc(newPage) {
                this.currentPage = newPage;
                updatePageContent(this.currentPage);
            }
        }
    )
)
app.mount();
