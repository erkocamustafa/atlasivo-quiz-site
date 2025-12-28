export async function fetchManifest() {
  const r = await fetch('data/manifest.json');
  return r.json();
}

export async function fetchQuiz(fileOrId) {
  const file = (fileOrId || '').endsWith('.json')
    ? fileOrId
    : `data/quizzes/${fileOrId}.json`;
  const r = await fetch(file);
  return r.json();
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}