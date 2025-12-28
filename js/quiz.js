import { getParam, fetchManifest, fetchQuiz } from "./data.js";
import { computePersonalityResult, computeTriviaScore } from "./compute.js";

// --------------------------------------------------
// Config & helpers
const API = "https://atlasivo-stats.atlasivo-content.workers.dev";
const $ = (sel) => document.querySelector(sel);
const origin = location.origin || "https://atlasivo.com";
const abs = (p) =>
  p && p.startsWith("http") ? p : `${origin}/${(p || "").replace(/^\//, "")}`;
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

function card(q) {
  const cover = q.cover || "images/placeholder.jpg";
  const title = (q.title || "Quiz")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const pill =
    q.type ||
    q.category ||
    (q.mode ? (q.mode === "trivia" ? "Trivia" : "Personality") : "");

  return `
    <article class="quiz-card">
      <a href="quiz.html?id=${encodeURIComponent(q.id)}">
        <div class="thumb">
          <img src="${cover}" alt="${title}" loading="lazy" decoding="async"
               onerror="this.onerror=null; this.src='images/placeholder.jpg';">
        </div>
        <h3>${title}</h3>
        ${pill ? `<span class="pill">${pill}</span>` : ``}
      </a>
    </article>`;
}

function focusSection(id) {
  const h = document.querySelector(`#${id} h2, #${id} h1, #${id} .heading`);
  if (h) h.setAttribute("tabindex", "-1"), h.focus();
}

function show(name) {
  const ids = ["start", "q", "calc", "res", "resExtra", "review"];
  ids.forEach((i) => {
    const el = document.getElementById(i);
    if (el) el.hidden = !(name === i || (name === "res" && i === "resExtra"));
  });
  focusSection(name === "res" ? "res" : name);
}

// Dynamic OG 
function setDynamicOG({ title, description, image, url }) {
  const set = (sel, attr, val) => {
    let el = document.head.querySelector(sel);
    if (!el) {
      const isMeta = sel.startsWith("meta");
      el = document.createElement(isMeta ? "meta" : "link");
      const m = sel.match(/(\w+)="([^"]+)"/);
      if (isMeta && m && (m[1] === "property" || m[1] === "name"))
        el.setAttribute(m[1], m[2]);
      if (!isMeta) el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };

  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", description);
  set('meta[property="og:image"]', "content", image);
  set('meta[property="og:url"]', "content", url);
  set('meta[name="twitter:title"]', "content", title);
  set('meta[name="twitter:description"]', "content", description);
  set('meta[name="twitter:image"]', "content", image);
  set('link[rel="canonical"]', "href", url);
}

// --------------------------------------------------
// Boot
const id = getParam("id");
const manifest = await fetchManifest();
const meta = manifest.find((m) => m.id === id);
const app = document.getElementById("app");

if (!meta) {
  app.innerHTML = "<p>Quiz not found.</p>";
  throw 0;
}

const data = await fetchQuiz(meta.file);

// --- START SCREEN UPDATE (BURASI GÜNCELLENDİ) ---
const titleEl = document.getElementById("quiztitle");
if (titleEl) titleEl.textContent = data.title || "Quiz";

// Açıklama ve Görsel Ekleme Mantığı
const startSection = document.getElementById("start");
const btnStart = document.getElementById("btnStart");

// 1. Görsel (Varsa ekle)
// data.cover yoksa meta.cover'a (manifest'e) bak
const coverUrl = data.cover || meta.cover; 

if (coverUrl && !document.getElementById("start-img")) {
     const coverImg = document.createElement("img");
     coverImg.id = "start-img";
     coverImg.src = coverUrl;
     // Stil ayarları
     coverImg.style.width = "100%";
     coverImg.style.maxWidth = "500px";
     coverImg.style.maxHeight = "350px";
     coverImg.style.borderRadius = "12px";
     coverImg.style.objectFit = "cover";
     coverImg.style.display = "block";
     coverImg.style.margin = "0 auto 20px auto";
     
     // Title'ın altına ekle
     if(titleEl) titleEl.insertAdjacentElement('afterend', coverImg);
}

// 2. Açıklama (Varsa ekle)
const descText = data.description || "Are you ready to test yourself? Click start to begin!";
if (!document.getElementById("start-desc")) {
    const descP = document.createElement("p");
    descP.id = "start-desc";
    descP.textContent = descText;
    descP.style.fontSize = "1.6rem";
    descP.style.textAlign = "center";
    descP.style.marginBottom = "3rem";
    descP.style.lineHeight = "1.5";
    descP.style.maxWidth = "700px";
    descP.style.margin = "10px auto 30px auto";
    
    // Butondan önceye ekle
    startSection.insertBefore(descP, btnStart);
}
// ------------------------------------------------

show("start");
setDynamicOG({
  title: data.title || "Atlasivo – Fun Quizzes",
  description: data.description || "Play personality & trivia quizzes.",
  image: abs(data.cover || meta.cover || "images/og-default.jpg"),
  url: `${origin}/quiz.html?id=${encodeURIComponent(meta.id)}`,
});

// --- Handle shared result links ---
const sharedResultId = getParam("result");
if (sharedResultId) {
  const resData =
    (data.results && data.results[sharedResultId]) ||
    (data.mode === "trivia"
      ? {
          title: sharedResultId.replace("percent_", "").replace(/-/g, " "),
          desc: "Shared score",
        }
      : null);

  if (resData) {
    const rTitle = resData.title || "Result";
    const rDesc = resData.desc || "";
    const rImg = resData.image || "";

    const imgEl = document.getElementById("rImg");
    if (imgEl && rImg) {
      imgEl.src = rImg;
      imgEl.hidden = false;
    }
    document.getElementById("rTitle").textContent = rTitle;
    document.getElementById("rDesc").textContent = rDesc;

    setDynamicOG({
      title: resData.title || data.title,
      description: resData.desc || "Check out my quiz result!",
      image: abs(resData.image || data.cover || meta.cover || "images/og-default.jpg"),
      url: location.href,
    });
    show("res");
  }
}

// --------------------------------------------------
// State
const state = { i: -1, answers: {}, startTime: null, finishing: false };

// --------------------------------------------------
// UI helpers
function setProgress() {
  const total = data.questions.length;
  const cur = Math.min(state.i + 1, total);
  $("#counter").textContent = `Question ${cur}/${total}`;
  $("#bar").style.width = `${Math.round((100 * cur) / total)}%`;
}

function renderQ() {
  const elCalc = document.getElementById("calc");
  if (elCalc) elCalc.hidden = true;

  const q = data.questions[state.i];
  setProgress();
  $("#qText").textContent = q.text;

  const img = $("#qImg");
  const imgWrap = img.closest(".q-media");
  if (q.image) {
    const fn = q.image.split("/").pop().replace(/\.(png|jpe?g)$/i, "");
    const base = `images/quizzes/optimized/${fn}`;
    const webp600 = `${base}-600.webp`;
    const webp900 = `${base}-900.webp`;

    img.loading = "lazy";
    img.decoding = "async";
    img.srcset = `${webp600} 600w, ${webp900} 900w`;
    img.sizes = "(max-width: 640px) 90vw, 560px";
    img.onerror = () => { img.onerror = null; img.srcset = ""; img.src = q.image; };
    img.src = webp900;
    img.hidden = false;
    if (imgWrap) imgWrap.hidden = false;
  } else {
    img.hidden = true;
    img.removeAttribute("src");
    img.removeAttribute("srcset");
    if (imgWrap) imgWrap.hidden = true;
  }

  const box = $("#qOpts");
  box.innerHTML = "";
  (q.options || []).forEach((opt) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.type = "button";
    if (opt.image) {
      b.innerHTML = `<img class="opt-img" src="${opt.image}" alt="">${opt.label ? `<span class="opt-text">${opt.label}</span>` : ""}`;
    } else {
      b.textContent = opt.label;
    }
    b.onclick = () => {
      state.answers[q.id] = opt.id;
      [...box.children].forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $("#btnNext").disabled = false;
    };
    box.appendChild(b);
  });

  const last = state.i === data.questions.length - 1;
  $("#btnNext").textContent = last ? "See result" : "Next";
  $("#btnNext").disabled = true;
}

function renderRelated() {
  const grid = document.getElementById("relGrid");
  if (!grid) return;
  grid.classList.add("quiz-grid");

  const MAX = Math.max(1, parseInt(grid.dataset.max || "4", 10));
  grid.innerHTML = "";

  const tags = new Set([...(meta.tags || []), meta.category, data.mode].filter(Boolean));
  const scored = manifest
    .filter((m) => m.id !== meta.id)
    .map((m) => {
      const mt = new Set([...(m.tags || []), m.category, m.mode].filter(Boolean));
      let overlap = 0;
      tags.forEach((t) => { if (mt.has(t)) overlap++; });
      const t = Date.parse(m.updatedAt || m.createdAt || 0) || 0;
      return { m, score: overlap * 10 + t / 1e12 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX);

  grid.innerHTML = scored.map((x) => card(x.m)).join("");
}

function renderReview() {
  const wrap = document.getElementById("revList");
  if (!wrap) return;
  wrap.innerHTML = "";

  (data.questions || []).forEach((q, idx) => {
    const userId = state.answers[q.id];
    const correctOpt = (q.options || []).find((o) => o.correct);
    const userOpt = (q.options || []).find((o) => o.id === userId);
    const ok = correctOpt && userOpt && userOpt.id === correctOpt.id;

    const div = document.createElement("div");
    div.className = "review-item " + (ok ? "ok" : "wrong");
    div.innerHTML = `
      <div class="q">${idx + 1}. ${q.text}<span class="badge">${ok ? "Correct" : "Wrong"}</span></div>
      <div class="a"><strong>Your answer:</strong> ${userOpt ? userOpt.label : "<em>Blank</em>"}</div>
      <div class="c"><strong>Correct:</strong> ${correctOpt ? correctOpt.label : "<em>-</em>"}</div>
    `;
    wrap.appendChild(div);
  });
}

function renderPersonalityBreakdown(out) {
  const wrap = document.getElementById("revList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const scores = out && out.scores ? out.scores : null;
  if (!scores) {
    wrap.innerHTML = `<p>Score details are not available.</p>`;
    return;
  }
  const rows = Object.entries(scores)
    .map(([k, v]) => ({ key: k, val: Number(v) || 0 }))
    .sort((a, b) => b.val - a.val);
  const max = Math.max(1, rows[0]?.val || 1);

  rows.forEach((r, i) => {
    const pct = Math.round((r.val * 100) / max);
    const div = document.createElement("div");
    div.className = "pb-item" + (i === 0 ? " top" : "");
    div.innerHTML = `
      <div class="pb-head"><span style="text-transform:capitalize">${r.key}</span><span>${pct}%</span></div>
      <div class="pb-bar"><div class="pb-fill" style="width:${pct}%"></div></div>
    `;
    wrap.appendChild(div);
  });
}

// --------------------------------------------------
// Flow
const startBtn = document.getElementById("btnStart");
const handleStart = (e) => {
  e?.preventDefault?.();
  state.i = 0;
  state.startTime = Date.now();
  show("q");
  renderQ();
};
if (startBtn) startBtn.addEventListener("click", handleStart);

$("#btnNext").onclick = () => {
  if (state.finishing) return;
  state.i++;
  if (state.i >= data.questions.length) {
    state.finishing = true;
    finish();
    return;
  }
  renderQ();
};

function flashCopied(btn) {
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = "Copied!";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1200);
}

async function finish() {
  show("calc");
  let rTitle = "", rDesc = "", rImg = "", resultId = null;

  if (data.mode === "trivia") {
    const { correct, total, percent } = computeTriviaScore(data, state.answers);
    const band = Math.round(percent / 10) * 10;
    resultId = `percent_${band}`;
    rTitle = `${correct} / ${total} ( ${percent} % )`;
    rDesc = "Nice! Can you beat your score?";
  } else {
    const out = computePersonalityResult(data, state.answers);
    state.lastPersonality = out;
    const res = (data.results || {})[out.winner] || { title: "Result", desc: "Thanks!" };
    rTitle = res.title;
    rDesc = res.desc;
    rImg = res.image || "";
    resultId = out.winner;
  }

  const el = $("#rImg");
  if (rImg) { el.src = rImg; el.hidden = false; } else { el.hidden = true; }
  $("#rTitle").textContent = rTitle;
  $("#rDesc").textContent = rDesc;

  document.getElementById("btnShare").onclick = async () => {
    const rTitleText = ($("#rTitle")?.textContent || "").trim();
    const url = new URL(location.href);
    url.searchParams.set("result", resultId || (typeof slug === "function" ? slug(rTitleText) : rTitleText));
    url.hash = "";
    const shareData = {
      title: data.title || document.title,
      text: (data.shareText || "My result: ") + rTitleText,
      url: url.toString(),
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        flashCopied(document.getElementById("btnShare"));
      }
    } catch (e) {}
  };

  $("#btnRetry").onclick = () => location.reload();
  const btnReview = document.getElementById("btnReview");
  if (btnReview) {
    btnReview.hidden = false;
    btnReview.textContent = data.mode === "trivia" ? "Review answers" : "See breakdown";
    btnReview.onclick = () => {
      if (data.mode === "trivia") renderReview(); else renderPersonalityBreakdown(state.lastPersonality);
      show("review");
    };
  }
  const btnBack = document.getElementById("btnBackToRes");
  if (btnBack) btnBack.onclick = () => show("res");

  try {
    await fetch(`${API}/api/hit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: meta.id, result: resultId, duration: state.startTime ? Date.now() - state.startTime : null }),
    });
  } catch (_) {}

  setTimeout(() => { show("res"); if (renderRelated) renderRelated(); state.finishing = false; }, 900);
}