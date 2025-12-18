/* global Sanscript */

function toggleBreaks(checkbox) { document.getElementById("content").classList.toggle("show-breaks", checkbox.checked); }
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
window.toggleViewMode = toggleViewMode;

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
window.toggleCorrections = toggleCorrections;

function toggleLineBreaks(checkbox) { document.getElementById("content").classList.toggle("show-line-breaks", checkbox.checked); }
window.toggleLineBreaks = toggleLineBreaks;

function toggleLocationMarkers() { document.getElementById("content").classList.toggle("hide-location-markers"); }
window.toggleLocationMarkers = toggleLocationMarkers;

function alignAndToggleTocPanel() {
    const tocButton = document.getElementById('toc-button');
    const tocPanel = document.getElementById('toc-panel');
    if (!tocButton || !tocPanel) return;

    const rect = tocButton.getBoundingClientRect();
    tocPanel.style.top = `${rect.top}px`;

    togglePanel('toc-panel');
}

document.addEventListener('DOMContentLoaded', () => {
    const tocButton = document.getElementById('toc-button');
    if (tocButton) {
        tocButton.addEventListener('click', alignAndToggleTocPanel);
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
            return;
        }

        if (transliteratedContent[targetScheme]) {
            contentDiv.innerHTML = transliteratedContent[targetScheme];
            reapplyCorrections();
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
                parent.classList.contains('location-marker')) {
                continue;
            }

            if (node.nodeValue && node.nodeValue.trim().length > 0) {
                node.nodeValue = Sanscript.t(node.nodeValue, 'iast', targetScheme);
            }
        }
        
        transliteratedContent[targetScheme] = tempDiv.innerHTML;
        contentDiv.innerHTML = tempDiv.innerHTML;
        reapplyCorrections();
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
