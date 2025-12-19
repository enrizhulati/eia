# Product Requirements Document
## Electricity Rate Sync Platform

**Version:** 2.0  
**Date:** December 18, 2025  
**Owner:** ComparePower  
**Status:** In Development

---

## Executive Summary

The Electricity Rate Sync Platform is an automated content generation system that pulls official electricity rate data from the U.S. Energy Information Administration (EIA), enriches it with grid operator data and state rankings, and generates SEO-optimized articles designed to rank for high-intent commercial keywords like "texas electricity rates."

### Strategic Value
- **Data Moat**: Official government data provides unassailable credibility
- **Automation**: One-click article generation eliminates manual research
- **SEO Dominance**: Competitor analysis ensures content exceeds all ranking pages
- **Scalability**: Architecture supports expansion to any deregulated state

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Target Markets](#3-target-markets)
4. [Core Features](#4-core-features)
5. [Data Architecture](#5-data-architecture)
6. [Article Generation Engine](#6-article-generation-engine)
7. [Competitor Analysis System](#7-competitor-analysis-system)
8. [User Interface](#8-user-interface)
9. [Technical Architecture](#9-technical-architecture)
10. [Multi-State Expansion](#10-multi-state-expansion)
11. [WordPress Integration](#11-wordpress-integration)
12. [Success Metrics](#12-success-metrics)
13. [Roadmap](#13-roadmap)
14. [Appendices](#14-appendices)

---

## 1. Problem Statement

### The Challenge
Electricity comparison websites need fresh, authoritative content about electricity rates to rank for commercial keywords. Currently:

- **Manual research** takes hours per article update
- **Rate data becomes stale** within weeks
- **Competitor content** often exceeds word count and topic coverage
- **No single source of truth** for current rates across states
- **SEO gaps** leave money on the table

### The Opportunity
- "Texas electricity rates" = high commercial intent keyword
- Average CPA for electricity signups: $50-100+
- Millions of households in deregulated markets actively shopping
- Monthly rate changes create recurring content opportunities

---

## 2. Solution Overview

### Product Vision
A real-time dashboard that syncs official EIA electricity data and generates comprehensive, SEO-optimized articles that outrank competitors for "[state] electricity rates" keywords.

### Core Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   EIA API ──→ Dashboard ──→ AI Generator ──→ WordPress/CMS     │
│      │            │              │                │             │
│      ▼            ▼              ▼                ▼             │
│   Official    Enriched      Competitive      Published         │
│    Data       Context        Article         Content           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Differentiators
1. **Official Data Source**: EIA.gov API (government authority)
2. **Competitive Intelligence**: SERP analysis of top 10 results
3. **Brand Voice**: ComparePower tone and messaging
4. **Automation**: One-click generation with no manual research
5. **Multi-State**: Scalable to any deregulated electricity market

---

## 3. Target Markets

### Phase 1: Texas (Complete)
| Attribute | Value |
|-----------|-------|
| Market | ERCOT (deregulated) |
| Households | 12.7M residential customers |
| Grid Operator | ERCOT |
| Target Keyword | "texas electricity rates" |
| Competition | High |

### Phase 2: Expansion States

#### Ohio
| Attribute | Value |
|-----------|-------|
| Market | PJM (deregulated) |
| Households | ~4.5M eligible |
| Grid Operator | PJM Interconnection |
| Target Keyword | "ohio electricity rates" |
| Key Utilities | AEP Ohio, Duke Energy Ohio, FirstEnergy |
| Key Cities | Columbus, Cleveland, Cincinnati, Toledo |

#### Pennsylvania
| Attribute | Value |
|-----------|-------|
| Market | PJM (deregulated) |
| Households | ~5.1M eligible |
| Grid Operator | PJM Interconnection |
| Target Keyword | "pennsylvania electricity rates" |
| Key Utilities | PECO, PPL, Duquesne Light, West Penn Power |
| Key Cities | Philadelphia, Pittsburgh, Allentown, Erie |

#### Massachusetts
| Attribute | Value |
|-----------|-------|
| Market | ISO-NE (deregulated) |
| Households | ~2.8M eligible |
| Grid Operator | ISO New England |
| Target Keyword | "massachusetts electricity rates" |
| Key Utilities | Eversource, National Grid, Unitil |
| Key Cities | Boston, Worcester, Springfield, Cambridge |
| Note | Highest rates in continental US (~25-28¢/kWh) |

---

## 4. Core Features

### 4.1 Real-Time Rate Dashboard

#### 4.1.1 Rate Display Cards
- **State Residential Rate**: Current ¢/kWh with month-over-month change
- **State Commercial Rate**: Business rates for B2B content
- **US Average Comparison**: Percentage above/below national average
- **Average Monthly Bill**: Calculated from usage × rate
- **Average Monthly Usage**: State-specific consumption in kWh
- **Customer Count**: Total residential customers in market

#### 4.1.2 Rate Comparison Table
| Column | Description |
|--------|-------------|
| Metric | Rate category (Residential, Commercial) |
| Current Price | Latest month's rate in ¢/kWh |
| Previous Month | Prior month for comparison |
| Change | Absolute and percentage change |
| Trend | 6-month sparkline visualization |

#### 4.1.3 Usage Trend Table
- 6-month history of average usage (kWh)
- 6-month history of average bill ($)
- Seasonal pattern visualization

### 4.2 Grid Operator Monitor

#### 4.2.1 ERCOT (Texas)
| Metric | Description |
|--------|-------------|
| Daily Demand | Actual MWh consumed |
| Forecast | Predicted demand |
| Total Generation | MWh produced |
| Renewable Mix | Wind + Solar percentage |
| Fuel Mix | Breakdown by source (Gas, Wind, Solar, Nuclear, Coal) |
| 7-Day Trend | Daily demand/generation history |

#### 4.2.2 PJM (Ohio, Pennsylvania)
| Metric | Description |
|--------|-------------|
| Regional Load | Total demand in state zone |
| Generation Mix | Fuel type breakdown |
| Interchange | Import/export with neighbors |

#### 4.2.3 ISO-NE (Massachusetts)
| Metric | Description |
|--------|-------------|
| System Load | New England demand |
| Generation by Fuel | Source breakdown |
| Real-Time Prices | LMP by zone |

### 4.3 State Rankings

| Data Point | Description |
|------------|-------------|
| Price Rank | State position (1-51) by avg retail price |
| Sales Rank | Total electricity sales volume |
| Generation Rank | Net generation capacity |
| Prime Source | Primary fuel type |
| Cheapest 5 | Lowest-priced states |
| Most Expensive 5 | Highest-priced states |

### 4.4 Content Story Cards

Pre-written content snippets with live data:
- Usage comparison vs national average
- Average monthly bill calculation
- Rate comparison messaging
- Customer count statistics
- Seasonal bill swing data
- Commercial rate comparison

Click-to-copy functionality for quick content creation.

### 4.5 Export Functions

| Format | Contents |
|--------|----------|
| JSON | Complete data payload |
| CSV | Shortcode key-value pairs |
| Shortcodes | WordPress shortcode list |
| Markdown | Generated article |

---

## 5. Data Architecture

### 5.1 Data Sources

#### Primary: EIA API v2
```
Base URL: https://api.eia.gov/v2/electricity/
Endpoints:
  - /retail-sales/data (rates, usage, revenue)
  - /rto/daily-region-data/data (grid demand)
  - /rto/daily-fuel-type-data/data (generation mix)
  - /state-electricity-profiles/summary/data (rankings)
```

#### Secondary: Grid Operators
- ERCOT (Texas): Via EIA API (respondent: ERCO)
- PJM (OH, PA): Via EIA API (respondent: PJM)
- ISO-NE (MA): Via EIA API (respondent: ISNE)

### 5.2 Data Fields

#### Retail Sales Data
| Field | Description | Unit |
|-------|-------------|------|
| price | Average retail price | ¢/kWh |
| sales | Total sales volume | Million kWh |
| customers | Customer count | Thousands |
| revenue | Total revenue | Million $ |
| period | Reporting month | YYYY-MM |

#### Grid Operator Data
| Field | Description | Unit |
|-------|-------------|------|
| value | Demand/generation value | MWh |
| type | D (demand), DF (forecast) | - |
| fueltype | NG, WND, SUN, COL, NUC | - |
| period | Reporting date | YYYY-MM-DD |

### 5.3 Calculated Metrics

```javascript
// Average Usage per Customer
avgUsage = (sales * 1,000,000) / customers  // kWh/month

// Average Bill per Customer  
avgBill = (revenue * 1,000,000) / customers  // $/month

// State vs US Comparison
percentDiff = ((stateRate - usRate) / usRate) * 100

// Renewable Percentage
renewablePct = ((wind + solar) / totalGeneration) * 100
```

### 5.4 Data Refresh Schedule

| Data Type | Update Frequency | Lag |
|-----------|------------------|-----|
| Monthly Rates | Monthly | 2-3 months |
| Daily Grid | Daily | 1 day |
| State Rankings | Annual | 6-12 months |

---

## 6. Article Generation Engine

### 6.1 AI Model Selection

| Mode | Model | Use Case | Max Tokens |
|------|-------|----------|------------|
| Standard | Claude 3 Haiku | Basic article generation | 4,096 |
| Competitive | Claude Sonnet 4 | With competitor analysis | 8,192 |

### 6.2 System Prompt (ComparePower Voice)

```
You are a senior SEO content strategist and writer for ComparePower, 
Texas' top-rated electricity marketplace. Your goal is to write THE 
definitive, most comprehensive article on [State] electricity rates 
that will outrank all competitors.

## VOICE GUIDELINES (ComparePower Voice)
- Casual, not corporate - like a protective friend who tells the truth
- Attack the system/providers, NEVER the customer
- Use specific numbers, never vague claims
- Front-load key information (rate anchor in first paragraph)
- Be authoritative but accessible
- End with: "Back to your day, confident you aren't overpaying"

## KEY PHRASES TO WEAVE NATURALLY
- "tricky ads, teaser rates, and confusing terms"
- "We've already done the homework"
- "It's not your fault—the system is designed to be confusing"
- "power to choose"
```

### 6.3 Article Structure (Mandatory Sections)

| # | Section | Min Words | Purpose |
|---|---------|-----------|---------|
| 1 | Frontmatter | - | YAML: title, description, keywords |
| 2 | H1 Title | - | "[State] Electricity Rates - [Month] [Year]" |
| 3 | Opening Hook | 200+ | Rate anchor, context, why it matters |
| 4 | Key Takeaways | - | 5-7 bullets with specific numbers |
| 5 | Current Rates Overview | 400+ | EIA data, state vs US, drivers |
| 6 | Rates by City | 300+ | Table with major cities at 500/1000/2000 kWh |
| 7 | Understanding Your Bill | 350+ | TDU, delivery, energy charges |
| 8 | Plan Types | 400+ | Fixed, variable, TOU, prepaid, etc. |
| 9 | How to Compare | 350+ | EFL breakdown, true cost, hidden fees |
| 10 | Seasonal Trends | 300+ | Historical patterns, best months |
| 11 | Deregulation Explained | 300+ | Grid operator, REPs, how it works |
| 12 | Money-Saving Tips | 300+ | Practical strategies |
| 13 | FAQs | 500+ | 10+ comprehensive Q&As |
| 14 | Bottom Line | 150+ | CTA, Live Link, tagline |
| 15 | Footnotes | - | Data sources, methodology |
| 16 | Schema Markup | - | JSON-LD: Article, FAQPage, Breadcrumb |

### 6.4 Word Count Targets

| Mode | Minimum | Target | Maximum |
|------|---------|--------|---------|
| Standard | 2,000 | 2,500 | 3,000 |
| Competitive | 3,000 | 3,500 | 4,500 |

Competitive mode: Must exceed highest competitor word count by 10%+

### 6.5 SEO Requirements

#### Primary Keywords (use 8-12 times naturally)
- "[state] electricity rates"
- "[state] electric rates"

#### Secondary Keywords
- "electricity prices [state]"
- "average electric bill [state]"
- "compare [state] electricity"
- "[city] electricity rates"

#### Technical SEO
- H2s contain keywords where natural
- Internal anchor links to sections
- Schema markup for rich snippets
- Location-based terms throughout

---

## 7. Competitor Analysis System

### 7.1 SERP Crawling

#### Search Query
```
"[state] electricity rates"
```

#### Data Extraction (per result)
| Field | Method |
|-------|--------|
| URL | SERP API |
| Title | SERP API |
| Word Count | HTML parsing |
| H1/H2/H3 Headings | Regex extraction |
| Key Topics | Keyword matching |
| Content Preview | First 500 chars |

### 7.2 Analysis Metrics

| Metric | Calculation |
|--------|-------------|
| Avg Word Count | Sum(words) / count(pages) |
| Min Word Count | Minimum across top 10 |
| Max Word Count | Maximum across top 10 |
| Recommended Target | Max + 500 words |
| Common Topics | Topics appearing in 3+ pages |
| Unique Headings | Deduplicated H2/H3 list |

### 7.3 AI Synthesis

Claude analyzes competitor data to produce:
```json
{
  "requiredTopics": ["topic1", "topic2", ...],
  "minimumWordCount": 3500,
  "suggestedH2Sections": ["section1", "section2", ...],
  "contentGaps": ["gap1", "gap2", ...],
  "competitiveAdvantage": "strategy note"
}
```

### 7.4 Competitive Requirements

When competitor analysis is enabled, article MUST:
1. Cover **every topic** that competitors cover
2. Exceed **maximum competitor word count**
3. Include sections competitors miss (grid data, seasonal trends)
4. Have **more comprehensive FAQs** than any competitor
5. Include actual **rate tables by city**

---

## 8. User Interface

### 8.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ [State] Electricity Rate Sync                               │
│  Powered by EIA.gov API • Last fetched: [timestamp] • Secure ✓ │
├─────────────────────────────────────────────────────────────────┤
│  Data Period: [Sep 2025]              [⟳ Fetch Latest Data]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Avg Usage│ │ Avg Bill │ │Customers │ │ vs US %  │          │
│  │ 1,308kWh │ │   $207   │ │  12.7M   │ │  -12.3%  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  🔌 Grid Monitor                            [Daily Data]        │
│  ┌─────────────┬─────────────┬─────────────┐                   │
│  │Daily Demand │ Generation  │Renewable Mix│                   │
│  │ 1.15M MWh   │ 1.16M MWh  │    32%      │                   │
│  └─────────────┴─────────────┴─────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│  📊 Rate Comparison Table                                       │
├─────────────────────────────────────────────────────────────────┤
│  📈 Usage & Bill Trend                                          │
├─────────────────────────────────────────────────────────────────┤
│  💡 Content Ideas (click to copy)                               │
├─────────────────────────────────────────────────────────────────┤
│  📝 Generate Article                                            │
│  [Toggle: Enable Article Generator]                             │
│  [Checkbox: 🔍 Competitor Analysis]                             │
│  [Button: ✨ Generate Article / 🚀 Generate Competitive]        │
├─────────────────────────────────────────────────────────────────┤
│  📦 Export: [Copy JSON] [Download CSV] [Copy Shortcodes]        │
├─────────────────────────────────────────────────────────────────┤
│  ✅ WordPress Shortcodes (click to copy)                        │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 State Selector (Multi-State Phase)

```
┌─────────────────────────────────────────────────────────────────┐
│  Select State:                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                          │
│  │  TX  │ │  OH  │ │  PA  │ │  MA  │                          │
│  │ ━━━━ │ │      │ │      │ │      │  ← Active state underlined│
│  └──────┘ └──────┘ └──────┘ └──────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Competitor Analysis UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Competitor Analysis                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [✓] Crawl top 10 Google results, analyze content        │   │
│  │     structure & word counts, ensure article covers all  │   │
│  │     competitor topics to rank competitively.            │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  📊 Competitor Insights (after analysis)                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │
│  │ Pages  │ │Avg Words│ │Min Words│ │Max Words│                │
│  │   10   │ │  2,847  │ │  1,203  │ │  4,521  │                │
│  └────────┘ └────────┘ └────────┘ └────────┘                  │
│                                                                 │
│  Common Topics:                                                 │
│  [electricity rate] [kwh] [monthly bill] [fixed rate] [...]    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Article Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  Article Preview                      24,532 chars │ ~3,847 words│
├─────────────────────────────────────────────────────────────────┤
│  ---                                                            │
│  title: "Texas Electricity Rates - December 2025"               │
│  description: "Texas electricity rates average 15.23¢/kWh..."   │
│  ---                                                            │
│                                                                 │
│  # Texas Electricity Rates - December 2025                      │
│                                                                 │
│  Texas electricity rates currently average 15.23¢/kWh...        │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  [📋 Copy to Clipboard]  [⬇️ Download .md]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Technical Architecture

### 9.1 Technology Stack

#### Dashboard (All States)
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | CSS Variables (Dark Theme) |
| Hosting | Netlify |
| Serverless | Netlify Functions |
| AI | Anthropic Claude API |
| SERP Data | Serper.dev API |
| Rate Data | EIA.gov API v2 |

#### Texas Consumer Site
| Layer | Technology |
|-------|------------|
| CMS | WordPress |
| Data Integration | Shortcodes |
| Hosting | Existing WP infrastructure |

#### OH, PA, MA Consumer Sites
| Layer | Technology |
|-------|------------|
| Framework | Astro 4.x |
| UI Components | React 18 |
| Styling | Tailwind CSS / CSS Modules |
| Data | Static JSON (build-time) |
| Hosting | Netlify / Vercel |
| Build | Static Site Generation (SSG) |

### 9.2 Serverless Functions

| Endpoint | Purpose | Timeout |
|----------|---------|---------|
| `/api/rates` | Fetch EIA + grid data | 10s |
| `/api/generate-article` | AI article generation | 26s* |
| `/api/analyze-serp` | Competitor crawling | 26s* |

*Extended timeout requires Netlify Pro

### 9.3 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `EIA_API_KEY` | EIA.gov API access | Yes |
| `ANTHROPIC_API_KEY` | Claude AI access | Yes |
| `SERPER_API_KEY` | Google SERP data | Optional |

### 9.4 API Rate Limits

| Service | Limit | Notes |
|---------|-------|-------|
| EIA API | 1000/hour | Per API key |
| Anthropic | Per plan | Usage-based billing |
| Serper.dev | 2,500/month | Free tier |

### 9.5 Error Handling

| Scenario | Behavior |
|----------|----------|
| EIA API down | Fallback to cached data |
| SERP API unavailable | Use fallback competitor list |
| AI timeout | Show error, suggest retry |
| Rate limit exceeded | Graceful degradation message |

---

## 10. Multi-State Expansion

### 10.1 State Configuration Object

```javascript
const STATE_CONFIG = {
  TX: {
    name: 'Texas',
    code: 'TX',
    gridOperator: 'ERCOT',
    gridCode: 'ERCO',
    deregulated: true,
    keyword: 'texas electricity rates',
    utilities: ['Oncor', 'CenterPoint', 'AEP Texas', 'TNMP'],
    cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
    timezone: 'Central'
  },
  OH: {
    name: 'Ohio',
    code: 'OH',
    gridOperator: 'PJM',
    gridCode: 'PJM',
    deregulated: true,
    keyword: 'ohio electricity rates',
    utilities: ['AEP Ohio', 'Duke Energy Ohio', 'FirstEnergy'],
    cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
    timezone: 'Eastern'
  },
  PA: {
    name: 'Pennsylvania',
    code: 'PA',
    gridOperator: 'PJM',
    gridCode: 'PJM',
    deregulated: true,
    keyword: 'pennsylvania electricity rates',
    utilities: ['PECO', 'PPL', 'Duquesne Light', 'West Penn Power'],
    cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
    timezone: 'Eastern'
  },
  MA: {
    name: 'Massachusetts',
    code: 'MA',
    gridOperator: 'ISO-NE',
    gridCode: 'ISNE',
    deregulated: true,
    keyword: 'massachusetts electricity rates',
    utilities: ['Eversource', 'National Grid', 'Unitil'],
    cities: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell'],
    timezone: 'Eastern'
  }
};
```

### 10.2 State-Specific Article Prompts

Each state requires customized prompts including:
- State-specific rate context
- Local utility names and service areas
- State regulatory environment
- Regional grid operator details
- City-specific rate tables
- State-specific FAQs

### 10.3 Data Fetching by State

```javascript
// Parameterized fetch
async function fetchStateData(stateCode) {
  const config = STATE_CONFIG[stateCode];
  
  const [rates, grid, rankings] = await Promise.all([
    fetchEIAData(config.code, 'RES'),
    fetchGridData(config.gridCode),
    fetchStateRankings()
  ]);
  
  return processStateData(rates, grid, rankings, config);
}
```

### 10.4 URL Structure

| Pattern | Example |
|---------|---------|
| Dashboard | `eia-data.netlify.app/?state=TX` |
| Article | `comparepower.com/electricity-rates/texas/` |
| Article | `comparepower.com/electricity-rates/ohio/` |

---

## 11. CMS Integration

### 11.1 Platform by State

| State | CMS Platform | Integration Method |
|-------|--------------|-------------------|
| **Texas** | WordPress | Shortcodes |
| **Ohio** | Astro + React | API / JSON import |
| **Pennsylvania** | Astro + React | API / JSON import |
| **Massachusetts** | Astro + React | API / JSON import |

### 11.2 WordPress Integration (Texas)

#### Shortcode Reference
| Shortcode | Example Output |
|-----------|----------------|
| `[sc name="avg_texas_residential_rate"]` | 15.23 ¢/kWh |
| `[sc name="avg_texas_commercial_rate"]` | 10.89 ¢/kWh |
| `[sc name="tx_vs_us_residential"]` | -12.3% |
| `[sc name="tx_avg_monthly_usage"]` | 1,308 kWh |
| `[sc name="tx_avg_monthly_bill"]` | $207 |
| `[sc name="tx_residential_customers"]` | 12,723,456 |

### 11.3 Astro + React Integration (OH, PA, MA)

#### Data Flow
```
Dashboard API ──→ JSON Export ──→ Astro Build ──→ Static Site
                      │
                      ▼
              /data/rates.json
```

#### JSON Data Structure
```json
{
  "state": "OH",
  "period": "2025-09",
  "residential": {
    "rate": 14.52,
    "vsUS": "+8.2%",
    "avgUsage": 892,
    "avgBill": 143
  },
  "commercial": {
    "rate": 11.23,
    "vsUS": "+5.1%"
  },
  "grid": {
    "operator": "PJM",
    "renewableMix": 12.3
  },
  "generatedAt": "2025-12-18T12:00:00Z"
}
```

#### Astro Component Example
```astro
---
// src/components/RateCard.astro
import rates from '../data/oh-rates.json';
---

<div class="rate-card">
  <span class="rate">{rates.residential.rate}¢/kWh</span>
  <span class="comparison">{rates.residential.vsUS} vs US avg</span>
</div>
```

#### React Component Example
```tsx
// src/components/RateDisplay.tsx
import { useEffect, useState } from 'react';

export function RateDisplay({ state }: { state: string }) {
  const [rates, setRates] = useState(null);
  
  useEffect(() => {
    fetch(`/data/${state.toLowerCase()}-rates.json`)
      .then(res => res.json())
      .then(setRates);
  }, [state]);
  
  if (!rates) return <div>Loading...</div>;
  
  return (
    <div className="rate-display">
      <h2>{rates.state} Electricity Rates</h2>
      <p className="rate">{rates.residential.rate}¢/kWh</p>
      <p className="vs-us">{rates.residential.vsUS} vs national average</p>
    </div>
  );
}
```

#### Build-Time Data Fetching (Astro)
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [react()],
  vite: {
    define: {
      'import.meta.env.RATES_API': JSON.stringify(process.env.RATES_API_URL)
    }
  }
});
```

### 11.4 Update Workflows

#### Texas (WordPress)
```
1. Open Dashboard → Select TX
2. Fetch Latest Data
3. Generate Article
4. Copy to WordPress
5. Update shortcode values
6. Publish
```

#### OH, PA, MA (Astro + React)
```
1. Open Dashboard → Select State
2. Fetch Latest Data
3. Generate Article
4. Export JSON → Save to /data/{state}-rates.json
5. Copy article markdown → Save to /content/rates/{state}.md
6. Run Astro build: npm run build
7. Deploy static site
```

#### Automated Pipeline (Future)
```
Dashboard API
     │
     ▼
GitHub Action (scheduled)
     │
     ├──→ Fetch rates for OH, PA, MA
     ├──→ Update JSON files
     ├──→ Trigger Astro rebuild
     └──→ Deploy to Netlify/Vercel
```

---

## 12. Success Metrics

### 12.1 SEO Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Keyword Ranking | Top 5 | "[state] electricity rates" |
| Organic Traffic | +50% MoM | Google Analytics |
| Featured Snippets | 3+ | SERP monitoring |
| Time on Page | > 4 min | Engagement metric |
| Bounce Rate | < 40% | Quality indicator |

### 12.2 Content Metrics

| Metric | Target |
|--------|--------|
| Word Count | 3,500+ (competitive mode) |
| Topic Coverage | 100% of competitor topics |
| FAQ Count | 10+ comprehensive answers |
| Schema Implementation | 100% valid |

### 12.3 Operational Metrics

| Metric | Target |
|--------|--------|
| Data Freshness | Updated within 48hrs of EIA release |
| Generation Time | < 30 seconds |
| Error Rate | < 1% |
| Uptime | 99.9% |

### 12.4 Business Metrics

| Metric | Target |
|--------|--------|
| Conversion Rate | > 3% visitor to comparison |
| Lead Quality | > $50 avg CPA value |
| Content Efficiency | < 10 min per article update |

---

## 13. Roadmap

### Phase 1: Texas (Complete) ✅
- [x] EIA API integration
- [x] ERCOT grid data
- [x] State rankings
- [x] Article generator (basic)
- [x] WordPress shortcodes
- [x] Competitor analysis
- [x] Enhanced article prompts

### Phase 2: Multi-State Foundation (Next)
- [ ] State selector UI in dashboard
- [ ] State configuration system
- [ ] Parameterized data fetching
- [ ] State-specific article prompts
- [ ] PJM grid integration (OH, PA)
- [ ] ISO-NE grid integration (MA)
- [ ] JSON export endpoint for Astro sites

### Phase 3: Ohio Launch
- [ ] OH rate dashboard integration
- [ ] OH article template (ComparePower voice)
- [ ] OH Astro + React site scaffold
- [ ] OH JSON data pipeline
- [ ] OH competitor analysis
- [ ] OH city rate tables (Columbus, Cleveland, Cincinnati)

### Phase 4: Pennsylvania Launch
- [ ] PA rate dashboard integration
- [ ] PA article template
- [ ] PA Astro + React site scaffold
- [ ] PA JSON data pipeline
- [ ] PA competitor analysis
- [ ] PA city rate tables (Philadelphia, Pittsburgh, Allentown)

### Phase 5: Massachusetts Launch
- [ ] MA rate dashboard integration
- [ ] MA article template
- [ ] MA Astro + React site scaffold
- [ ] MA JSON data pipeline
- [ ] MA competitor analysis
- [ ] MA city rate tables (Boston, Worcester, Springfield)

### Phase 6: Advanced Features
- [ ] Scheduled auto-updates
- [ ] Slack/email notifications on rate changes
- [ ] Historical rate charts
- [ ] Rate prediction (ML)
- [ ] API for external access
- [ ] White-label capability

---

## 14. Appendices

### A. EIA API Reference

#### Authentication
```
api_key=[YOUR_KEY]
```

#### Retail Sales Endpoint
```
GET https://api.eia.gov/v2/electricity/retail-sales/data
Parameters:
  - facets[stateid][]: TX, OH, PA, MA, US
  - facets[sectorid][]: RES, COM, IND, ALL
  - frequency: monthly, annual
  - data[]: price, sales, customers, revenue
  - sort[0][column]: period
  - sort[0][direction]: desc
  - length: number of records
```

#### Grid Operator Endpoint
```
GET https://api.eia.gov/v2/electricity/rto/daily-region-data/data
Parameters:
  - facets[respondent][]: ERCO, PJM, ISNE
  - facets[timezone][]: Central, Eastern
  - frequency: daily
  - data[]: value
```

### B. Competitor Analysis Keywords

| State | Primary | Secondary |
|-------|---------|-----------|
| TX | texas electricity rates | texas electric rates, tx electricity prices |
| OH | ohio electricity rates | ohio electric rates, oh power rates |
| PA | pennsylvania electricity rates | pa electric rates, penn power prices |
| MA | massachusetts electricity rates | ma electric rates, boston electricity |

### C. JSON-LD Schema Templates

#### Article Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[State] Electricity Rates - [Month] [Year]",
  "datePublished": "[ISO_DATE]",
  "dateModified": "[ISO_DATE]",
  "author": {
    "@type": "Organization",
    "name": "ComparePower"
  }
}
```

#### FAQPage Schema
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the average electricity rate in [State]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "As of [Month] [Year], the average residential electricity rate in [State] is [X]¢/kWh..."
      }
    }
  ]
}
```

### D. ComparePower Voice Guide

#### Do's
- Use specific numbers: "15.23¢/kWh" not "about 15 cents"
- Front-load information: Rate in first sentence
- Attack systems, not people: "The system is confusing" not "You made a mistake"
- Be casual: "Here's the deal" not "It is important to note"
- End with confidence: "Back to your day"

#### Don'ts
- Corporate speak: "We are pleased to announce"
- Vague claims: "competitive rates" without numbers
- Blame customers: "You should have read the fine print"
- Jargon without explanation: "LMP" without defining it

#### Key Phrases
- "tricky ads, teaser rates, and confusing terms"
- "We've already done the homework"
- "It's not your fault—the system is designed to be confusing"
- "power to choose"
- "Back to your day, confident you aren't overpaying"

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | - | Initial Texas implementation |
| 2.0 | Dec 2025 | - | Added competitor analysis, multi-state spec |

---

*This document is confidential and intended for internal use only.*

