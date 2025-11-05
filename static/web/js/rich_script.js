function toggleBreaks(checkbox) { document.getElementById("content").classList.toggle("show-breaks", checkbox.checked); }
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const allPanels = document.querySelectorAll('.panel');
    allPanels.forEach(p => {
        if (p.id !== panelId) {
            p.style.display = 'none';
        }
    });

    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function toggleViewMode(checkbox) {
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
}
function toggleLineBreaks(checkbox) { document.getElementById("content").classList.toggle("show-line-breaks", checkbox.checked); }

function toggleLocationMarkers(checkbox) { document.getElementById("content").classList.toggle("hide-location-markers"); }

function toggleButtonContainer() {
    const buttonContainer = document.querySelector('.toggles-widget-container');
    const mobileIcon = document.getElementById('controls-icon');
    buttonContainer.classList.toggle('expanded');
    if (buttonContainer.classList.contains('expanded')) {
        mobileIcon.style.display = 'none';
    } else {
        mobileIcon.style.display = 'block';
    }
}

function toggleCorrections(checkbox) {
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
}

document.addEventListener('DOMContentLoaded', (event) => {
    const tocButton = document.getElementById('toc-button');
    if (tocButton) {
        tocButton.addEventListener('click', () => togglePanel('toc-panel'));
    }
    const metadataButton = document.getElementById('metadata-button');
    if (metadataButton) {
        metadataButton.addEventListener('click', () => togglePanel('metadata-panel'));
    }

    const mobileControlsIcon = document.getElementById('controls-icon');
    if (mobileControlsIcon) {
        mobileControlsIcon.addEventListener('click', toggleButtonContainer);
    }
    const closeButton = document.getElementById('toggles-widget-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', toggleButtonContainer);
    }

    const correctionsListItem = document.getElementById('corrections-list-container');
    if (correctionsListItem) {
        const title = correctionsListItem.querySelector('b');
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => {
            const table = correctionsListItem.querySelector('table');
            const caret = title.querySelector('.caret');
            const isHidden = table.style.display === 'none';
            table.style.display = isHidden ? 'table' : 'none';
            caret.textContent = isHidden ? '▼' : '▶';
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
                caret.textContent = '▼';

                // Wait for animations to finish before scrolling
                setTimeout(() => {
                    correctionsListContainer.scrollIntoView({ behavior: 'smooth' });
                }, 500); // Match the CSS transition duration
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
        "Brahmic": ["bengali", "devanagari", "gujarati", "kannada", "malayalam", "oriya", "sinhala", "tamil"]
    };
    const defaultSchemes = ["iast", "devanagari", "hk", "itrans"];
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
        if (targetScheme === 'iast') {
            contentDiv.innerHTML = originalContent;
            return;
        }

        if (transliteratedContent[targetScheme]) {
            contentDiv.innerHTML = transliteratedContent[targetScheme];
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalContent;

        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while(node = walker.nextNode()) {
            if (/[āīūṛṝḷḹṃḥñṭḍṇśṣĀĪŪṚṜḶḸṂḤÑṬḌṆŚṢ]/.test(node.nodeValue)) {
                node.nodeValue = Sanscript.t(node.nodeValue, 'iast', targetScheme);
            }
        }
        
        transliteratedContent[targetScheme] = tempDiv.innerHTML;
        contentDiv.innerHTML = tempDiv.innerHTML;
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
});
