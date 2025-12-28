CREATE TABLE IF NOT EXISTS hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id   TEXT NOT NULL,
  result_id TEXT,
  ts        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hits_quiz_ts ON hits(quiz_id, ts);
CREATE INDEX IF NOT EXISTS idx_hits_quiz_res ON hits(quiz_id, result_id);

CREATE TABLE IF NOT EXISTS hits_daily (
  quiz_id   TEXT NOT NULL,
  ymd       INTEGER NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (quiz_id, ymd)
);

CREATE TABLE IF NOT EXISTS hits_daily_result (
  quiz_id   TEXT NOT NULL,
  result_id TEXT,
  ymd       INTEGER NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (quiz_id, result_id, ymd)
);