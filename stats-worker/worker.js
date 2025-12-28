// Basic Auth
function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="stats"' }
  });
}
function checkAuth(req, env) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  const [u, p] = atob(h.slice(6)).split(":");
  return u === env.ADMIN_USER && p === env.ADMIN_PASS;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response("", { headers: CORS });

    // POST /api/hit  -> bir quiz tamamlandı
    if (req.method === "POST" && url.pathname === "/api/hit") {
      const { quizId, result } = await req.json().catch(() => ({}));
      if (!quizId) return new Response("quizId required", { status: 400, headers: CORS });

      const ts = Date.now();
      const ymd = Number(new Date().toISOString().slice(0,10).replace(/-/g,""));

      await env.DB.prepare('INSERT INTO hits (quiz_id,result_id,ts) VALUES (?1,?2,?3)')
        .bind(quizId, result ?? null, ts).run();

      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO hits_daily (quiz_id, ymd, total) VALUES (?1,?2,1) ' +
          'ON CONFLICT(quiz_id,ymd) DO UPDATE SET total = total + 1'
        ).bind(quizId, ymd),
        env.DB.prepare(
          'INSERT INTO hits_daily_result (quiz_id, result_id, ymd, total) VALUES (?1,?2,?3,1) ' +
          'ON CONFLICT(quiz_id,result_id,ymd) DO UPDATE SET total = total + 1'
        ).bind(quizId, result ?? "unknown", ymd),
      ]);

      return new Response("ok", { headers: CORS });
    }

    // GET /api/top?ids=a,b,c -> toplam çözümler (Most Solved için)
    if (req.method === "GET" && url.pathname === "/api/top") {
      const ids = (url.searchParams.get("ids") || "").split(",").map(s => s.trim()).filter(Boolean);
      if (!ids.length) {
        // ids yoksa ilk 50'yi dön
        const res = await env.DB.prepare(
          'SELECT quiz_id, COUNT(*) AS total FROM hits GROUP BY quiz_id ORDER BY total DESC LIMIT 50'
        ).all();
        const out = Object.fromEntries(res.results.map(r => [r.quiz_id, r.total]));
        return new Response(JSON.stringify(out), { headers: { "content-type":"application/json", ...CORS } });
      }
      const placeholders = ids.map((_,i)=>`?${i+1}`).join(",");
      const stmt = `SELECT quiz_id, COUNT(*) AS total FROM hits WHERE quiz_id IN (${placeholders}) GROUP BY quiz_id`;
      const res = await env.DB.prepare(stmt).bind(...ids).all();
      const map = Object.fromEntries(res.results.map(r => [r.quiz_id, r.total]));
      // eksik id'ler 0 olsun
      ids.forEach(id => { if (!(id in map)) map[id] = 0; });
      return new Response(JSON.stringify(map), { headers: { "content-type":"application/json", ...CORS } });
    }

    // GET /api/stats?days=30  -> genel + günlük özet (şifreli)
    if (req.method === "GET" && url.pathname === "/api/stats") {
      if (!checkAuth(req, env)) return unauthorized();

      const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") || 30)));
      const today = new Date();
      const from = new Date(today.getTime() - days*86400000);
      const toYmd = Number(today.toISOString().slice(0,10).replace(/-/g,""));
      const fromYmd = Number(from.toISOString().slice(0,10).replace(/-/g,""));

      const totals = await env.DB.prepare(
        'SELECT quiz_id, COUNT(*) AS total FROM hits GROUP BY quiz_id'
      ).all();

      const results = await env.DB.prepare(
        'SELECT quiz_id, result_id, COUNT(*) AS c FROM hits GROUP BY quiz_id, result_id'
      ).all();

      const daily = await env.DB.prepare(
        'SELECT quiz_id, ymd, total FROM hits_daily WHERE ymd BETWEEN ?1 AND ?2'
      ).bind(fromYmd, toYmd).all();

      const dailyRes = await env.DB.prepare(
        'SELECT quiz_id, result_id, ymd, total FROM hits_daily_result WHERE ymd BETWEEN ?1 AND ?2'
      ).bind(fromYmd, toYmd).all();

      const out = {};
      for (const r of totals.results) out[r.quiz_id] = { total:r.total, results:{}, daily:{}, dailyResults:{} };
      for (const r of results.results) (out[r.quiz_id]??={ total:0, results:{}, daily:{}, dailyResults:{} }).results[r.result_id??'unknown']=r.c;
      for (const r of daily.results) (out[r.quiz_id]??={ total:0, results:{}, daily:{}, dailyResults:{} }).daily[r.ymd]=r.total;
      for (const r of dailyRes.results) {
        const dr = (out[r.quiz_id]??={ total:0, results:{}, daily:{}, dailyResults:{} }).dailyResults;
        (dr[r.result_id??'unknown']??={})[r.ymd]=r.total;
      }

      return new Response(JSON.stringify(out, null, 2), {
        headers: { "content-type":"application/json", ...CORS, "x-robots-tag":"noindex" }
      });
    }

    // GET /admin  -> basit şifreli panel (noindex)
    if (req.method === "GET" && url.pathname === "/admin") {
      if (!checkAuth(req, env)) return unauthorized();
      const html = `<!doctype html><meta charset="utf-8">
<title>Atlasivo Stats</title>
<meta name="robots" content="noindex">
<style>
body{font:14px/1.5 system-ui,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px}
table{border-collapse:collapse;width:100%} th,td{border:1px solid #e5e5e5;padding:8px} th{background:#fafafa}
.small{color:#666;font-size:12px} .flex{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
code{background:#f5f5f5;padding:2px 6px;border-radius:4px}
</style>
<h1>Atlasivo — Stats</h1>
<div class="flex">
  <label>Days: <input id="days" type="number" min="1" max="365" value="30"></label>
  <button id="refresh">Refresh</button>
  <span class="small">Protected (Basic Auth) — not indexed</span>
</div>
<table id="tbl"><thead>
<tr><th>Quiz ID</th><th>Total</th><th>Results (total)</th><th>Daily (last N days)</th></tr>
</thead><tbody></tbody></table>
<script type="module">
const q = s=>document.querySelector(s);
async function load(){
  const days = Number(q('#days').value)||30;
  const r = await fetch('/api/stats?days='+days, { headers: { accept:'application/json' }});
  if (!r.ok) { alert('Auth failed or error'); return; }
  const data = await r.json();
  const tbody = q('#tbl tbody'); tbody.innerHTML = '';
  for (const [quizId, obj] of Object.entries(data)) {
    const resPairs = Object.entries(obj.results||{}).map(([k,v])=>\`\${k}: \${v}\`).join(', ');
    const dailyPairs = Object.entries(obj.daily||{}).sort((a,b)=>a[0]-b[0]).map(([d,c])=>\`\${d}: \${c}\`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = \`<td>\${quizId}</td><td>\${obj.total||0}</td><td>\${resPairs}</td><td class="small">\${dailyPairs}</td>\`;
    tbody.appendChild(tr);
  }
}
q('#refresh').addEventListener('click', load);
load();
</script>`;
      return new Response(html, { headers: { "content-type":"text/html; charset=utf-8", "x-robots-tag":"noindex" }});
    }

    return new Response("not found", { status: 404, headers: CORS });
  }
};