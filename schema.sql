CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY,
  text       TEXT    NOT NULL DEFAULT '',
  color      TEXT    NOT NULL DEFAULT '#fce98a',
  x          REAL    NOT NULL DEFAULT 0,
  y          REAL    NOT NULL DEFAULT 0,
  rot        REAL    NOT NULL DEFAULT 0,
  z          INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS threads (
  id         TEXT PRIMARY KEY,
  a          TEXT    NOT NULL,
  b          TEXT    NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- Chess trainer: one cumulative (lifetime) row per quiz mode ('find' | 'name').
CREATE TABLE IF NOT EXISTS chess_stats (
  mode        TEXT PRIMARY KEY,
  correct     INTEGER NOT NULL DEFAULT 0,
  attempts    INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
