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
});