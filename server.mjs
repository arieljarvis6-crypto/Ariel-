/**
 * Serves CyberTrade static files and proxies /api/cybertrade → Google Apps Script.
 * Browsers only talk to your origin, so phones / Edge / Safari avoid cross-origin failures.
 *
 * PowerShell:
 *   $env:CYBERTRADE_APPS_SCRIPT_URL="https://script.google.com/macros/s/XXXX/exec"
 *   node server.mjs
 *
 * Then open http://localhost:8080 (or http://YOUR_LAN_IP:8080 from a phone on Wi‑Fi).
 *
 * For classmates not on the same network, deploy this app to Render (etc.): set PORT from the
 * host, CYBERTRADE_APPS_SCRIPT_URL as above, npm start — see README §6.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.join(__dirname, "site");
const PORT = Number(process.env.PORT || 8080, 10) || 8080;
const UPSTREAM = String(process.env.CYBERTRADE_APPS_SCRIPT_URL || "").trim();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function mergeUpstreamQuery(upstream, searchParams) {
  const u = new URL(upstream);
  for (const [k, v] of searchParams.entries()) {
    if (k === "") continue;
    u.searchParams.set(k, v);
  }
  return u.toString();
}

async function readRequestBody(req, limit = 2_000_000) {
  const chunks = [];
  let n = 0;
  for await (const chunk of req) {
    n += chunk.length;
    if (n > limit) throw new Error("Body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function safeStaticPath(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (p === "/" || p === "") p = "/index.html";
  const rel = path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(SITE_DIR, rel);
  if (!full.startsWith(SITE_DIR)) return null;
  return full;
}

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/cybertrade-health") {
    json(res, 200, {
      ok: true,
      proxy: true,
      configured: Boolean(UPSTREAM),
    });
    return;
  }

  if (url.pathname === "/api/cybertrade") {
    if (!UPSTREAM) {
      json(res, 503, {
        ok: false,
        error:
          "Server is not configured. Set environment variable CYBERTRADE_APPS_SCRIPT_URL to your Web App /exec URL, then restart.",
      });
      return;
    }

    try {
      if (req.method === "GET") {
        const target = mergeUpstreamQuery(UPSTREAM, url.searchParams);
        const r = await fetch(target, { method: "GET" });
        const text = await r.text();
        res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json; charset=utf-8" });
        res.end(text);
        return;
      }

      if (req.method === "POST") {
        const bodyBuf = await readRequestBody(req);
        const r = await fetch(UPSTREAM, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: bodyBuf,
        });
        const text = await r.text();
        res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json; charset=utf-8" });
        res.end(text);
        return;
      }

      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
    } catch (e) {
      json(res, 502, { ok: false, error: String(e?.message || e) });
    }
    return;
  }

  const filePath = safeStaticPath(url.pathname);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  serveStatic(req, res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CyberTrade: http://localhost:${PORT}/`);
  console.log(
    UPSTREAM
      ? `Proxy: CYBERTRADE_APPS_SCRIPT_URL is set (${UPSTREAM.slice(0, 48)}…)`
      : "Warning: CYBERTRADE_APPS_SCRIPT_URL is not set — /api/cybertrade will return 503."
  );
});
