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
