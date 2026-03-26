/* global Sanscript */

/**
 * Preserve scroll position across a toggle action.
 * Finds a visible reference element, records its viewport offset,
 * runs the action, then scrolls to restore the element's position.
 *
 * @param {Function} action - The toggle action to perform.
 * @param {string} [selector] - CSS selector for anchor candidates.
 *   Defaults to a broad set including div.lg. For toggles that swap
 *   .rich-text/.plain-text elements (search-friendly), pass
 *   STABLE_ANCHOR_SELECTOR to avoid anchoring on elements that get hidden.
 */
const STABLE_ANCHOR_SELECTOR = 'h1, h2, h3, li.verse, p:not(.rich-text):not(.plain-text)';
const DEFAULT_ANCHOR_SELECTOR = 'h1, h2, h3, p, li, div.lg, div.section-head';

function findAnchor(candidates) {
    let anchor = null;
    let anchorOffset = 0;
    let wasHidden = false;

    for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= -50 && rect.height > 0) {
            anchor = el;
            anchorOffset = rect.top;
            break;
        }
        // If element is near viewport scroll position but hidden (e.g. a
        // location marker with display:none), temporarily reveal it to measure.
        if (rect.height === 0 && getComputedStyle(el).display === 'none') {
            el.style.display = 'block';
            const revealedRect = el.getBoundingClientRect();
            if (revealedRect.top >= -50 && revealedRect.height > 0) {
                anchor = el;
                anchorOffset = revealedRect.top;
                wasHidden = true;
                el.style.display = '';
                break;
            }
            el.style.display = '';
        }
    }

    return { anchor, anchorOffset, wasHidden };
}

function withScrollPreservation(action, selector) {
    const content = document.getElementById('content');
    if (!content) { action(); return; }

    const candidates = content.querySelectorAll(selector || DEFAULT_ANCHOR_SELECTOR);
    const { anchor, anchorOffset, wasHidden } = findAnchor(candidates);

    action();

    if (anchor) {
        // If the anchor was hidden before, temporarily show it again to measure
        if (wasHidden && getComputedStyle(anchor).display === 'none') {
            anchor.style.display = 'block';
            const newRect = anchor.getBoundingClientRect();
            window.scrollBy(0, newRect.top - anchorOffset);
            anchor.style.display = '';
        } else {
            const newRect = anchor.getBoundingClientRect();
            window.scrollBy(0, newRect.top - anchorOffset);
        }
    }
}

function toggleBreaks(checkbox) {
    withScrollPreservation(() => {
        document.getElementById("content").classList.toggle("show-breaks", checkbox.checked);
    });
}
window.toggleBreaks = toggleBreaks;

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const mobileIcon = document.getElementById('toggles-widget-icon');
    const isTargetCurrentlyOpen = panel.style.display === 'block';

    // First, close all panels
    const allPanels = document.querySelectorAll('.panel');
    allPanels.forEach(p => {
        p.style.display = 'none';
    });

    // Now, handle the target panel and the icon
    if (isTargetCurrentlyOpen) {
        // If the panel we clicked to toggle was already open, we just keep it closed.
        panel.style.display = 'none';
        if (mobileIcon) mobileIcon.style.display = 'block'; // Always show icon when all panels are closed
    } else {
        // If the panel was closed, we open it.
        panel.style.display = 'block';
        // And only hide the icon if the toggles-widget itself was the one opened.
        if (panelId === 'toggles-widget') {
            if (mobileIcon) mobileIcon.style.display = 'none';
        } else {
            if (mobileIcon) mobileIcon.style.display = 'block';
        }
    }
}
window.togglePanel = togglePanel;

function toggleViewMode(checkbox) {
    withScrollPreservation(() => {
        document.body.classList.toggle('simple-view', checkbox.checked);
        const tocWidget = document.getElementById('toc-widget-container');
        const metadataWidget = document.getElementById('metadata-widget-container');
        const richTextToggles = document.querySelectorAll('.rich-text-toggle');

        if (checkbox.checked) {
            if(tocWidget) tocWidget.style.display = 'none';
            if(metadataWidget) metadataWidget.style.display = 'none';
            richTextToggles.forEach(toggle => toggle.style.display = 'none');
        } else {
            if(tocWidget) tocWidget.style.display = 'block';
            if(metadataWidget) metadataWidget.style.display = 'block';
            richTextToggles.forEach(toggle => toggle.style.display = 'flex');
        }
    }, STABLE_ANCHOR_SELECTOR);
}
window.toggleViewMode = toggleViewMode;

function toggleCorrections(checkbox) {
    withScrollPreservation(() => {
        const content = document.getElementById('content');
        if (!content) return;

        const anteCorrectionElements = content.querySelectorAll('.ante-correction');
        const postCorrectionElements = content.querySelectorAll('.post-correction');

        if (checkbox.checked) { // Show post-correction
            anteCorrectionElements.forEach(el => el.style.display = 'none');
            postCorrectionElements.forEach(el => el.style.display = 'inline');
        } else { // Show ante-correction (default)
            anteCorrectionElements.forEach(el => el.style.display = 'inline');
            postCorrectionElements.forEach(el => el.style.display = 'none');
        }
    });
}
window.toggleCorrections = toggleCorrections;

function toggleLineBreaks(checkbox) {
    withScrollPreservation(() => {
        document.getElementById("content").classList.toggle("show-line-breaks", checkbox.checked);
    });
}
window.toggleLineBreaks = toggleLineBreaks;

function toggleEditorialCoords(checkbox) {
    withScrollPreservation(() => {
        document.getElementById("content").classList.toggle("hide-editorial-coords", !checkbox.checked);
    });
}
window.toggleEditorialCoords = toggleEditorialCoords;

function toggleChaya(checkbox) { document.getElementById("content").classList.toggle("hide-chaya", !checkbox.checked); }
window.toggleChaya = toggleChaya;

function alignAndToggleTocPanel() {
    const tocButton = document.getElementById('toc-button');
    const tocPanel = document.getElementById('toc-panel');
    if (!tocButton || !tocPanel) return;

    const rect = tocButton.getBoundingClientRect();
    tocPanel.style.top = `${rect.top}px`;

    togglePanel('toc-panel');
}

// --- Transliteration state (module-level so pageshow can re-apply settings) ---

const allSchemes = {
    "Roman": ["hk", "iast", "iso", "itrans", "slp1", "velthuis", "wx"],
    "Brahmic": ["bengali", "devanagari", "gujarati", "kannada", "malayalam", "oriya", "sinhala", "tamil"]
};
const defaultSchemes = ["iast", "devanagari", "hk", "iso", "itrans"];
const schemeDisplayNames = {
    "iast": "IAST",
    "hk": "HK",
    "itrans": "ITRANS",
    "slp1": "SLP1",
    "velthuis": "Velthuis",
    "iso": "ISO 15919",
    "wx": "WX"
};

let _spacedContent = null;         // captured once from DOM on first load
let _originalContent = null;       // active base: either spaced or unspaced
let _transliteratedContent = {};   // cache, keyed by scheme

function populateSchemesDropdown(showAll) {
    const select = document.getElementById('transliteration-scheme');
    if (!select) return;
    select.innerHTML = '';
    if (showAll) {
        for (const group in allSchemes) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            allSchemes[group].forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme;
                option.innerText = schemeDisplayNames[scheme] || scheme.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
    } else {
        defaultSchemes.forEach(scheme => {
            const option = document.createElement('option');
            option.value = scheme;
            option.innerText = schemeDisplayNames[scheme] || scheme.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            select.appendChild(option);
        });
    }
}

function transliterate(targetScheme) {
    const contentDiv = document.getElementById('content');
    if (!contentDiv || _originalContent === null) return;

    const reapplyCorrections = () => {
        const correctionsToggle = document.querySelector('input[onchange="toggleCorrections(this)"]');
        if (correctionsToggle) toggleCorrections(correctionsToggle);
    };

    if (targetScheme === 'iast') {
        contentDiv.innerHTML = _originalContent;
        reapplyCorrections();
        return;
    }

    if (_transliteratedContent[targetScheme]) {
        contentDiv.innerHTML = _transliteratedContent[targetScheme];
        reapplyCorrections();
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = _originalContent;

    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (parent.classList.contains('lb-label') ||
            parent.classList.contains('pb-label') ||
            parent.classList.contains('editorial-coord')) {
            continue;
        }
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
            node.nodeValue = Sanscript.t(node.nodeValue, 'iast', targetScheme);
        }
    }

    _transliteratedContent[targetScheme] = tempDiv.innerHTML;
    contentDiv.innerHTML = tempDiv.innerHTML;
    reapplyCorrections();
}

function applyViewerSettings() {
    const contentDiv = document.getElementById('content');
    const select = document.getElementById('transliteration-scheme');
    if (!contentDiv || !select) return;

    const savedScheme = localStorage.getItem('selectedTransliterationScheme') || 'iast';
    const savedShowAll = localStorage.getItem('showAllTransliterationSchemes') === 'true';
    const savedUnspaced = localStorage.getItem('unspacedText') === 'true';

    const viewerConfig = document.getElementById('viewer-config');
    const unspacedHtmlUrl = viewerConfig ? viewerConfig.dataset.unspacedHtmlUrl : '';

    // Reset cached transliterations — source content may be changing
    _transliteratedContent = {};

    populateSchemesDropdown(savedShowAll);
    select.value = savedScheme;

    function applyScheme() {
        if (savedScheme !== 'iast') {
            transliterate(savedScheme);
        }
    }

    if (_spacedContent === null) {
        _spacedContent = contentDiv.innerHTML;
    }

    if (savedUnspaced && unspacedHtmlUrl) {
        fetch(unspacedHtmlUrl)
            .then(r => r.text())
            .then(html => {
                contentDiv.innerHTML = html;
                _originalContent = html;
                applyScheme();
            });
    } else {
        contentDiv.innerHTML = _spacedContent;
        _originalContent = _spacedContent;
        applyScheme();
    }
}

window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        applyViewerSettings();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const tocButton = document.getElementById('toc-button');
    if (tocButton) {
        tocButton.addEventListener('click', alignAndToggleTocPanel);
    }
    const tocList = document.getElementById('toc-list');
    if (tocList) {
        tocList.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                togglePanel('toc-panel');
            }
        });
    }
    const metadataButton = document.getElementById('metadata-button');
    if (metadataButton) {
        metadataButton.addEventListener('click', () => togglePanel('metadata-panel'));
    }

    const mobileControlsIcon = document.getElementById('toggles-widget-icon');
    if (mobileControlsIcon) {
        mobileControlsIcon.addEventListener('click', () => togglePanel('toggles-widget'));
    }
    const closeButton = document.getElementById('toggles-widget-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => togglePanel('toggles-widget'));
    }

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        const openPanel = document.querySelector('.panel[style*="display: block"]');
        if (!openPanel) return;

        const clickedInsidePanel = e.target.closest('.panel');
        const clickedToggle = e.target.closest('#metadata-button, #toc-button, #toggles-widget-icon, #toggles-widget-close-button');
        if (!clickedInsidePanel && !clickedToggle) {
            openPanel.style.display = 'none';
            const mobileIcon = document.getElementById('toggles-widget-icon');
            if (mobileIcon) mobileIcon.style.display = 'block';
        }
    });

    const correctionsListItem = document.getElementById('corrections-list-container');
    if (correctionsListItem) {
        const title = correctionsListItem.querySelector('b');
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => {
            const table = correctionsListItem.querySelector('table');
            const caret = title.querySelector('.caret');
            const isHidden = table.style.display === 'none';
            table.style.display = isHidden ? 'table' : 'none';
            caret.classList.toggle('collapsed', !isHidden);
        });
    }

    const infoIcon = document.getElementById('corrections-info-icon');
    if (infoIcon) {
        infoIcon.addEventListener('click', () => {
            const metadataPanel = document.getElementById('metadata-panel');
            const correctionsListContainer = document.getElementById('corrections-list-container');

            if (metadataPanel) {
                togglePanel('metadata-panel');
            }

            if (correctionsListContainer) {
                const title = correctionsListContainer.querySelector('b');
                const table = correctionsListContainer.querySelector('table');
                const caret = title.querySelector('.caret');
                
                // Expand the corrections list
                table.style.display = 'table';
                caret.classList.remove('collapsed');

                // Wait for animations to finish before scrolling
                setTimeout(() => {
                    correctionsListContainer.scrollIntoView({ behavior: 'smooth' });
                }, 500); // Match the CSS transition duration
            }
        });
    }

    // Navigation for correction entries
    if (correctionsListItem) {
        correctionsListItem.addEventListener('click', (e) => {
            const link = e.target.closest('.correction-link');
            if (link) {
                let target = null;
                
                console.log('Correction click:', link.dataset);

                if (link.dataset.verse) {
                    const targetId = 'v' + link.dataset.verse.replace(/\./g, '-');
                    target = document.getElementById(targetId);
                } else if (link.dataset.locationId && link.dataset.locationId !== 'None') {
                    target = document.getElementById(link.dataset.locationId);
                }

                // Minimal fallback: try finding a pb-label for this page
                if (!target && link.dataset.page) {
                    target = document.querySelector(`.pb-label[data-page="${link.dataset.page}"]`);
                    console.log('Fallback to page label:', target);
                }

                if (target) {
                    // Ensure target is visible if hidden
                    if (getComputedStyle(target).display === 'none') {
                        if (target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'DIV' || target.tagName === 'P') {
                            target.style.display = 'block';
                        } else {
                            target.style.display = 'inline';
                        }
                    }

                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('highlight-correction');
                    setTimeout(() => target.classList.remove('highlight-correction'), 2000);
                    
                    // Close metadata panel if open
                    const metadataPanel = document.getElementById('metadata-panel');
                    if (metadataPanel && metadataPanel.style.display === 'block') {
                        togglePanel('metadata-panel');
                    }
                }
            }
        });
    }

    // Transliteration logic — event listener wiring (runs once on DOMContentLoaded)
    const transliterationSchemeSelect = document.getElementById('transliteration-scheme');
    const contentDiv = document.getElementById('content');

    if (!contentDiv || !transliterationSchemeSelect) {
        return;
    }

    transliterationSchemeSelect.addEventListener('change', (e) => {
        const selectedScheme = e.target.value;
        localStorage.setItem('selectedTransliterationScheme', selectedScheme);
        transliterate(selectedScheme);
    });

    applyViewerSettings();

    // Font size controls
    const FONT_SIZE_STEP = 2;
    const FONT_SIZE_MIN = 10;
    const FONT_SIZE_MAX = 30;
    const FONT_SIZE_DEFAULT = 16;

    function getBaseFontSize() {
        return parseFloat(getComputedStyle(document.documentElement).fontSize) || FONT_SIZE_DEFAULT;
    }

    function setFontSize(size) {
        size = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
        contentDiv.style.fontSize = size + 'px';
        localStorage.setItem('hanselFontSize', size);
    }

    const savedFontSize = localStorage.getItem('hanselFontSize');
    if (savedFontSize) {
        contentDiv.style.fontSize = savedFontSize + 'px';
    }

    const decreaseBtn = document.getElementById('font-size-decrease');
    const increaseBtn = document.getElementById('font-size-increase');
    const resetBtn = document.getElementById('font-size-reset');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            const current = parseFloat(contentDiv.style.fontSize) || getBaseFontSize();
            setFontSize(current - FONT_SIZE_STEP);
        });
    }
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            const current = parseFloat(contentDiv.style.fontSize) || getBaseFontSize();
            setFontSize(current + FONT_SIZE_STEP);
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            contentDiv.style.fontSize = '';
            localStorage.removeItem('hanselFontSize');
        });
    }
});
