# CyberTrade — TPS + MIS (Static Web App + Google Sheets)

A simple web-based **Transaction Processing System (POS/TPS)** with a basic **MIS dashboard** for a retail business called **CyberTrade**.

- TPS: select product, enter quantity + staff, auto-total, submit transaction
- Storage: Google Sheets (each transaction = new row)
- MIS: today’s total sales, transaction count, best-selling product, sales by staff, sales trend chart
- Performance: bulk-generate sample transactions (e.g. 1000+) for testing
- **Power BI assignment:** export CSV from MIS tab; full steps in [`powerbi/README.md`](powerbi/README.md)

---

## Classmates not on the same Wi‑Fi?

Same‑room tricks (LAN IP, same Wi‑Fi) only work when everyone can reach your PC. For a **school project spread across homes**, pick **one** approach:

1. **Best on Netlify — Git deploy + serverless backend (free)**  
   This repo includes **Netlify Functions** (a tiny backend) that proxy to Google, same as `server.mjs` locally. Connect the repo in Netlify (not drag‑and‑drop), set **`CYBERTRADE_APPS_SCRIPT_URL`** under **Site configuration → Environment variables** to your **Web app /exec** URL, redeploy, then share your **`https://….netlify.app`** link. Classmates keep **server bridge** on and usually **do not** paste the Google URL.

2. **Alternative — Render (Node)**  
   Same env var on a Render web service; see [§6](#6-deploy-for-the-whole-class-render).

3. **Presentation‑only — temporary tunnel**  
   Run `node server.mjs` on one laptop and use [ngrok](https://ngrok.com/) to expose `http://localhost:8080` as a public `https://` URL. Your laptop must stay on.

> **Drag‑and‑drop** deploys on Netlify **do not** build Functions — use **Git‑connected** Netlify (or `netlify deploy` from the CLI) so the proxy exists. Plain static hosting (no Functions) still forces the browser to call Google directly and often fails on phones.

**Netlify walkthrough:** [§5 Deploy to Netlify](#5-deploy-to-netlify).

---

## 1) Run locally

This is a static app (no backend server needed).

### Option A: Open directly (quick)

1. Open `site/index.html` (double‑click it in File Explorer)
2. Paste your Google Apps Script Web App URL into **Google Sheets API URL**

> Note: Some browsers have stricter CORS rules when opening files directly. If you see fetch/CORS errors, use Option B.

### Option B: Run a local static server (recommended)

Using PowerShell:

```powershell
cd "C:\Users\jarvi.DESKTOP-1J7LPQJ\Downloads\ariel"
python -m http.server 5173 --directory site
```

Then open `http://localhost:5173`.

### Option C — Node server + **server bridge** (best for phones / “failed to fetch”)

Browsers (especially on mobile) sometimes block calls straight to `script.google.com`. This project includes `server.mjs`: your phone only talks to your PC; Node forwards to Google.

1. Install [Node.js](https://nodejs.org/) 18 or newer.
2. In PowerShell (same folder as this project):

```powershell
cd "C:\Users\jarvi.DESKTOP-1J7LPQJ\Downloads\ariel"
$env:CYBERTRADE_APPS_SCRIPT_URL="PASTE_YOUR_WEB_APP_EXEC_URL_HERE"
node server.mjs
```

3. On this PC open `http://localhost:8080`.
4. On a phone **on the same Wi‑Fi**, open `http://YOUR_PC_LAN_IP:8080` (e.g. `http://192.168.1.50:8080`). Find the IP with `ipconfig`.
5. In the app, enable **Use server bridge**. You do **not** need to paste the Google URL on the phone.

> The Web App URL (`…/exec`) is stored only on the machine running `node server.mjs`, not in the browser.  
> **Same Wi‑Fi only.** If teammates are elsewhere, use Netlify + Functions ([§5](#5-deploy-to-netlify)) or Render ([§6](#6-deploy-for-the-whole-class-render)).

---

## 2) Connect to Google Sheets (Database)

### Step 1 — Create the Google Sheet

1. Create a new Google Sheet, e.g. **CyberTrade-Transactions**
2. (Optional) Rename the first tab to `Transactions`

> If you don’t rename it, the script will create a `Transactions` sheet automatically.

### Step 2 — Add the Apps Script

1. In the Sheet: **Extensions → Apps Script**
2. Delete any default code
3. Paste the contents of `apps-script.gs`
4. Click **Save**

### Step 3 — Deploy as a Web App (API endpoint)

1. Click **Deploy → New deployment**
2. Select **Type: Web app**
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Authorize when prompted
6. Copy the **Web app URL**

### Step 4 — Use it in the CyberTrade app

1. Open the web app (`site/index.html` locally, or your Netlify / Render URL)
2. Paste the Web App URL into **Google Sheets API URL** (unless **server bridge** is on and the host already has `CYBERTRADE_APPS_SCRIPT_URL` set)
3. Submit a transaction
4. Click **Refresh Dashboard**

---

## 3) Google Sheet columns (what gets stored)

The script writes these columns (header row is created automatically):

- `transactionId`
- `dateTime` (ISO string)
- `itemCode`
- `itemName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `staffName`

---

## 4) Performance / bulk sample data (1000+ transactions)

1. Paste your API URL
2. Set **How many transactions?** to `1000`
3. Set **Throttle** to `50` ms (if you get failures, increase to 100–250 ms)
4. Click **Generate & Upload**

After it finishes, the dashboard will refresh automatically.

---

## 5) Deploy to Netlify

Static files live in **`site/`**. The **backend** is two **Netlify Functions** in `netlify/functions/` plus `netlify.toml` rewrites to `/api/cybertrade` (same paths the web app already uses).

### Option A — Drag & drop (static only — no backend)

1. Drag‑and‑drop the **`site`** folder into Netlify.
2. Netlify **will not** run Functions; you must paste the Google **/exec** URL in the app, and **phones may still show “failed to fetch”.**

Use this only for quick tests on a desktop browser.

### Option B — Git‑connected site (recommended — includes backend)

1. Push this whole project to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify reads **`netlify.toml`**: **Publish directory** = `site`, **Functions** = `netlify/functions`.
4. Under **Site configuration → Environment variables**, add:
   - **Key:** `CYBERTRADE_APPS_SCRIPT_URL`  
   - **Value:** your Apps Script **Web app** URL (ends with `/exec`)
5. Trigger a deploy (**Deploys → Trigger deploy**).

Open your **`https://….netlify.app`** URL, leave **server bridge** checked, and **do not** paste the Google URL on each device unless you turn the bridge off.

### Option C — Netlify CLI (from your PC)

From the project root (with [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed):

```powershell
cd "C:\Users\jarvi.DESKTOP-1J7LPQJ\Downloads\ariel"
netlify deploy --build --prod
```

Set `CYBERTRADE_APPS_SCRIPT_URL` in the Netlify UI (or `netlify env:set`) before relying on the bridge.

---

## 6) Deploy for the whole class (Render)

One public HTTPS site for everyone; the server keeps the Google secret; browsers only talk to Render.

### Prerequisites

- A [GitHub](https://github.com) account and this project pushed to a repository (Render deploys from Git).
- Your Apps Script **Web app** URL (`…/exec`) with **Who has access: Anyone** (see [§2](#2-connect-to-google-sheets-database)).

### Steps

1. Sign up at [render.com](https://render.com) and connect GitHub.
2. **New → Web Service**, select this repository.
3. Configure:
   - **Runtime:** Node  
   - **Build command:** `npm install`  
   - **Start command:** `npm start`  
   - **Instance type:** Free  
4. Under **Environment**, add:
   - **Key:** `CYBERTRADE_APPS_SCRIPT_URL`  
   - **Value:** your full Web App URL (must end with `/exec`)
5. Create the service and wait for the first deploy. Your app will be at something like `https://cybertrade-xxxx.onrender.com`.

### What classmates do

1. Open that **https** link on a phone or laptop (any network).  
2. Leave **Use server bridge** checked (default when the server is configured).  
3. Do **not** paste the Google URL unless you intentionally use “direct” mode.

### Free tier note

Free Render apps **spin down** after idle time. The **first** visit after a break can take **30–60 seconds** to wake up; later clicks are normal.

### Optional: `render.yaml`

If this file is in the repo root, you can use Render’s **Blueprint** flow; you still must set `CYBERTRADE_APPS_SCRIPT_URL` in the dashboard (or when prompted) because it is marked `sync: false`.

---

## Troubleshooting

### “GET failed” / “POST failed”

- Confirm you pasted the **Web App URL**, not the Apps Script editor URL.
- Confirm the deployment is set to **Who has access: Anyone**.
- If you updated the script, redeploy (**Deploy → Manage deployments → Edit → Deploy**).

### CORS / browser blocked request / “failed to fetch” on phone

Use **server bridge** with a URL your browser trusts: **§5 Netlify (Git)** or **§6 Render**, or **Option C** `node server.mjs` on your own PC (same Wi‑Fi only).

Also confirm you did **not** paste the spreadsheet **Share** link — you need the **Web app** URL from **Deploy** (contains `script.google.com/macros`, ends with `/exec`).

