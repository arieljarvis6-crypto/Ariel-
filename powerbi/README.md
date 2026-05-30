# CyberTrade → Power BI (university dashboard assignment)

Use **transaction data from CyberTrade** (Google Sheet / TPS) in **Power BI Desktop**.  
The assignment requires **Power BI or Tableau**, **≥2 KPIs**, **≥6 charts**, **labels**, and **interactivity**.

---

## 1) Data: get rows into a CSV

### A. From the live site (easiest)

1. Open your **Netlify** CyberTrade site (server bridge on).
2. **MIS Dashboard** tab → **Download CSV for Power BI**.
3. Save the file (e.g. `CyberTrade-Transactions-2026-05-28.csv`).

### B. From Google Sheets

**File → Download → Comma-separated values (.csv)** on the `Transactions` tab.

### C. Optional: refresh URL (after redeploying Apps Script)

If you updated `apps-script.gs` and redeployed the Web app:

`https://YOUR_NETLIFY_SITE/api/cybertrade?mode=csv`

In Power BI: **Get data → Web** → paste that URL (only works when Netlify env var is set).

### D. Need more rows?

On the site: **Performance Testing** → set **1000** transactions → **Generate & Upload** (wait until done), then download CSV again.

---

## 2) Redeploy Apps Script (one time after this update)

1. Google Sheet → **Extensions → Apps Script**.
2. Replace code with the latest **`apps-script.gs`** from this repo (includes `?mode=csv`).
3. **Deploy → Manage deployments → Edit → New version → Deploy**.

---

## 3) Power BI Desktop — import

1. Install [Power BI Desktop](https://powerbi.microsoft.com/desktop/).
2. **Get data → Text/CSV** → select your downloaded CSV.
3. **Transform data** (Power Query):
   - `dateTime` → **Date/Time**
   - `quantity`, `unitPrice`, `totalPrice` → **Whole number** / **Decimal**
   - `saleDate` → **Date** (already in CSV from the export button)
   - `saleMonth` → **Text** (e.g. `2026-05`)
4. **Close & Apply**.

---

## 4) Measures (KPIs)

In **Model view** → **New measure**, or copy from **`measures.dax`** in this folder:

| Measure | DAX |
|--------|-----|
| Total Sales | `Total Sales = SUM(Transactions[totalPrice])` |
| Transaction Count | `Transaction Count = COUNTROWS(Transactions)` |
| Units Sold | `Units Sold = SUM(Transactions[quantity])` |
| Avg Order Value | `Avg Order Value = DIVIDE([Total Sales], [Transaction Count])` |

Rename the table to **`Transactions`** if Power BI imported it with another name (e.g. `CyberTrade-Transactions-...`).

**Assignment:** use at least **2** of these as **Card** visuals.

---

## 5) Six charts (assignment minimum)

On one report page, add:

| # | Visual | Fields |
|---|--------|--------|
| 1 | **Line chart** | Axis: `saleDate`, Values: `Total Sales` |
| 2 | **Clustered bar** | Axis: `itemName`, Values: `Total Sales` |
| 3 | **Donut chart** | Legend: `itemName`, Values: `Total Sales` |
| 4 | **Clustered column** | Axis: `staffName`, Values: `Total Sales` |
| 5 | **Stacked column** | Axis: `itemName`, Values: `Units Sold` |
| 6 | **Table** | Columns: `itemName`, `Units Sold`, `Total Sales` |

Turn on **axis titles**, **data labels** where readable, and a **report title**: e.g. *CyberTrade MIS Dashboard*.

---

## 6) Interactivity

Add **Slicers**:

- `saleMonth` or `saleDate`
- `itemName`
- `staffName`

Enable **Edit interactions** so clicking a chart filters the others (default cross-filtering).

---

## 7) Submit

1. **Publish** to Power BI Service (sign in from Desktop).
2. **Publish to web** (public link) *or* upload the **`.pbix`** if your lecturer allows the file.
3. Record a **5-minute video**: data source → KPIs → six charts → slicers → public link.

---

## Checklist (rubric)

- [ ] Tool: **Power BI**
- [ ] Data from **previous assignment** (CyberTrade / Sheet)
- [ ] **≥ 2 KPIs**
- [ ] **≥ 6 graphics** + labels
- [ ] **Slicers / cross-filter** (interactivity)
- [ ] **Link** or **`.pbix`** + **video**
