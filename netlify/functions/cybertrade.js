/**
 * Proxies GET/POST to Google Apps Script Web App (CYBERTRADE_APPS_SCRIPT_URL).
 * Matches behavior of server.mjs /api/cybertrade.
 */

function mergeUpstreamQuery(upstream, queryParams) {
  const u = new URL(upstream);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, Array.isArray(v) ? v[0] : v);
    }
  }
  return u.toString();
}

function readBody(event) {
  let body = event.body || "";
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, "base64").toString("utf8");
  }
  return body;
}

export const handler = async (event) => {
  const UPSTREAM = String(process.env.CYBERTRADE_APPS_SCRIPT_URL || "").trim();
  if (!UPSTREAM) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ok: false,
        error:
          "Set CYBERTRADE_APPS_SCRIPT_URL in Netlify → Site configuration → Environment variables, then redeploy.",
      }),
    };
  }

  const method = event.httpMethod || "GET";

  try {
    if (method === "GET") {
      const target = mergeUpstreamQuery(UPSTREAM, event.queryStringParameters || undefined);
      const r = await fetch(target, { method: "GET" });
      const text = await r.text();
      return {
        statusCode: r.status,
        headers: {
          "Content-Type": r.headers.get("content-type") || "application/json; charset=utf-8",
        },
        body: text,
      };
    }

    if (method === "POST") {
      const r = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: readBody(event),
      });
      const text = await r.text();
      return {
        statusCode: r.status,
        headers: {
          "Content-Type": r.headers.get("content-type") || "application/json; charset=utf-8",
        },
        body: text,
      };
    }

    return {
      statusCode: 405,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Method not allowed",
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: String(e?.message || e) }),
    };
  }
};
