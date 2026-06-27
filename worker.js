// Worker entry point.
// - Requests to /api/notes and /api/threads are handled here, backed by the
//   D1 database (env.DB).
// - Everything else is served from your static files in /public (env.ASSETS).

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/notes")) {
      try {
        return await handleNotes(request, env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (url.pathname.startsWith("/api/threads")) {
      try {
        return await handleThreads(request, env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (url.pathname.startsWith("/api/chess")) {
      try {
        return await handleChess(request, env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // Not an API route -> serve the static site (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleNotes(request, env, url) {
  const db = env.DB;
  const method = request.method;

  // Path is either /api/notes or /api/notes/{id}
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "notes", id?]
  const id = parts[2] ? decodeURIComponent(parts[2]) : null;

  // GET /api/notes  -> all notes
  if (method === "GET" && !id) {
    const { results } = await db
      .prepare("SELECT id, text, color, x, y, rot, z FROM notes")
      .all();
    return json(results || []);
  }

  // PUT /api/notes/{id}  -> create or update one note
  if (method === "PUT" && id) {
    const n = await request.json();
    await db
      .prepare(
        `INSERT INTO notes (id, text, color, x, y, rot, z, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           text=excluded.text, color=excluded.color, x=excluded.x,
           y=excluded.y, rot=excluded.rot, z=excluded.z,
           updated_at=excluded.updated_at`
      )
      .bind(
        id,
        String(n.text ?? ""),
        String(n.color ?? "#fce98a"),
        Number(n.x) || 0,
        Number(n.y) || 0,
        Number(n.rot) || 0,
        Math.trunc(Number(n.z) || 1),
        Date.now()
      )
      .run();
    return json({ ok: true });
  }

  // DELETE /api/notes/{id}
  if (method === "DELETE" && id) {
    // remove the note and any threads attached to it
    await db.batch([
      db.prepare("DELETE FROM threads WHERE a = ? OR b = ?").bind(id, id),
      db.prepare("DELETE FROM notes WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

async function handleThreads(request, env, url) {
  const db = env.DB;
  const method = request.method;

  // Path is either /api/threads or /api/threads/{id}
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "threads", id?]
  const id = parts[2] ? decodeURIComponent(parts[2]) : null;

  // GET /api/threads  -> all threads
  if (method === "GET" && !id) {
    const { results } = await db
      .prepare("SELECT id, a, b FROM threads")
      .all();
    return json(results || []);
  }

  // PUT /api/threads/{id}  -> create or update one thread
  if (method === "PUT" && id) {
    const t = await request.json();
    await db
      .prepare(
        `INSERT INTO threads (id, a, b, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           a=excluded.a, b=excluded.b, updated_at=excluded.updated_at`
      )
      .bind(
        id,
        String(t.a ?? ""),
        String(t.b ?? ""),
        Date.now()
      )
      .run();
    return json({ ok: true });
  }

  // DELETE /api/threads/{id}
  if (method === "DELETE" && id) {
    await db.prepare("DELETE FROM threads WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

async function handleChess(request, env, url) {
  const db = env.DB;
  const method = request.method;

  // Path is either /api/chess or /api/chess/{mode}
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "chess", mode?]
  const mode = parts[2] ? decodeURIComponent(parts[2]) : null;
  const validMode = mode === "find" || mode === "name";

  // GET /api/chess  -> lifetime stats for every mode
  if (method === "GET" && !mode) {
    const { results } = await db
      .prepare("SELECT mode, correct, attempts, best_streak FROM chess_stats")
      .all();
    return json(results || []);
  }

  // POST /api/chess/{mode}  -> record one answer (increments the running totals)
  if (method === "POST" && validMode) {
    const body = await request.json();
    const isCorrect = body.correct ? 1 : 0;
    const streak = Math.max(0, Math.trunc(Number(body.streak) || 0));
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO chess_stats (mode, correct, attempts, best_streak, updated_at)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(mode) DO UPDATE SET
           correct = correct + ?,
           attempts = attempts + 1,
           best_streak = MAX(best_streak, ?),
           updated_at = ?`
      )
      .bind(mode, isCorrect, streak, now, isCorrect, streak, now)
      .run();
    const row = await db
      .prepare("SELECT mode, correct, attempts, best_streak FROM chess_stats WHERE mode = ?")
      .bind(mode)
      .first();
    return json(row || { mode, correct: isCorrect, attempts: 1, best_streak: streak });
  }

  // DELETE /api/chess/{mode}  -> reset that mode's stats
  if (method === "DELETE" && validMode) {
    await db.prepare("DELETE FROM chess_stats WHERE mode = ?").bind(mode).run();
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}
