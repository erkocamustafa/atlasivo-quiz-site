import { fetchManifest } from "./data.js";

const grid = document.getElementById("grid");
const filters = document.getElementById("filters");
const data = await fetchManifest();

document.getElementById("clearFilters").onclick = () => {
  activeCats = new Set();
  document
    .querySelectorAll("#filters .chip.on")
    .forEach((b) => b.classList.remove("on"));
  document.getElementById("qsearch").value = "";
  query = "";
  render();
};

// 1) Kategorileri sırala (önce tercih ettiklerin)
const PREFERRED = [
  "geography",
  "history",
  "science",
  "movies",
  "music",
  "sports",
  "travel",
  "lifestyle",
  "personality",
  "knowledge",
  "fun",
  "food",
  "tech",
  "gaming",
];
const existing = [...new Set(data.flatMap((q) => q.categories || []))];
const cats = [
  ...PREFERRED.filter((c) => existing.includes(c)),
  ...existing.filter((c) => !PREFERRED.includes(c)),
];

// 2) Arama kutusu + chip’leri çiz
filters.insertAdjacentHTML(
  "beforebegin",
  `
  <input id="qsearch" placeholder="Search quizzes..." class="search-input">
`
);
filters.innerHTML = cats
  .map((c) => `<button class="chip" data-c="${c}">${c}</button>`)
  .join("");

let activeCats = new Set();
let query = "";

filters.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const c = b.dataset.c;
  b.classList.toggle("on");
  b.classList.contains("on") ? activeCats.add(c) : activeCats.delete(c);
  render();
});

document.getElementById("qsearch").addEventListener("input", (e) => {
  query = (e.target.value || "").toLowerCase().trim();
  render();
});

// 3) Render
function render() {
  let list = data;

  if (activeCats.size > 0) {
    list = list.filter((q) =>
      (q.categories || []).some((c) => activeCats.has(c))
    );
  }
  if (query) {
    list = list.filter((q) => (q.title || "").toLowerCase().includes(query));
  }
  grid.innerHTML = list.map(card).join("");
}

function card(q) {
  const title = (q.title || "Quiz")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let cover = q.cover || "images/placeholder.jpg";
  let fname = cover
    .split("/")
    .pop()
    .replace(/\.(png|jpe?g|webp)$/i, "");

  const base = `images/quizzes/quiz_thumbs/optimized/${fname}`;
  const cover600 = `${base}-600.webp`;
  const cover900 = `${base}-900.webp`;

  const pills = (q.categories || [])
    .slice(0, 3)
    .map((c) => `<span class="pill" style="margin-right:6px">${c}</span>`)
    .join("");

  return `
    <article class="quiz-card">
      <a href="./quiz.html?id=${encodeURIComponent(q.id)}">
        <div class="thumb">
          <img
            src="${cover900}"
            srcset="${cover600} 600w, ${cover900} 900w"
            sizes="(max-width: 640px) 90vw, 360px"
            loading="lazy"
            decoding="async"
            alt="${title}"
            onerror="this.onerror=null; this.src='${cover}'"
          >
        </div>
        <h3>${title}</h3>
        <div>${pills}</div>
      </a>
    </article>`;
}

render();
