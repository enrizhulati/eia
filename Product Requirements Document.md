Product Requirements Document

Here is a detailed **Product Requirements Document (PRD)** for building an internal agent that automatically fetches, calculates, and outputs **updated average electricity rates from EIA.gov** for use on ComparePower.com.

---

## 🛠️ Product Requirements Document

**Product Name:** ComparePower EIA Rate Fetcher
**Purpose:** Automatically pull and calculate latest Texas and U.S. electricity rate data from [EIA.gov](https://www.eia.gov/electricity/data/browser/) using their API and your key, then output formatted shortcodes and values to update ComparePower.com.
**Primary User:** Internal (Enri Zhulati or team)
**Trigger:** Manual run (CLI, button click, or webhook)

---

## 🎯 Goals

1. Eliminate manual copy/paste of EIA rates.
2. Automatically fetch latest **monthly** data from the EIA API.
3. Output calculated values and deltas as a **clean JSON or CSV** file that matches your shortcode system.
4. Ready to plug into ComparePower CMS or static site content.

---

## 📥 Data Source: EIA API

**API Base URL:** `https://api.eia.gov/series/`
**API Key:** `3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z`
**Docs:** [https://www.eia.gov/developer/](https://www.eia.gov/developer/)

### 📊 Series IDs to Use

| Metric                      | Series ID             |
| --------------------------- | --------------------- |
| Texas Residential Avg ¢/kWh | `ELEC.PRICE.TX-RES.M` |
| Texas Commercial Avg ¢/kWh  | `ELEC.PRICE.TX-COM.M` |
| U.S. Residential Avg ¢/kWh  | `ELEC.PRICE.US-RES.M` |
| U.S. Commercial Avg ¢/kWh   | `ELEC.PRICE.US-COM.M` |

These return **monthly** data. Most recent available month is usually **2 months behind real-time** (e.g., July data may post in late August).

---

## 📤 Output Format: Shortcodes + Calculated Fields

The agent will return a structured object like:

```json
{
  "month": "2025-06",
  "avg_texas_residential_rate": "15.23 ¢/kWh",
  "tx_res_prev_rate": "15.49 ¢/kWh",
  "tx_res_change": "-0.26 ¢/kWh",
  "percent_diff_monthly_resi": "-1.68%",
  "national_avg_rate_residential": "17.47 ¢/kWh",
  "tx_res_vs_us_diff": "-2.24 ¢/kWh",
  "percent_off_us_avg": "-12.8%",
  "avg_commercial_rate_texas": "8.60 ¢/kWh",
  "tx_com_prev_rate": "8.75 ¢/kWh",
  "tx_com_change": "-0.15 ¢/kWh",
  "us_com_rate": "13.63 ¢/kWh",
  "us_com_prev_rate": "13.80 ¢/kWh",
  "us_com_change": "-0.17 ¢/kWh",
  "tx_com_vs_us_diff": "-5.03 ¢/kWh",
  "percent_off_us_avg_com": "-36.9%"
}
```

Each value corresponds to a shortcode on ComparePower.com.

---

## 🧮 Required Calculations

1. **Month-over-month change:**
   `tx_res_change = current_tx_res - prev_tx_res`
   `us_com_change = current_us_com - prev_us_com`
   (same for commercial)

2. **Delta between Texas & U.S.:**
   `tx_res_vs_us_diff = current_tx_res - current_us_res`
   `tx_com_vs_us_diff = current_tx_com - current_us_com`

3. **Percentage off national average:**
   `percent_off_us_avg = (tx_res - us_res) / us_res * 100`
   `percent_off_us_avg_com = (tx_com - us_com) / us_com * 100`

4. **Percent month-over-month change:**
   `percent_diff_monthly_resi = (current_tx_res - prev_tx_res) / prev_tx_res * 100`

---

## 💻 Technical Requirements

### 1. Environment

* Python preferred (or Node.js)
* Cron-safe CLI script
* Optional: lightweight React/Vite dashboard for triggering + previewing JSON

### 2. API Integration

* Fetch last 2 months of data from each series
* Parse JSON response
* Confirm most recent `period` is available (e.g., "2025-06")

### 3. Output Options

* JSON
* CSV
* Console/table view
* Optional: push to Airtable, Notion, or CMS webhook

---

## 🧪 Example CLI Command

```bash
python fetch_eia_rates.py --output json
```

Returns JSON object for copy/paste or automated sync.

---

## 🔒 Security

* API key stored in `.env` file or secure secrets manager
* No front-end exposure unless authenticated

---

## ✨ Future Enhancements

* Auto-push values into WordPress via REST API
* Slack webhook on update
* Archive all past months as CSV/JSON
* Trend visualization dashboard

---

## ✅ Acceptance Criteria

* [ ] Pulls current + previous month data from all 4 series
* [ ] Performs all 10+ required calculations
* [ ] Outputs in structured JSON matching shortcode system
* [ ] Handles missing months or edge cases gracefully
* [ ] Easy to run manually by Enri or delegated team

---


Skip to content
Chat history





Invite team members
You said:
how do I connect to the EIA .gov electricty api 
ChatGPT said:

Thought for 30s
Got you. Here’s the quick, no-fluff path to pulling electricity data from EIA’s API (v2), plus copy-paste examples.

1) Get a free API key
Grab a key here (instant email). You’ll append it to every request as api_key=YOUR_KEY. 
U.S. Energy Information Administration

2) Know the base URL + route pattern
All requests start with:

https://api.eia.gov/v2/
Datasets are organized hierarchically, e.g.:

/electricity/retail-sales/data
/electricity/rto/fuel-type-data/data
If you call a parent route (without /data) you get metadata that lists children, available facets, fields, and frequencies. 
U.S. Energy Information Administration

3) Core query parameters you’ll use most
data[]= — which columns to return (e.g., price, sales, revenue).

facets[...][]= — filters like stateid, sectorid, RTO/BA codes, etc.

frequency= — e.g., monthly, hourly (varies by dataset).

start=, end= — date bounds (format varies by frequency).

sort[0][column]=period&sort[0][direction]=desc — ordering.

offset= & length= — pagination (JSON max ~5,000 rows per call). 
U.S. Energy Information Administration

Working examples
A) Retail electricity prices (Texas, residential), last 12 months (monthly)
cURL

curl "https://api.eia.gov/v2/electricity/retail-sales/data?api_key=YOUR_KEY\
&data[]=price\
&facets[stateid][]=TX\
&facets[sectorid][]=RES\
&frequency=monthly\
&sort[0][column]=period&sort[0][direction]=desc\
&length=12"
What you get: 12 monthly rows with price ($/kWh), period, state, sector. 
U.S. Energy Information Administration

Python (requests)

import requests, pandas as pd

url = "https://api.eia.gov/v2/electricity/retail-sales/data"
params = {
    "api_key": "YOUR_KEY",
    "data[]": ["price"],
    "facets[stateid][]": "TX",
    "facets[sectorid][]": "RES",
    "frequency": "monthly",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    "length": 12
}
r = requests.get(url, params=params)
df = pd.DataFrame(r.json()["response"]["data"])
print(df[["period","price","state","sector"]])
Parameter names & pagination behavior match the official docs. 
U.S. Energy Information Administration

B) Fuel mix by RTO/BA (e.g., ERCOT) – hourly generation by fuel
Route:

/electricity/rto/fuel-type-data/data
(One of the electricity child datasets; popular for hourly BA fuel mix.) 
Rami Krispin
RDocumentation

Example – latest few hours for ERCOT:

curl "https://api.eia.gov/v2/electricity/rto/fuel-type-data/data?api_key=YOUR_KEY\
&facets[respondent][]=ERCO\
&frequency=hourly\
&sort[0][column]=period&sort[0][direction]=desc\
&length=24"
Tip: In Jan 2024 EIA standardized data values as strings across /electricity/rto routes—cast to numeric in your code. 
U.S. Energy Information Administration

How to explore what’s available (super handy)
List the electricity subtree (routes, fields, facets, frequencies):

https://api.eia.gov/v2/electricity?api_key=YOUR_KEY
You’ll see child routes like retail-sales, available columns (price, sales, …), facet names (stateid, sectorid, …), and allowed frequencies. Use those exact field/facet names in queries. 
U.S. Energy Information Administration

Notes & gotchas
Responses & limits: JSON by default; XML available via out=xml. Pagination caps apply; use offset/length to page through >5k rows. Warnings in the JSON will tell you when you’ve hit limits. 
U.S. Energy Information Administration

API v1 vs v2: v2 is RESTful and hierarchical. If you only know a legacy series ID, you can still query it via /v2/seriesid/{ID}. 
U.S. Energy Information Administration

Updates: API v2 is wired to EIA’s public databases and updates continuously, not on a single fixed schedule. 
U.S. Energy Information Administration

If you tell me which electricity dataset you need (retail prices, ERCOT hourly load, plant capacity, emissions, etc.), I’ll drop in a ready-to-run query tailored to that exact series.





No file chosenNo file chosen
ChatGPT can make mistakes. OpenAI doesn't use CP workspace data to train its models.
