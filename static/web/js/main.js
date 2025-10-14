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
});