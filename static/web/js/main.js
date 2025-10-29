document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }

    let allExpanded = false;
    const expandCollapseLink = document.getElementById('expand-all-link');

    if (expandCollapseLink) {
        expandCollapseLink.addEventListener('click', function(e) {
            e.preventDefault();
            const allFileItems = document.querySelectorAll('.file-item');

            if (allExpanded) {
                // Collapse all
                allFileItems.forEach(item => {
                    item.classList.remove('open');
                    const details = item.querySelector('details');
                    if (details) {
                        details.open = false;
                    }
                });
                expandCollapseLink.textContent = 'Expand All';
            } else {
                // Expand all
                allFileItems.forEach(item => {
                    item.classList.add('open');
                    const details = item.querySelector('details');
                    if (details) {
                        details.open = true;
                    }
                });
                expandCollapseLink.textContent = 'Collapse All';
            }
            allExpanded = !allExpanded;
        });
    }

    const form = document.getElementById('contact-form');
    if (form) {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-upload');
        const fileList = document.getElementById('file-list');

        // --- Drag and Drop Logic ---
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-area-highlight');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-area-highlight');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-area-highlight');
                fileInput.files = e.dataTransfer.files;
                updateFileList();
            });
            
            fileInput.addEventListener('change', updateFileList);

            function updateFileList() {
                fileList.innerHTML = ''; // Clear existing list
                if (fileInput.files.length > 0) {
                    const list = document.createElement('ul');
                    list.className = 'list-disc pl-5 space-y-1';
                    for (const file of fileInput.files) {
                        const listItem = document.createElement('li');
                        listItem.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                        list.appendChild(listItem);
                    }
                    fileList.appendChild(list);
                }
            }
            
            function clearFileList() {
                fileList.innerHTML = '';
            }
        }
    }

    // dl-dropdown toggle
    document.addEventListener('click', function(event) {
        // Close all open dl-dropdowns that were not the one just clicked
        document.querySelectorAll('.dl-dropdown-menu.show').forEach(function(menu) {
            if (!menu.closest('.dl-dropdown').contains(event.target)) {
                menu.classList.remove('show');
            }
        });

        // Toggle the clicked dl-dropdown
        const dlDropdownToggle = event.target.closest('.dl-dropdown-toggle');
        if (dlDropdownToggle) {
            event.preventDefault();
            const dlDropdownMenu = dlDropdownToggle.nextElementSibling;
            if (dlDropdownMenu) {
                dlDropdownMenu.classList.toggle('show');
            }
        }
    });

    const bundleForm = document.getElementById('bundleForm');
    if (bundleForm) {
        const downloadBtn  = document.getElementById('downloadBtn');
        const sizeContainer = document.getElementById('bundle-size-container');
        const sizeEstimateSpan = document.getElementById('bundle-size-estimate');

        function updateBundleSize() {
            const textFormat = bundleForm.querySelector('input[name="text"]:checked').value;
            const metaFormat = bundleForm.querySelector('input[name="meta"]:checked').value;
    
            let totalSize = 0;
            if (textFormat !== 'none' && fileGroupSizes[textFormat]) {
                totalSize += fileGroupSizes[textFormat];
            }
            if (fileGroupSizes[metaFormat]) {
                totalSize += fileGroupSizes[metaFormat];
            }
    
            const sizeText = `(${totalSize.toFixed(1)} MB)`;
            sizeEstimateSpan.textContent = sizeText;
            sizeContainer.style.display = 'inline';
        }

        bundleForm.addEventListener('change', updateBundleSize);
        updateBundleSize(); // Initial calculation

        if (downloadBtn) {
            const originalButtonText = downloadBtn.textContent;
    
            function currentChoice() {
                const text = bundleForm.querySelector('input[name="text"]:checked').value;
                const meta = bundleForm.querySelector('input[name="meta"]:checked').value;
                return { text, meta };
            }
    
            downloadBtn.onclick = () => {
                const { text, meta } = currentChoice();
    
                // Show a loading indicator
                downloadBtn.textContent = 'Zipping...';
                downloadBtn.disabled = true;
    
                fetch('/downloads/cumulative', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text, metadata: meta }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok.');
                    }
                    const disposition = response.headers.get('content-disposition');
                    let filename = 'hansel-bundle.zip'; // Default filename
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }
                    return response.blob().then(blob => ({ blob, filename }));
                })
                .then(({ blob, filename }) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
    
                    // Reset button
                    downloadBtn.textContent = originalButtonText;
                    downloadBtn.disabled = false;
                })
                .catch(error => {
                    console.error('Download failed:', error);
                    downloadBtn.textContent = 'Error!';
                    // Revert the button after a delay
                    setTimeout(() => {
                        downloadBtn.textContent = originalButtonText;
                        downloadBtn.disabled = false;
                    }, 2000);
                });
            };
        }
    }


});