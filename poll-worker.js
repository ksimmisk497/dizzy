// Dizzy Poll Worker — live votes
// Setup:
// 1. Create Worker, paste this file, Deploy
// 2. Optional but recommended: Settings > Bindings > KV Namespace, variable name: VOTES
// 3. Put the worker URL into poll.js (POLL_API)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

function keyFor(question) {
  return "poll:" + String(question || "default").slice(0, 120);
}

async function readCounts(env, question) {
  const key = keyFor(question);
  if (env.VOTES) {
    const raw = await env.VOTES.get(key);
    if (!raw) return { a: 0, b: 0 };
    try {
      const o = JSON.parse(raw);
      return { a: Number(o.a) || 0, b: Number(o.b) || 0 };
    } catch {
      return { a: 0, b: 0 };
    }
  }
  const cache = caches.default;
  const res = await cache.match("https://poll.local/" + encodeURIComponent(key));
  if (!res) return { a: 0, b: 0 };
  try {
    return await res.json();
  } catch {
    return { a: 0, b: 0 };
  }
}

async function writeCounts(env, question, counts) {
  const key = keyFor(question);
  const body = JSON.stringify(counts);
  if (env.VOTES) {
    await env.VOTES.put(key, body);
    return;
  }
  const cache = caches.default;
  await cache.put(
    "https://poll.local/" + encodeURIComponent(key),
    new Response(body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "max-age=31536000" },
    })
  );
}

function tallies(c) {
  const total = c.a + c.b;
  return {
    a: c.a,
    b: c.b,
    total,
    percent: {
      a: total ? Math.round((c.a / total) * 1000) / 10 : 0,
      b: total ? Math.round((c.b / total) * 1000) / 10 : 0,
    },
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/results") {
      const q = url.searchParams.get("q") || "default";
      return json(tallies(await readCounts(env, q)));
    }

    if (request.method === "POST" && url.pathname === "/api/vote") {
      try {
        const body = await request.json();
        const question = String((body && body.question) || "default").slice(0, 200);
        const choice = body && body.choice;
        if (choice !== "a" && choice !== "b") {
          return json({ error: "choice must be a or b" }, 400);
        }
        const c = await readCounts(env, question);
        if (choice === "a") c.a += 1;
        else c.b += 1;
        await writeCounts(env, question, c);
        return json(tallies(c));
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, 500);
      }
    }

    return json({ ok: true, service: "dizzy-poll" });
  },
};
