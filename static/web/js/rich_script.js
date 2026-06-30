/* global Sanscript */

function applyPdfHrefs() {
    const mapping = window.HANSEL_PDF_MAPPING;
    if (!mapping || !mapping.url || !mapping.offsets) return;

    const url = mapping.url;
    const offsets = mapping.offsets.slice().sort((a, b) => a[0] - b[0]);

    let pageNumberRegex;
    const archiveOrgRegex = /(.*\/page\/n)(\d+)(\/mode\/.*)/;
    const googleBooksRegex = /(.*&pg=GBS\.PP)(\d+)(.*)/;
    const hathiTrustRegex = /(.*&seq=)(\d+)(.*)/;

    if (archiveOrgRegex.test(url)) {
        pageNumberRegex = archiveOrgRegex;
    } else if (googleBooksRegex.test(url)) {
        pageNumberRegex = googleBooksRegex;
    } else if (hathiTrustRegex.test(url)) {
        pageNumberRegex = hathiTrustRegex;
    } else if (/[?&]page=\d+/.test(url)) {
        pageNumberRegex = /(.*[?&]page=)(\d+)(.*)/;
    } else if (/\/page\/\d+/.test(url)) {
        pageNumberRegex = /(.*\/page\/)(\d+)(.*)/;
    } else if (/\d+$/.test(url)) {
        pageNumberRegex = /^(.*?)(\d+)$/;
    }

    document.querySelectorAll('a.pb-label').forEach(label => {
        const editionPage = parseInt(label.dataset.page, 10);
        if (isNaN(editionPage)) return;

        let applicableOffset = [0, 0];
        for (const offset of offsets) {
            if (offset[0] <= editionPage) {
                applicableOffset = offset;
            } else {
                break;
            }
        }

        const pdfPage = editionPage + (applicableOffset[1] - applicableOffset[0]);
        label.href = pageNumberRegex ? url.replace(pageNumberRegex, `$1${pdfPage}$3`) : url;
    });
}

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

document.addEventListener('DOMContentLoaded', () => {
    applyPdfHrefs();

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

    // Transliteration logic
    const transliterationSchemeSelect = document.getElementById('transliteration-scheme');
    const showAllSchemesCheckbox = document.getElementById('show-all-schemes-checkbox');
    const contentDiv = document.getElementById('content');

    if (!contentDiv || !transliterationSchemeSelect) {
        return;
    }

    const originalContent = contentDiv.innerHTML;
    const transliteratedContent = {};

    const allSchemes = {
        "Roman": ["hk", "iast", "iso", "itrans", "slp1", "velthuis", "wx"],
        "Brahmic": ["bengali", "devanagari", "grantha", "gujarati", "kannada", "malayalam", "oriya", "telegu"]
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

    function populateSchemesDropdown(showAll) {
        transliterationSchemeSelect.innerHTML = ''; 

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
                transliterationSchemeSelect.appendChild(optgroup);
            }
        } else {
            defaultSchemes.forEach(scheme => {
                const option = document.createElement('option');
                option.value = scheme;
                option.innerText = schemeDisplayNames[scheme] || scheme.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                transliterationSchemeSelect.appendChild(option);
            });
        }
    }

    function transliterate(targetScheme) {
        const reapplyCorrections = () => {
            const correctionsToggle = document.querySelector('input[onchange="toggleCorrections(this)"]');
            if (correctionsToggle) toggleCorrections(correctionsToggle);
        };

        if (targetScheme === 'iast') {
            contentDiv.innerHTML = originalContent;
            reapplyCorrections();
            applyPdfHrefs();
            return;
        }

        if (transliteratedContent[targetScheme]) {
            contentDiv.innerHTML = transliteratedContent[targetScheme];
            reapplyCorrections();
            applyPdfHrefs();
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalContent;

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

        transliteratedContent[targetScheme] = tempDiv.innerHTML;
        contentDiv.innerHTML = tempDiv.innerHTML;
        reapplyCorrections();
        applyPdfHrefs();
    }

    transliterationSchemeSelect.addEventListener('change', (e) => {
        const selectedScheme = e.target.value;
        localStorage.setItem('selectedTransliterationScheme', selectedScheme);
        transliterate(selectedScheme);
    });

    showAllSchemesCheckbox.addEventListener('change', (e) => {
        const showAll = e.target.checked;
        localStorage.setItem('showAllTransliterationSchemes', showAll);
        const currentSelection = transliterationSchemeSelect.value;
        populateSchemesDropdown(showAll);
        transliterationSchemeSelect.value = currentSelection;
    });

    const savedScheme = localStorage.getItem('selectedTransliterationScheme') || 'iast';
    const savedShowAll = localStorage.getItem('showAllTransliterationSchemes') === 'true';

    showAllSchemesCheckbox.checked = savedShowAll;
    populateSchemesDropdown(savedShowAll);
    
    transliterationSchemeSelect.value = savedScheme;
    
    if (savedScheme !== 'iast') {
        transliterate(savedScheme);
    }

    // Font family controls
    const fontFamilySelect = document.getElementById('font-family-select');
    const fontFamilyMap = {
        'tiro': "'Tiro Sanskrit', 'Tiro Devanagari Sanskrit', serif",
        'sans': "sans-serif",
        'noto': "'Noto Sans', 'Noto Sans Devanagari', sans-serif",
    };
    if (fontFamilySelect) {
        const savedFont = localStorage.getItem('hanselFontFamily');
        if (savedFont && fontFamilyMap[savedFont]) {
            fontFamilySelect.value = savedFont;
            contentDiv.style.fontFamily = fontFamilyMap[savedFont];
        }
        fontFamilySelect.addEventListener('change', (e) => {
            const key = e.target.value;
            const family = fontFamilyMap[key] || '';
            contentDiv.style.fontFamily = family;
            localStorage.setItem('hanselFontFamily', key);
        });
    }

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
