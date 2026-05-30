const PRODUCTS = [
  { code: "CT-E100", name: "Wireless Mouse", price: 12.99 },
  { code: "CT-E110", name: "Mechanical Keyboard", price: 39.5 },
  { code: "CT-E120", name: "USB-C Cable (1m)", price: 6.25 },
  { code: "CT-E130", name: "Power Bank 10,000mAh", price: 24.0 },
  { code: "CT-E140", name: "Bluetooth Earbuds", price: 29.99 },
];

const STORAGE_KEYS = {
  apiUrl: "cybertrade_api_url",
  useProxy: "cybertrade_use_proxy",
  cachedTransactions: "cybertrade_cached_transactions",
  cachedAt: "cybertrade_cached_at",
};

/** Set after /api/cybertrade-health probe (server bridge status). */
let lastProxyHealth = null;

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function formatMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function safeNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function hourLabel(date) {
  return `${pad2(date.getHours())}:00`;
}

function generateTransactionId() {
  // Short, unique enough for demo (timestamp + random)
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CT-${ts}-${rnd}`;
}

function setStatus(el, msg, kind = "info") {
  el.textContent = msg || "";
  if (!msg) {
    el.style.color = "";
    return;
  }
  if (kind === "error") el.style.color = "#ff93a6";
  else if (kind === "success") el.style.color = "#86efac";
  else el.style.color = "";
}

function loadApiUrl() {
  return localStorage.getItem(STORAGE_KEYS.apiUrl) || "";
}

function saveApiUrl(url) {
  localStorage.setItem(STORAGE_KEYS.apiUrl, url);
}

function loadUseProxy() {
  return localStorage.getItem(STORAGE_KEYS.useProxy) === "1";
}

function saveUseProxy(on) {
  localStorage.setItem(STORAGE_KEYS.useProxy, on ? "1" : "0");
}

function validateDirectAppsScriptUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    return "Paste the Web App URL (Deploy → ends with /exec), or turn on server bridge.";
  }
  const u = trimmed.toLowerCase();
  if (u.includes("docs.google.com/spreadsheets")) {
    return 'That is the spreadsheet “Share” link, not the API. In Google Sheets: Extensions → Apps Script → Deploy → Web app → copy the URL that ends with /exec (contains script.google.com/macros).';
  }
  if (u.includes("/dev")) {
    return "Don’t use the /dev test URL. Use Deploy → Web app and the /exec URL.";
  }
  if (!u.includes("script.google.com/macros")) {
    return "The Web App URL must contain script.google.com/macros. A Sheet share link will always fail.";
  }
  return null;
}

function getApiContext() {
  const useProxy = $("useProxyToggle").checked;
  if (useProxy) {
    if (location.protocol === "file:") {
      return {
        error:
          "Server bridge only works when you open the app with http:// or https:// (run node server.mjs). Not from a double-clicked file.",
      };
    }
    return { ctx: { useProxy: true, base: `${location.origin}/api/cybertrade` } };
  }
  const directUrl = $("apiUrl").value.trim();
  const err = validateDirectAppsScriptUrl(directUrl);
  if (err) return { error: err };
  return { ctx: { useProxy: false, base: directUrl } };
}

function updateProxyUI() {
  const on = $("useProxyToggle").checked;
  const input = $("apiUrl");
  const hint = $("proxyHint");
  input.disabled = on;
  if (!on) {
    hint.classList.add("hidden");
    return;
  }
  hint.classList.remove("hidden");
  if (location.protocol === "file:") {
    hint.textContent =
      "Open this app with http:// or https:// (run node server.mjs). Saved HTML files (file://) cannot use the bridge.";
    return;
  }
  if (lastProxyHealth && lastProxyHealth.configured === false) {
    hint.textContent =
      "This site is served by node server.mjs but CYBERTRADE_APPS_SCRIPT_URL is not set on that PC. Set your /exec URL and restart the server.";
    return;
  }
  hint.textContent =
    "Traffic goes to this website first; the PC running Node forwards to Google. Phones and strict browsers no longer call script.google.com directly.";
}

async function probeProxyHealth() {
  try {
    if (location.protocol === "file:") return null;
    const r = await fetch(`${location.origin}/api/cybertrade-health`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function getSelectedProduct() {
  const value = $("productSelect").value;
  const found = PRODUCTS.find((p) => p.code === value);
  if (!found) throw new Error("Selected product not found");
  return found;
}

function calculateTotal(unitPrice, qty) {
  const total = safeNumber(unitPrice, 0) * safeNumber(qty, 0);
  return Math.round(total * 100) / 100;
}

function updatePricingUI() {
  const product = getSelectedProduct();
  const qty = Math.max(1, Math.floor(safeNumber($("quantity").value, 1)));
  $("quantity").value = String(qty);
  $("unitPrice").value = formatMoney(product.price);
  $("totalPrice").value = formatMoney(calculateTotal(product.price, qty));
}

function renderProductOptions() {
  const select = $("productSelect");
  select.innerHTML = "";
  for (const p of PRODUCTS) {
    const opt = document.createElement("option");
    opt.value = p.code;
    opt.textContent = `${p.code} — ${p.name} (${formatMoney(p.price)})`;
    select.appendChild(opt);
  }
}

function startClock() {
  const el = $("clock");
  const tick = () => {
    const d = new Date();
    el.textContent = d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  tick();
  setInterval(tick, 1000);
}

function explainFetchFailure(err) {
  const msg = String(err?.message || err || "");
  const isNetwork =
    err?.name === "TypeError" ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
  if (!isNetwork) return msg;
  return (
    "Could not reach Google Apps Script (browser blocked the request or network error). " +
    "Try: (1) Turn on server bridge, install Node 18+, run node server.mjs with CYBERTRADE_APPS_SCRIPT_URL set, open this app from that address. " +
    "(2) Or open via http://localhost — not file:// — and confirm the pasted link is the /exec Web app URL, not the Sheet share link. " +
    "(3) Disable strict tracking / ad blockers for this site on mobile."
  );
}

/**
 * @param {{ useProxy: boolean, base: string }} ctx base = direct /exec URL or same-origin /api/cybertrade
 */
async function apiPostTransaction(ctx, tx) {
  // Use a "simple" Content-Type to avoid CORS preflight against Apps Script.
  // Apps Script still receives the JSON in e.postData.contents.
  let res;
  try {
    res = await fetch(ctx.base, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(tx),
    });
  } catch (err) {
    throw new Error(explainFetchFailure(err));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST failed (${res.status}). ${text}`.trim());
  }
  const data = await res.json().catch(() => ({}));
  if (data && data.ok === false) throw new Error(data.error || "API error");
  return data;
}

async function apiGetTransactions(ctx) {
  const cacheBust = `t=${Date.now()}`;
  const url = ctx.useProxy
    ? `${ctx.base}?mode=list&${cacheBust}`
    : ctx.base.includes("?")
      ? `${ctx.base}&mode=list&${cacheBust}`
      : `${ctx.base}?mode=list&${cacheBust}`;
  let res;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (err) {
    throw new Error(explainFetchFailure(err));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET failed (${res.status}). ${text}`.trim());
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Response was not JSON (often a wrong URL or a Google sign-in page). Use the Deploy → Web app /exec link, not the spreadsheet Share link."
    );
  }
  if (!data || data.ok === false) throw new Error(data?.error || "API error");
  return data.transactions || [];
}

function cacheTransactions(transactions) {
  localStorage.setItem(STORAGE_KEYS.cachedTransactions, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.cachedAt, nowIso());
}

function loadCachedTransactions() {
  const raw = localStorage.getItem(STORAGE_KEYS.cachedTransactions);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeCsvCell(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

/** Extra columns help Power BI (saleDate, saleMonth) without editing the Sheet. */
function transactionsToCsv(transactions) {
  const header = [
    "transactionId",
    "dateTime",
    "saleDate",
    "saleMonth",
    "itemCode",
    "itemName",
    "quantity",
    "unitPrice",
    "totalPrice",
    "staffName",
  ];
  const lines = [header.join(",")];
  for (const t of transactions) {
    const saleDate = Number.isFinite(t.dateTime.getTime()) ? t.dateTime.toISOString().slice(0, 10) : "";
    const saleMonth = saleDate ? saleDate.slice(0, 7) : "";
    const row = [
      t.transactionId,
      Number.isFinite(t.dateTime.getTime()) ? t.dateTime.toISOString() : "",
      saleDate,
      saleMonth,
      t.itemCode,
      t.itemName,
      t.quantity,
      t.unitPrice,
      t.totalPrice,
      t.staffName,
    ];
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\n");
}

function downloadTextFile(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPowerBiCsv() {
  const statusEl = $("dashStatus");
  try {
    setStatus(statusEl, "Preparing CSV export…");
    const { error, ctx } = getApiContext();
    let raw = [];
    if (error) {
      raw = loadCachedTransactions();
      if (!raw.length) throw new Error(error);
    } else {
      raw = await apiGetTransactions(ctx);
      cacheTransactions(raw);
    }
    if (!raw.length) {
      setStatus(
        statusEl,
        "No transactions in the sheet yet. Run “Generate & Upload” (1000 rows) or add sales first.",
        "error"
      );
      return;
    }
    const txs = raw.map(normalizeTx);
    const csv = transactionsToCsv(txs);
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `CyberTrade-Transactions-${stamp}.csv`;
    downloadTextFile(name, csv);
    setStatus(statusEl, `Downloaded ${txs.length} rows → ${name}. Open Power BI → Get data → Text/CSV.`, "success");
  } catch (err) {
    setStatus(statusEl, err?.message || String(err), "error");
  }
}

function normalizeTx(tx) {
  // The API returns plain objects. Ensure types are sane for calculations.
  const dt = new Date(tx.dateTime || tx.datetime || tx.timestamp || tx.date || tx.DateTime || tx.Date || tx.Time || "");
  const dateTime = Number.isFinite(dt.getTime()) ? dt : new Date();

  const quantity = safeNumber(tx.quantity ?? tx.qty, 0);
  const unitPrice = safeNumber(tx.unitPrice ?? tx.pricePerUnit ?? tx.price, 0);
  const totalPrice = safeNumber(tx.totalPrice ?? tx.total, unitPrice * quantity);

  return {
    transactionId: String(tx.transactionId ?? tx.txId ?? tx.id ?? ""),
    dateTime,
    itemCode: String(tx.itemCode ?? tx.code ?? ""),
    itemName: String(tx.itemName ?? tx.name ?? ""),
    quantity,
    unitPrice,
    totalPrice,
    staffName: String(tx.staffName ?? tx.staff ?? ""),
  };
}

function computeDashboardMetrics(transactions) {
  const today = new Date();
  const todays = transactions.filter((t) => isSameLocalDay(t.dateTime, today));

  let totalSales = 0;
  for (const t of todays) totalSales += safeNumber(t.totalPrice, 0);

  const txCount = todays.length;

  // Best-selling product by quantity (tie-breaker: sales)
  const productAgg = new Map();
  for (const t of todays) {
    const key = t.itemCode || t.itemName || "Unknown";
    const prev = productAgg.get(key) || { itemCode: t.itemCode, itemName: t.itemName, qty: 0, sales: 0 };
    prev.qty += safeNumber(t.quantity, 0);
    prev.sales += safeNumber(t.totalPrice, 0);
    productAgg.set(key, prev);
  }
  let best = null;
  for (const v of productAgg.values()) {
    if (!best) best = v;
    else if (v.qty > best.qty) best = v;
    else if (v.qty === best.qty && v.sales > best.sales) best = v;
  }
  const bestProductText = best ? `${best.itemCode} — ${best.itemName} (${best.qty} sold)` : "—";

  // Sales grouped by staff
  const staffAgg = new Map();
  for (const t of todays) {
    const staff = (t.staffName || "Unknown").trim() || "Unknown";
    const prev = staffAgg.get(staff) || { staff, txCount: 0, sales: 0 };
    prev.txCount += 1;
    prev.sales += safeNumber(t.totalPrice, 0);
    staffAgg.set(staff, prev);
  }
  const staffRows = Array.from(staffAgg.values()).sort((a, b) => b.sales - a.sales);

  // Sales trend by hour (today)
  const hourly = new Map();
  for (const t of todays) {
    const label = hourLabel(t.dateTime);
    hourly.set(label, safeNumber(hourly.get(label), 0) + safeNumber(t.totalPrice, 0));
  }
  const labels = [];
  const series = [];
  for (let h = 0; h < 24; h++) {
    const d = new Date(today);
    d.setHours(h, 0, 0, 0);
    const lab = hourLabel(d);
    labels.push(lab);
    series.push(Math.round(safeNumber(hourly.get(lab), 0) * 100) / 100);
  }

  return { totalSales, txCount, bestProductText, staffRows, chart: { labels, series } };
}

let salesChart = null;
function renderChart(chartData) {
  const ctx = $("salesChart");
  const config = {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Sales (today)",
          data: chartData.series,
          borderColor: "rgba(79, 140, 255, 1)",
          backgroundColor: "rgba(79, 140, 255, 0.15)",
          tension: 0.25,
          fill: true,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatMoney(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { maxTicksLimit: 8, color: "#a7b3cc" } },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#a7b3cc",
            callback: (v) => formatMoney(v),
          },
        },
      },
    },
  };

  if (salesChart) {
    salesChart.data.labels = config.data.labels;
    salesChart.data.datasets[0].data = config.data.datasets[0].data;
    salesChart.update();
    return;
  }
  salesChart = new Chart(ctx, config);
}

function renderStaffTable(rows) {
  const body = $("staffTableBody");
  body.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="muted">No transactions for today yet.</td>`;
    body.appendChild(tr);
    return;
  }
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.staff)}</td>
      <td class="right">${r.txCount.toLocaleString()}</td>
      <td class="right">${formatMoney(r.sales)}</td>
    `;
    body.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateMiniKpis(metrics) {
  const totalEl = document.getElementById("kpiTotalSalesMini");
  const countEl = document.getElementById("kpiTxCountMini");
  const bestEl = document.getElementById("kpiBestProductMini");
  if (!totalEl || !countEl || !bestEl) return;
  totalEl.textContent = formatMoney(metrics.totalSales);
  countEl.textContent = metrics.txCount.toLocaleString();
  bestEl.textContent = metrics.bestProductText;
}

async function refreshDashboard({ source = "api", silent = false } = {}) {
  const dashStatus = $("dashStatus");

  try {
    if (!silent) {
      setStatus(
        dashStatus,
        source === "api" ? "Loading transactions from Google Sheets…" : "Loading transactions from local cache…"
      );
    }
    let raw = [];
    if (source === "api") {
      const { error, ctx } = getApiContext();
      if (error) throw new Error(error);
      raw = await apiGetTransactions(ctx);
      cacheTransactions(raw);
    } else {
      raw = loadCachedTransactions();
    }

    const txs = raw.map(normalizeTx);
    const m = computeDashboardMetrics(txs);
    $("kpiTotalSales").textContent = formatMoney(m.totalSales);
    $("kpiTxCount").textContent = m.txCount.toLocaleString();
    $("kpiBestProduct").textContent = m.bestProductText;
    updateMiniKpis(m);
    renderStaffTable(m.staffRows);
    renderChart(m.chart);

    const cachedAt = localStorage.getItem(STORAGE_KEYS.cachedAt);
    const sourceLabel = source === "api" ? "Google Sheets" : "Local cache";
    if (!silent) {
      setStatus(
        dashStatus,
        `Dashboard updated. Source: ${sourceLabel}${cachedAt ? ` (cached at ${new Date(cachedAt).toLocaleString()})` : ""}.`,
        "success"
      );
    }
  } catch (err) {
    if (!silent) setStatus(dashStatus, err?.message || String(err), "error");
  }
}

function buildTxFromForm() {
  const staffName = $("staffName").value.trim();
  const qty = Math.max(1, Math.floor(safeNumber($("quantity").value, 1)));
  const p = getSelectedProduct();
  const total = calculateTotal(p.price, qty);
  const tx = {
    transactionId: generateTransactionId(),
    dateTime: new Date().toISOString(),
    itemCode: p.code,
    itemName: p.name,
    quantity: qty,
    unitPrice: p.price,
    totalPrice: total,
    staffName,
  };
  return tx;
}

function resetForm() {
  $("tpsForm").reset();
  $("quantity").value = "1";
  updatePricingUI();
  setStatus($("tpsStatus"), "");
}

let bulkStopRequested = false;
let autoRefreshIntervalId = null;

function setActiveTab(tab) {
  const viewTps = $("viewTps");
  const viewMis = $("viewMis");
  const tabTps = $("tabTps");
  const tabMis = $("tabMis");

  const isMis = tab === "mis";
  viewTps.classList.toggle("hidden", isMis);
  viewMis.classList.toggle("hidden", !isMis);
  tabTps.classList.toggle("active", !isMis);
  tabMis.classList.toggle("active", isMis);

  if (isMis) {
    refreshDashboard({ source: "api" });
  }
}

function stopAutoRefresh() {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  const toggle = $("autoRefreshToggle");
  const secondsInput = $("autoRefreshSeconds");
  if (!toggle.checked) return;
  const seconds = Math.max(2, Math.floor(safeNumber(secondsInput.value, 8)));
  secondsInput.value = String(seconds);
  autoRefreshIntervalId = setInterval(() => {
    // Silent refresh so the status doesn't flicker every few seconds.
    refreshDashboard({ source: "api", silent: true });
  }, seconds * 1000);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStaff() {
  const names = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Riley", "Casey", "Jamie"];
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${randomChoice(names)}-CT${suffix}`;
}

function randomQty() {
  // Mostly 1-3, sometimes more
  const r = Math.random();
  if (r < 0.75) return 1 + Math.floor(Math.random() * 3);
  if (r < 0.93) return 4 + Math.floor(Math.random() * 4);
  return 8 + Math.floor(Math.random() * 5);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomTodayIso() {
  const d = new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t).toISOString();
}

async function bulkGenerateAndUpload() {
  const statusEl = $("bulkStatus");
  const { error, ctx } = getApiContext();
  if (error) {
    setStatus(statusEl, error, "error");
    return;
  }

  const count = Math.max(1, Math.floor(safeNumber($("bulkCount").value, 1)));
  const delay = Math.max(0, Math.floor(safeNumber($("bulkDelay").value, 0)));

  bulkStopRequested = false;
  $("bulkGenerateBtn").disabled = true;
  $("bulkStopBtn").disabled = false;

  let ok = 0;
  let failed = 0;
  const startedAt = Date.now();

  try {
    for (let i = 1; i <= count; i++) {
      if (bulkStopRequested) break;
      const p = randomChoice(PRODUCTS);
      const qty = randomQty();
      const total = calculateTotal(p.price, qty);
      const tx = {
        transactionId: generateTransactionId(),
        dateTime: randomTodayIso(),
        itemCode: p.code,
        itemName: p.name,
        quantity: qty,
        unitPrice: p.price,
        totalPrice: total,
        staffName: randomStaff(),
      };

      try {
        await apiPostTransaction(ctx, tx);
        ok++;
      } catch (e) {
        failed++;
      }

      const elapsed = Math.max(1, Date.now() - startedAt);
      const rate = (ok + failed) / (elapsed / 1000);
      setStatus(
        statusEl,
        `Uploading… ${i}/${count} | OK: ${ok} | Failed: ${failed} | ~${rate.toFixed(1)}/sec${delay ? ` | delay ${delay}ms` : ""}`
      );

      if (delay) await sleep(delay);
    }
  } finally {
    $("bulkGenerateBtn").disabled = false;
    $("bulkStopBtn").disabled = true;
  }

  if (bulkStopRequested) setStatus(statusEl, `Stopped. Uploaded OK: ${ok}. Failed: ${failed}.`, "error");
  else setStatus(statusEl, `Done. Uploaded OK: ${ok}. Failed: ${failed}.`, failed ? "error" : "success");

  // Refresh dashboard from API after bulk upload
  await refreshDashboard({ source: "api" });
}

function wireUpEvents() {
  $("productSelect").addEventListener("change", updatePricingUI);
  $("quantity").addEventListener("input", updatePricingUI);

  $("resetBtn").addEventListener("click", () => resetForm());

  $("apiUrl").addEventListener("input", (e) => {
    const url = String(e.target.value || "").trim();
    saveApiUrl(url);
  });

  $("useProxyToggle").addEventListener("change", () => {
    saveUseProxy($("useProxyToggle").checked);
    updateProxyUI();
  });

  $("tpsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = $("tpsStatus");
    const { error, ctx } = getApiContext();
    if (error) {
      setStatus(statusEl, error, "error");
      return;
    }

    const staff = $("staffName").value.trim();
    if (!staff) {
      setStatus(statusEl, "Please enter a staff name/ID.", "error");
      return;
    }

    try {
      $("submitBtn").disabled = true;
      setStatus(statusEl, "Submitting transaction…");
      const tx = buildTxFromForm();
      await apiPostTransaction(ctx, tx);
      setStatus(statusEl, `Saved! Transaction ID: ${tx.transactionId}`, "success");
      resetForm();
      // Keep MIS "real-time": refresh data immediately after every successful sale.
      await refreshDashboard({ source: "api" });
    } catch (err) {
      setStatus(statusEl, err?.message || String(err), "error");
    } finally {
      $("submitBtn").disabled = false;
    }
  });

  $("refreshBtn").addEventListener("click", () => refreshDashboard({ source: "api" }));
  $("downloadCsvBtn").addEventListener("click", () => downloadPowerBiCsv());
  $("loadFromLocalBtn").addEventListener("click", () => refreshDashboard({ source: "local" }));

  $("tabTps").addEventListener("click", () => {
    setActiveTab("tps");
    stopAutoRefresh();
  });
  $("tabMis").addEventListener("click", () => {
    setActiveTab("mis");
    startAutoRefresh();
  });
  $("goToMisBtn").addEventListener("click", () => {
    setActiveTab("mis");
    startAutoRefresh();
  });

  $("autoRefreshToggle").addEventListener("change", () => startAutoRefresh());
  $("autoRefreshSeconds").addEventListener("change", () => startAutoRefresh());

  $("bulkGenerateBtn").addEventListener("click", () => bulkGenerateAndUpload());
  $("bulkStopBtn").addEventListener("click", () => {
    bulkStopRequested = true;
    $("bulkStopBtn").disabled = true;
  });
}

async function init() {
  startClock();
  renderProductOptions();
  $("apiUrl").value = loadApiUrl();
  $("useProxyToggle").checked = loadUseProxy();

  lastProxyHealth = await probeProxyHealth();
  if (lastProxyHealth?.configured) {
    $("useProxyToggle").checked = true;
    saveUseProxy(true);
  }

  updateProxyUI();
  updatePricingUI();
  wireUpEvents();
  refreshDashboard({ source: "local" });
  setActiveTab("tps");
}

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

