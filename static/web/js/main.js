document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
});