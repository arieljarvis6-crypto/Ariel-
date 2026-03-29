/**
 * Same JSON shape as node server.mjs /api/cybertrade-health
 */
export const handler = async () => {
  const configured = Boolean(String(process.env.CYBERTRADE_APPS_SCRIPT_URL || "").trim());
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ ok: true, proxy: true, configured }),
  };
};
