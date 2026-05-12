const button = document.getElementById("ChangeModeButton");

button.addEventListener("click", () => {
    const html = document.documentElement;

    if (html.getAttribute("data-bs-theme") === "dark") {
        html.setAttribute("data-bs-theme", "light");
        button.textContent = "Dark Mode";

    } else {
        html.setAttribute("data-bs-theme", "dark");
        button.textContent = "Light Mode";

        // button.classList.remove("btn-outline-dark");
        // button.classList.add("btn-outline-light");
    }
});