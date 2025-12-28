import { fetchManifest } from "./data.js";

const $ = (id) => document.getElementById(id);
const elMost = $("home-most");
const elLatest = $("home-latest");
const elPers = $("home-personality");
const elTrivia = $("home-trivia");
const API = "https://atlasivo-stats.atlasivo-content.workers.dev";

const manifest = await fetchManifest();

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
        ${q.type ? `<span class="pill">${q.type}</span>` : ``}
      </a>
    </article>`;
}

function render(list, box, limit = 12) {
  box.innerHTML = list.slice(0, limit).map(card).join("");
}

// --- Sections ---
async function buildMostSolved() {
  const ids = manifest.map((m) => m.id);
  const scoreMap = await getScoreMap(ids);

  const list = manifest.slice().sort((a, b) => {
    const sa = scoreMap.get(a.id) ?? Number.NEGATIVE_INFINITY;
    const sb = scoreMap.get(b.id) ?? Number.NEGATIVE_INFINITY;
    if (sa !== sb) return sb - sa; // yüksek puan öne

    // 2. anahtar: en son güncellenen/eklenen öne
    const ta = ts(a.updatedAt || a.createdAt);
    const tb = ts(b.updatedAt || b.createdAt);
    if (tb !== ta) return tb - ta;

    // 3. anahtar: başlık (stabil sonuç için)
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  render(list, elMost);
}

async function getScoreMap(ids) {
  const map = new Map();
  if (!ids || !ids.length) return map;

  const url = `${API}/api/top?ids=${encodeURIComponent(ids.join(","))}`;

  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      console.warn("[mostsolved] bad status:", r.status, url);
      return map;
    }
    const data = await r.json();

    // Kabul edilen 2 format: { "<id>": number } veya [ {id, score} ]
    if (Array.isArray(data)) {
      for (const row of data) {
        if (!row) continue;
        const id = row.id ?? row.ID ?? row.slug;
        const raw = row.score ?? row.count ?? row.solved ?? row.value;
        const val = Number(raw);
        if (id != null && Number.isFinite(val)) map.set(String(id), val);
      }
    } else if (data && typeof data === "object") {
      for (const [id, raw] of Object.entries(data)) {
        const val = Number(raw);
        if (Number.isFinite(val)) map.set(String(id), val);
      }
    } else {
      console.warn("[mostsolved] unexpected payload:", data);
    }
  } catch (err) {
    console.warn("[mostsolved] fetch error:", err);
  }

  // Hızlı teşhis için:
  if (map.size === 0) {
    console.warn(
      "[mostsolved] all scores missing/invalid — falling back to timestamps"
    );
  } else {
    // İstersen ilk 5’i gör
    console.debug(
      "[mostsolved] sample scores:",
      Array.from(map.entries()).slice(0, 5)
    );
  }

  return map;
}

// Tarihi sayıya çeviren yardımcı (varsa kullan, yoksa ekle)
function ts(x) {
  if (!x) return 0;
  const t = new Date(x).getTime();
  return Number.isFinite(t) ? t : 0;
}

function buildLatest() {
  const latest = [...manifest].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  render(latest, elLatest);
}

function buildByType(type, box) {
  const list = manifest.filter((m) => (m.type || "").toLowerCase() === type);
  render(list, box);
}

// --- Init ---
buildMostSolved();
buildLatest();
buildByType("personality", elPers);
buildByType("trivia", elTrivia);
