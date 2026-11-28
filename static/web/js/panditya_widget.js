/* Try out the Pāṇḍitya widget on HANSEL (branch panditya-widget).

   Loads Pāṇḍitya's embeddable widget (its /widget.js) and has the "View
   Network on Pāṇḍitya" links open it over the page. Which Pāṇḍitya follows
   panditya_links.js (local HANSEL -> local Pāṇḍitya, staging -> staging,
   production -> production), so load this after that file. */

const DEFAULT_BASE = () => pandityaBase() || PANDITYA_CHOICES.prod;  // pandityaBase(): panditya_links.js

/* Pick which Pāṇḍitya to load the widget from.

   By default this follows the site: a local copy (localhost or a private-network
   address) uses the local Pāṇḍitya on port 5042, anything else uses production.
   To try another one, add ?panditya=local, ?panditya=stg or ?panditya=prod to
   the page's address; the choice is remembered for this browser tab
   (sessionStorage). Only these fixed choices are accepted, since the widget is a
   script this page runs. */
const PANDITYA_CHOICES = {
  prod: "https://panditya.info/",
  stg: "https://panditya-stg.duckdns.org/",
  local: `http://${location.hostname}:5042/`,
};
const PANDITYA_CHOICE_KEY = "panditya-widget-source";

function pandityaWidgetBase() {
  const asked = new URLSearchParams(location.search).get("panditya");
  try {
    if (asked in PANDITYA_CHOICES) sessionStorage.setItem(PANDITYA_CHOICE_KEY, asked);
    const remembered = sessionStorage.getItem(PANDITYA_CHOICE_KEY);
    if (remembered in PANDITYA_CHOICES) return PANDITYA_CHOICES[remembered];
  } catch (e) {
    if (asked in PANDITYA_CHOICES) return PANDITYA_CHOICES[asked];  // storage blocked: this page only
  }
  return DEFAULT_BASE();
}

/* Load the widget: a Pāṇḍitya button in the corner, and a panel over the page. */
function loadPandityaWidget(base) {
  const script = document.createElement("script");
  script.src = base + "widget.js";
  script.async = true;
  document.head.appendChild(script);
}

/* "View network on Pāṇḍitya" links (/view?works=...&authors=...) open the
   widget in place of a new tab, while the widget has loaded. Ctrl/Cmd/Shift-click
   still opens the tab, and if the widget didn't load the link works as before.
   One listener on the document, so links drawn later (table rows) work too. */
function openPandityaLinksInWidget() {
  const origins = new Set(Object.values(PANDITYA_CHOICES).map(url => new URL(url).origin));
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element && event.target.closest("a[href]");
    if (!link || !window.Panditya) return;
    const url = new URL(link.href, location.href);
    if (!origins.has(url.origin) || url.pathname !== "/view") return;
    const works = url.searchParams.get("works") || "";
    const authors = url.searchParams.get("authors") || "";
    if (!works && !authors) return;  // e.g. a whole collection: the full page shows that best
    event.preventDefault();
    window.Panditya.open({ works, authors });
  });
}

loadPandityaWidget(pandityaWidgetBase());
openPandityaLinksInWidget();
