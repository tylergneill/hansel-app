document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".toggle-caret").forEach(caret => {
        caret.addEventListener("click", function(event) {
            let li = this.closest(".file-item"); // Find the parent <li>

            if (li) {
                event.preventDefault(); // Prevent default summary behavior only when we are handling the event
                if (li.classList.contains("open")) {
                    li.classList.remove("open");
                } else {
                    li.classList.add("open");
                }
            }
        });
    });

    document.querySelectorAll(".faq-question, .custom-bundle-link").forEach(question => {
        question.addEventListener("click", function(event) {
            event.preventDefault();
            let li = this.closest(".file-item");
            let details = this.nextElementSibling;

            if (li.classList.contains("open")) {
                li.classList.remove("open");
                if (details) {
                    details.open = false;
                }
            } else {
                li.classList.add("open");
                if (details) {
                    details.open = true;
                }
            }
        });
    });
});
