document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".toggle-caret").forEach(caret => {
        caret.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default summary behavior
            let li = this.closest(".file-item"); // Find the parent <li>

            if (li.classList.contains("open")) {
                li.classList.remove("open");
            } else {
                li.classList.add("open");
            }
        });
    });
});
