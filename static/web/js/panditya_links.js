/* When HANSEL runs locally or on staging, point its Pāṇḍitya links at the
   Pāṇḍitya running alongside it.

   The markup carries the production URL (https://panditya.info/...), built
   in utils.get_panditya_url -- that is the real one, and what production
   shows. This rewrites it in the browser only off production, so a local or
   staging HANSEL can be tested against a local or staging Pāṇḍitya with data
   that is not yet released:

     HANSEL local   (:5052)                  -> Pāṇḍitya local   (:5042)
     HANSEL staging (hansel-stg.duckdns.org) -> Pāṇḍitya staging (panditya-stg.duckdns.org)

   Same pattern as Sāgarasaṅgama's docs/local-links.js. */

const PANDITYA_PROD = "https://panditya.info/";
const PANDITYA_LOCAL_PORT = 5042;
const PANDITYA_BY_HOST = {
  "hansel-stg.duckdns.org": "https://panditya-stg.duckdns.org/",
};

/* "Local" means reachable on this machine or this LAN, not just loopback, so
   that HANSEL opened from a phone at 192.168.x.x:5052 links back to the same
   host's Pāṇḍitya. Private ranges only: a public hostname is a deployment. */
const PRIVATE_IPV4 = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function isLocal(hostname) {
  return hostname === "localhost"
      || hostname === "[::1]"
      || hostname === "::1"
      || hostname.endsWith(".localhost")
      || hostname.endsWith(".local")   // mDNS, e.g. my-mac.local
      || PRIVATE_IPV4.test(hostname);
}

function pandityaBase() {
  if (isLocal(location.hostname)) return `http://${location.hostname}:${PANDITYA_LOCAL_PORT}/`;
  return PANDITYA_BY_HOST[location.hostname] || null;
}

/* The URL to use for a Pāṇḍitya link on this host: unchanged on production
   or for anything that is not a Pāṇḍitya link. Keeps the path and query, so
   a link to a particular work's network survives the swap. Called by the
   table view's renderer, which draws its links after the page has loaded. */
function localizePandityaUrl(url) {
  const base = pandityaBase();
  if (!base || !url || !url.startsWith(PANDITYA_PROD)) return url;
  return base + url.slice(PANDITYA_PROD.length);
}

/* Links already in the page (the list view). */
document.addEventListener("DOMContentLoaded", () => {
  if (!pandityaBase()) return;
  for (const a of document.querySelectorAll(`a[href^="${PANDITYA_PROD}"]`)) {
    a.href = localizePandityaUrl(a.getAttribute("href"));
    a.dataset.localized = "true";  // visible in devtools when a link surprises you
  }
});
