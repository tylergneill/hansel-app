/* builds weight map for every character */
const saWeight = (() => {
  const order = [
    "",
    "a", "ā", "i", "ī", "u", "ū", "ṛ", "ṝ", "ḷ", "ḹ", "e", "ai", "o", "au",
    "k", "kh", "g", "gh", "ṅ",
    "c", "ch", "j", "jh", "ñ",
    "ṭ", "ṭh", "ḍ", "ḍh", "ṇ",
    "t", "th", "d", "dh", "n",
    "p", "ph", "b", "bh", "m",
    "y", "r", "l", "v",
    "ś", "ṣ", "s", "h",
    "ṃ", "ḥ",
  ];
  const w = {};
  order.forEach((ch, i) => w[ch] = i + 1);   // 1-based weights
  return w;
})();

/* turns full string into a big sortable key. */
function saKey(str) {
  return str
    .toLowerCase()
    .normalize('NFC')
    .replace(/./g, ch => String(saWeight[ch] || 999).padStart(3, '0'));
    // "āi"  →  "002011"  (for table above)
}

