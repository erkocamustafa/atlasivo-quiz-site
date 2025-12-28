// --- Eleman Seçimi ---
const navbar = document.querySelector(".navbar");

/* buttons */
const menuBtn = document.querySelector("#menu-btn");

menuBtn.addEventListener("click", function () {
  navbar.classList.toggle("active");
  document.addEventListener("click", function (event) {
    if (
      !event.composedPath().includes(menuBtn) &&
      !event.composedPath().includes(navbar)
    ) {
      navbar.classList.remove("active");
    }
  });
});
