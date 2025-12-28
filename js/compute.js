const weightFrequency = {
  algeria: 6, argentina: 7, australia: 6, austria: 7, belgium: 7,
  brazil: 9, canada: 7, chile: 7, china: 10, colombia: 8, croatia: 7,
  denmark: 6, egypt: 7, finland: 7, france: 9, germany: 9, ghana: 8,
  greece: 8, hungary: 7, india: 10, iran: 8, indonesia: 9, ireland: 7,
  italy: 9, japan: 8, kazakhstan: 8, kenya: 9, southkorea: 9,
  lebanon: 7, mexico: 9, mongolia: 7, netherlands: 8, nigeria: 9,
  norway: 6, pakistan: 8, peru: 9, poland: 8, portugal: 9,
  qatar: 6, singapore: 9, southafrica: 9, spain: 9, srilanka: 8,
  switzerland: 8, tanzania: 9, thailand: 9, turkiye: 9, uae: 7,
  uk: 9, usa: 9
};

export function computePersonalityResult(data, answers) {
  // 1) Rule-mode (unchanged)
  if (Array.isArray(data.rules)) {
    for (const r of data.rules) {
      const ok = r.when.every(([qid, opt]) => answers[qid] === opt);
      if (ok) return { winner: r.result, scores: null, mode: 'rule' };
    }
  }

  // 2) Weight accumulation (unchanged)
  const scores = {};
  for (const q of data.questions) {
    const chosen = answers[q.id];
    if (!chosen) continue;
    const opt = (q.options || []).find(o => o.id === chosen);
    Object.entries(opt?.weights || {}).forEach(([k,v]) => {
      scores[k] = (scores[k] || 0) + v;
    });
  }

  // ✅ 3) Soft normalization to avoid over-frequent countries
  const normalized = {};
  for (const [country, rawScore] of Object.entries(scores)) {
    const freq = weightFrequency[country] || 1;   // fallback safety
    normalized[country] = rawScore / freq;
  }

  // 4) Sort by normalized score
  const arr = Object.entries(normalized).sort((a,b) => b[1] - a[1]);
  let winner = arr[0]?.[0] || null;

  // 5) Tie-breaking (unchanged)
  if (arr.length > 1 && arr[0][1] === arr[1][1]) {
    const tied = arr.filter(x=>x[1]===arr[0][1]).map(x=>x[0]);
    const tieList = (data.results && data.results._tie) || [];
    const pick = tieList.find(x => tied.includes(x));
    if (pick) winner = pick;
  }

  return { winner, scores: normalized, mode: 'weights' };
}

export function computeTriviaScore(data, answers) {
  let correct = 0, total = data.questions.length;
  for (const q of data.questions) {
    const chosen = answers[q.id];
    const opt = (q.options||[]).find(o=>o.id===chosen);
    if (opt?.correct) correct++;
  }
  const percent = Math.round(100*correct/Math.max(total,1));
  return { correct, total, percent };
}