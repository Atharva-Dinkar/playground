// Worker entry point.
// - Requests to /api/notes are handled here, backed by the D1 database (env.DB).
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
    await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}
