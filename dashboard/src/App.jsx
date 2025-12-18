import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [copied, setCopied] = useState(null)
  
  // Article generator state
  const [articleEnabled, setArticleEnabled] = useState(false)
  const [article, setArticle] = useState(null)
  const [articleLoading, setArticleLoading] = useState(false)
  const [articleError, setArticleError] = useState(null)

  const fetchAllRates = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try the serverless function first (production)
      let response = await fetch('/api/rates')
      
      // If we get HTML back (local dev), fetch directly from EIA
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Serverless function not available, fetching directly from EIA...')
        const data = await fetchDirectFromEIA()
        setRates(data)
        setLastFetched(new Date().toLocaleString())
        return
      }
      
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setRates(data)
      setLastFetched(new Date().toLocaleString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Direct EIA fetch for local development
  const fetchDirectFromEIA = async () => {
    const API_KEY = '3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z'
    const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data'
    
    const fetchData = async (stateId, sectorId, freq = 'monthly', length = 6) => {
      const params = new URLSearchParams({
        api_key: API_KEY,
        'facets[stateid][]': stateId,
        'facets[sectorid][]': sectorId,
        frequency: freq,
        'sort[0][column]': 'period',
        'sort[0][direction]': 'desc',
        length: length.toString()
      })
      ;['price', 'sales', 'customers', 'revenue'].forEach(f => params.append('data[]', f))
      const res = await fetch(`${BASE_URL}?${params}`)
      const json = await res.json()
      return json.response?.data || []
    }

    const [txRes, txCom, usRes, usCom, txResAnnual, usResAnnual] = await Promise.all([
      fetchData('TX', 'RES', 'monthly', 6),
      fetchData('TX', 'COM', 'monthly', 6),
      fetchData('US', 'RES', 'monthly', 6),
      fetchData('US', 'COM', 'monthly', 6),
      fetchData('TX', 'RES', 'annual', 2),
      fetchData('US', 'RES', 'annual', 2)
    ])

    const calcAvg = (row) => {
      const sales = parseFloat(row?.sales || 0) * 1000000
      const customers = parseFloat(row?.customers || 0)
      const revenue = parseFloat(row?.revenue || 0) * 1000000
      return {
        avgUsage: customers > 0 ? Math.round(sales / customers) : 0,
        avgBill: customers > 0 ? Math.round(revenue / customers) : 0,
        customers: Math.round(customers)
      }
    }

    const calcAnnualAvg = (row) => {
      const sales = parseFloat(row?.sales || 0) * 1000000
      const customers = parseFloat(row?.customers || 0)
      const revenue = parseFloat(row?.revenue || 0) * 1000000
      return {
        avgMonthlyUsage: customers > 0 ? Math.round((sales / customers) / 12) : 0,
        avgMonthlyBill: customers > 0 ? Math.round((revenue / customers) / 12) : 0,
        avgAnnualUsage: customers > 0 ? Math.round(sales / customers) : 0,
        avgAnnualBill: customers > 0 ? Math.round(revenue / customers) : 0,
        customers: Math.round(customers)
      }
    }

    return {
      period: txRes[0]?.period,
      prevPeriod: txRes[1]?.period,
      txRes: {
        current: parseFloat(txRes[0]?.price) || 0,
        prev: parseFloat(txRes[1]?.price) || 0,
        history: txRes.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(txRes[0])
      },
      txCom: {
        current: parseFloat(txCom[0]?.price) || 0,
        prev: parseFloat(txCom[1]?.price) || 0,
        history: txCom.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(txCom[0])
      },
      usRes: {
        current: parseFloat(usRes[0]?.price) || 0,
        prev: parseFloat(usRes[1]?.price) || 0,
        history: usRes.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(usRes[0])
      },
      usCom: {
        current: parseFloat(usCom[0]?.price) || 0,
        prev: parseFloat(usCom[1]?.price) || 0,
        history: usCom.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(usCom[0])
      },
      annual: {
        txRes: txResAnnual[0] ? { year: txResAnnual[0].period, ...calcAnnualAvg(txResAnnual[0]) } : null,
        usRes: usResAnnual[0] ? { year: usResAnnual[0].period, ...calcAnnualAvg(usResAnnual[0]) } : null
      },
      usageTrend: txRes.map(d => ({
        period: d.period,
        usage: calcAvg(d).avgUsage,
        bill: calcAvg(d).avgBill
      })).reverse(),
      fetchedAt: new Date().toISOString()
    }
  }

  useEffect(() => { fetchAllRates() }, [])

  const delta = (current, prev) => {
    const diff = current - prev
    const pct = ((diff / prev) * 100).toFixed(2)
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : ''
    return { diff: diff.toFixed(2), pct, arrow, positive: diff > 0 }
  }

  const formatPeriod = (period) => {
    if (!period) return ''
    const [year, month] = period.split('-')
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[parseInt(month)]} ${year}`
  }

  const formatNumber = (n) => n?.toLocaleString() || '—'

  const getShortcodes = () => {
    if (!rates) return {}
    const r = rates
    return {
      // Price shortcodes
      'avg_texas_residential_rate': `${r.txRes.current.toFixed(2)} ¢/kWh`,
      'previous_month_avg_texas_residential_rate-copy': `${r.txRes.prev.toFixed(2)} ¢/kWh`,
      'percent_diff_monthly_resi': `${delta(r.txRes.current, r.txRes.prev).pct}%`,
      'avg_commercial_rate_texas': `${r.txCom.current.toFixed(2)} ¢/kWh`,
      'percent_off_us_avg_com': `${(((r.txCom.current - r.usCom.current) / r.usCom.current) * 100).toFixed(1)}%`,
      'percent_off_us_avg': `${(((r.txRes.current - r.usRes.current) / r.usRes.current) * 100).toFixed(1)}%`,
      'national_avg_rate_residential': `${r.usRes.current.toFixed(2)} ¢/kWh`,
      'tx_res_vs_us_diff': `${(r.txRes.current - r.usRes.current).toFixed(2)} ¢/kWh`,
      'tx_com_vs_us_diff': `${(r.txCom.current - r.usCom.current).toFixed(2)} ¢/kWh`,
      'us_com_rate': `${r.usCom.current.toFixed(2)} ¢/kWh`,
      'tx_res_change': `${delta(r.txRes.current, r.txRes.prev).diff} ¢/kWh`,
      'tx_com_change': `${delta(r.txCom.current, r.txCom.prev).diff} ¢/kWh`,
      // Usage & bill shortcodes
      'average_monthly_usage': `${formatNumber(r.txRes.avgUsage)} kWh`,
      'average_monthly_bill': `$${formatNumber(r.txRes.avgBill)}`,
      'average_monthly_bill_business': `$${formatNumber(r.txCom.avgBill)}`,
      'tx_residential_customers': formatNumber(r.txRes.customers),
      // Annual averages
      'annual_avg_usage': r.annual?.txRes ? `${formatNumber(r.annual.txRes.avgMonthlyUsage)} kWh/month` : '—',
      'annual_avg_bill': r.annual?.txRes ? `$${formatNumber(r.annual.txRes.avgMonthlyBill)}/month` : '—',
      'us_avg_monthly_usage': r.annual?.usRes ? `${formatNumber(r.annual.usRes.avgMonthlyUsage)} kWh/month` : '—',
      'us_avg_monthly_bill': r.annual?.usRes ? `$${formatNumber(r.annual.usRes.avgMonthlyBill)}/month` : '—',
    }
  }

  const getJSON = () => {
    if (!rates) return {}
    const r = rates
    return {
      month: r.period,
      previous_month: r.prevPeriod,
      texas_residential: r.txRes.current,
      texas_residential_prev: r.txRes.prev,
      texas_commercial: r.txCom.current,
      texas_commercial_prev: r.txCom.prev,
      us_residential: r.usRes.current,
      us_residential_prev: r.usRes.prev,
      us_commercial: r.usCom.current,
      us_commercial_prev: r.usCom.prev,
      tx_avg_monthly_usage_kwh: r.txRes.avgUsage,
      tx_avg_monthly_bill: r.txRes.avgBill,
      tx_residential_customers: r.txRes.customers,
      annual_data: r.annual,
      usage_trend: r.usageTrend,
      ...getShortcodes()
    }
  }

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Article generation
  const generateArticle = async () => {
    if (!rates) return
    setArticleLoading(true)
    setArticleError(null)
    setArticle(null)

    try {
      // Try serverless function first (production)
      let response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates)
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Article generation requires deployment to Netlify. The serverless function is not available locally.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to generate: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setArticle(data.article)
    } catch (err) {
      setArticleError(err.message)
    } finally {
      setArticleLoading(false)
    }
  }

  const copyArticle = () => {
    if (article) copyToClipboard(article, 'article')
  }

  const downloadArticle = () => {
    if (!article || !rates) return
    const blob = new Blob([article], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const [year, month] = (rates.period || '').split('-')
    const months = ['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    a.download = `texas-electricity-rates-${months[parseInt(month)] || 'article'}-${year || 'export'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyJSON = () => copyToClipboard(JSON.stringify(getJSON(), null, 2), 'json')
  
  const copyShortcodes = () => {
    const sc = getShortcodes()
    const text = Object.entries(sc).map(([k, v]) => `[sc name="${k}"] = ${v}`).join('\n')
    copyToClipboard(text, 'shortcodes')
  }

  const downloadCSV = () => {
    const sc = getShortcodes()
    const csv = 'Shortcode,Value\n' + Object.entries(sc).map(([k, v]) => `"${k}","${v}"`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eia_rates_${rates?.period || 'export'}.csv`
    a.click()
  }

  const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const height = 24
    const width = 80
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={width} height={height} className="sparkline">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>⚡ Texas Electricity Rate Sync</h1>
        <p className="meta">
          Powered by EIA.gov API • 
          {lastFetched ? ` Last fetched: ${lastFetched}` : ' Ready to fetch'} • 
          <span className="status">Secure ✓</span>
        </p>
      </header>

      {error && <div className="error">❌ {error}</div>}

      <div className="toolbar">
        <div className="period-select">
          <span className="label">Data Period:</span>
          <span className="period">{rates ? formatPeriod(rates.period) : '—'}</span>
      </div>
        <button onClick={fetchAllRates} disabled={loading} className="btn-primary">
          {loading ? '⏳ Fetching...' : '⟳ Fetch Latest Data'}
        </button>
      </div>

      {rates && (
        <>
          {/* Key Stats Cards */}
          <section className="stats-cards">
            <div className="stat-card">
              <div className="stat-label">TX Avg Monthly Usage</div>
              <div className="stat-value">{formatNumber(rates.txRes.avgUsage)} kWh</div>
              <div className="stat-compare">US Avg: {rates.annual?.usRes ? formatNumber(rates.annual.usRes.avgMonthlyUsage) : '—'} kWh</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">TX Avg Monthly Bill</div>
              <div className="stat-value">${formatNumber(rates.txRes.avgBill)}</div>
              <div className="stat-compare">US Avg: ${rates.annual?.usRes ? formatNumber(rates.annual.usRes.avgMonthlyBill) : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">TX Residential Customers</div>
              <div className="stat-value">{(rates.txRes.customers / 1000000).toFixed(1)}M</div>
              <div className="stat-compare">{formatPeriod(rates.period)}</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">TX vs US Price Savings</div>
              <div className="stat-value">{(((rates.txRes.current - rates.usRes.current) / rates.usRes.current) * 100).toFixed(1)}%</div>
              <div className="stat-compare">Lower than national avg</div>
            </div>
          </section>

          {/* Rate Comparison Table */}
          <section className="data-panel">
            <h2>📊 Rate Comparison</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Price (¢/kWh)</th>
                  <th>Prev Month</th>
                  <th>Change</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Texas Residential</td>
                  <td className="value">{rates.txRes.current.toFixed(2)}</td>
                  <td>{rates.txRes.prev.toFixed(2)}</td>
                  <td className={delta(rates.txRes.current, rates.txRes.prev).positive ? 'up' : 'down'}>
                    {delta(rates.txRes.current, rates.txRes.prev).arrow} {delta(rates.txRes.current, rates.txRes.prev).diff} ({delta(rates.txRes.current, rates.txRes.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.txRes.history} color="#00d4aa" /></td>
                </tr>
                <tr>
                  <td>Texas Commercial</td>
                  <td className="value">{rates.txCom.current.toFixed(2)}</td>
                  <td>{rates.txCom.prev.toFixed(2)}</td>
                  <td className={delta(rates.txCom.current, rates.txCom.prev).positive ? 'up' : 'down'}>
                    {delta(rates.txCom.current, rates.txCom.prev).arrow} {delta(rates.txCom.current, rates.txCom.prev).diff} ({delta(rates.txCom.current, rates.txCom.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.txCom.history} color="#00b4d8" /></td>
                </tr>
                <tr>
                  <td>U.S. Residential</td>
                  <td className="value">{rates.usRes.current.toFixed(2)}</td>
                  <td>{rates.usRes.prev.toFixed(2)}</td>
                  <td className={delta(rates.usRes.current, rates.usRes.prev).positive ? 'up' : 'down'}>
                    {delta(rates.usRes.current, rates.usRes.prev).arrow} {delta(rates.usRes.current, rates.usRes.prev).diff} ({delta(rates.usRes.current, rates.usRes.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.usRes.history} color="#8b8b8b" /></td>
                </tr>
                <tr>
                  <td>U.S. Commercial</td>
                  <td className="value">{rates.usCom.current.toFixed(2)}</td>
                  <td>{rates.usCom.prev.toFixed(2)}</td>
                  <td className={delta(rates.usCom.current, rates.usCom.prev).positive ? 'up' : 'down'}>
                    {delta(rates.usCom.current, rates.usCom.prev).arrow} {delta(rates.usCom.current, rates.usCom.prev).diff} ({delta(rates.usCom.current, rates.usCom.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.usCom.history} color="#6b6b6b" /></td>
                </tr>
                <tr className="highlight">
                  <td><strong>TX vs US (Residential)</strong></td>
                  <td className="value savings">{(rates.txRes.current - rates.usRes.current).toFixed(2)}</td>
                  <td>—</td>
                  <td className="savings">{(((rates.txRes.current - rates.usRes.current) / rates.usRes.current) * 100).toFixed(1)}% lower</td>
                  <td></td>
                </tr>
                <tr className="highlight">
                  <td><strong>TX vs US (Commercial)</strong></td>
                  <td className="value savings">{(rates.txCom.current - rates.usCom.current).toFixed(2)}</td>
                  <td>—</td>
                  <td className="savings">{(((rates.txCom.current - rates.usCom.current) / rates.usCom.current) * 100).toFixed(1)}% lower</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Usage Trend */}
          {rates.usageTrend && rates.usageTrend.length > 0 && (
            <section className="data-panel">
              <h2>📈 Monthly Usage & Bill Trend (Texas Residential)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Avg Usage</th>
                    <th>Avg Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.usageTrend.map((m, i) => (
                    <tr key={i}>
                      <td>{formatPeriod(m.period)}</td>
                      <td className="value">{formatNumber(m.usage)} kWh</td>
                      <td className="value">${formatNumber(m.bill)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Story Ideas */}
          <section className="story-panel">
            <h2>💡 Content Ideas for Readers</h2>
            <div className="story-grid">
              <div className="story-card" onClick={() => copyToClipboard(`Texans use ${Math.round(((rates.txRes.avgUsage / (rates.annual?.usRes?.avgMonthlyUsage || 863)) - 1) * 100)}% more electricity than the national average, averaging ${formatNumber(rates.txRes.avgUsage)} kWh per month compared to ${formatNumber(rates.annual?.usRes?.avgMonthlyUsage)} kWh nationally.`, 'story1')}>
                <div className="story-stat">{Math.round(((rates.txRes.avgUsage / (rates.annual?.usRes?.avgMonthlyUsage || 863)) - 1) * 100)}%</div>
                <div className="story-text">Texans use more electricity than the national average</div>
                <div className="story-detail">{formatNumber(rates.txRes.avgUsage)} kWh vs {formatNumber(rates.annual?.usRes?.avgMonthlyUsage)} kWh nationally</div>
                <span className="copy-hint">{copied === 'story1' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className="story-card" onClick={() => copyToClipboard(`The average Texas electricity bill is $${formatNumber(rates.txRes.avgBill)} per month, based on ${formatNumber(rates.txRes.avgUsage)} kWh of usage at ${rates.txRes.current.toFixed(2)}¢/kWh.`, 'story2')}>
                <div className="story-stat">${formatNumber(rates.txRes.avgBill)}</div>
                <div className="story-text">Average monthly electric bill in Texas</div>
                <div className="story-detail">Based on {formatNumber(rates.txRes.avgUsage)} kWh at {rates.txRes.current.toFixed(2)}¢/kWh</div>
                <span className="copy-hint">{copied === 'story2' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className="story-card accent" onClick={() => copyToClipboard(`Despite higher usage, Texas electricity rates are ${Math.abs(((rates.txRes.current - rates.usRes.current) / rates.usRes.current) * 100).toFixed(1)}% below the national average—${rates.txRes.current.toFixed(2)}¢/kWh vs ${rates.usRes.current.toFixed(2)}¢/kWh.`, 'story3')}>
                <div className="story-stat">{Math.abs(((rates.txRes.current - rates.usRes.current) / rates.usRes.current) * 100).toFixed(1)}%</div>
                <div className="story-text">Texas rates below national average</div>
                <div className="story-detail">{rates.txRes.current.toFixed(2)}¢ vs {rates.usRes.current.toFixed(2)}¢/kWh nationally</div>
                <span className="copy-hint">{copied === 'story3' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className="story-card" onClick={() => copyToClipboard(`${(rates.txRes.customers / 1000000).toFixed(1)} million Texas households have the power to choose their electricity provider in the deregulated ERCOT market.`, 'story4')}>
                <div className="story-stat">{(rates.txRes.customers / 1000000).toFixed(1)}M</div>
                <div className="story-text">Texas households can choose their provider</div>
                <div className="story-detail">Deregulated ERCOT market</div>
                <span className="copy-hint">{copied === 'story4' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>

              {rates.usageTrend && rates.usageTrend.length >= 4 && (() => {
                const peak = rates.usageTrend.reduce((max, m) => m.bill > max.bill ? m : max, rates.usageTrend[0]);
                const low = rates.usageTrend.reduce((min, m) => m.bill < min.bill ? m : min, rates.usageTrend[0]);
                return (
                  <div className="story-card wide" onClick={() => copyToClipboard(`Texas electricity bills swing dramatically by season—from $${formatNumber(low.bill)} in ${formatPeriod(low.period)} to $${formatNumber(peak.bill)} in ${formatPeriod(peak.period)}. Locking in a fixed rate before summer can protect against these spikes.`, 'story5')}>
                    <div className="story-stat">${formatNumber(low.bill)} → ${formatNumber(peak.bill)}</div>
                    <div className="story-text">Seasonal bill swing in Texas</div>
                    <div className="story-detail">{formatPeriod(low.period)} (low) to {formatPeriod(peak.period)} (peak)</div>
                    <span className="copy-hint">{copied === 'story5' ? '✓ Copied!' : 'Click to copy'}</span>
                  </div>
                );
              })()}

              <div className="story-card wide" onClick={() => copyToClipboard(`Texas commercial electricity rates average ${rates.txCom.current.toFixed(2)}¢/kWh—${Math.abs(((rates.txCom.current - rates.usCom.current) / rates.usCom.current) * 100).toFixed(1)}% below the U.S. commercial average of ${rates.usCom.current.toFixed(2)}¢/kWh. This makes Texas one of the most affordable states for business energy costs.`, 'story6')}>
                <div className="story-stat">{Math.abs(((rates.txCom.current - rates.usCom.current) / rates.usCom.current) * 100).toFixed(1)}%</div>
                <div className="story-text">Texas commercial rates below US average</div>
                <div className="story-detail">{rates.txCom.current.toFixed(2)}¢ vs {rates.usCom.current.toFixed(2)}¢/kWh nationally</div>
                <span className="copy-hint">{copied === 'story6' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
            </div>
          </section>

          {/* Article Generator */}
          <section className="article-panel">
            <div className="article-header">
              <h2>📝 Generate Article</h2>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={articleEnabled}
                  onChange={(e) => setArticleEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Article Generator</span>
              </label>
            </div>
            
            {articleEnabled && (
              <div className="article-content">
                <p className="article-desc">
                  Generate a complete "Texas Electricity Rates" article using the current EIA data. 
                  Written in ComparePower voice with SEO optimization and schema markup.
                </p>
                
                <button 
                  onClick={generateArticle} 
                  disabled={articleLoading || !rates}
                  className="btn-generate"
                >
                  {articleLoading ? '⏳ Generating with Claude...' : '✨ Generate Texas Electricity Rates Article'}
                </button>

                {articleError && (
                  <div className="article-error">❌ {articleError}</div>
                )}

                {article && (
                  <>
                    <div className="article-preview">
                      <div className="preview-header">
                        <span>Article Preview</span>
                        <span className="preview-length">{article.length.toLocaleString()} chars</span>
                      </div>
                      <pre className="preview-content">{article}</pre>
                    </div>
                    
                    <div className="article-actions">
                      <button onClick={copyArticle} className="btn-export">
                        {copied === 'article' ? '✓ Copied!' : '📋 Copy to Clipboard'}
                      </button>
                      <button onClick={downloadArticle} className="btn-export">
                        ⬇️ Download .md
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Export */}
          <section className="export-panel">
            <h2>📦 Export</h2>
            <div className="export-buttons">
              <button onClick={copyJSON} className="btn-export">
                {copied === 'json' ? '✓ Copied!' : '📋 Copy JSON'}
              </button>
              <button onClick={downloadCSV} className="btn-export">
                ⬇️ Download CSV
              </button>
              <button onClick={copyShortcodes} className="btn-export">
                {copied === 'shortcodes' ? '✓ Copied!' : '🔠 Copy Shortcodes'}
              </button>
            </div>
          </section>

          {/* Shortcodes */}
          <section className="shortcode-panel">
            <h2>✅ WordPress Shortcodes</h2>
            <div className="shortcode-grid">
              {Object.entries(getShortcodes()).map(([key, value]) => (
                <div key={key} className="shortcode-row" onClick={() => copyToClipboard(value, key)}>
                  <code>[sc name="{key}"]</code>
                  <span className="shortcode-value">{value}</span>
                  <span className="copy-hint">{copied === key ? '✓' : '📋'}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {!rates && !loading && (
        <div className="empty">
          <p>Click "Fetch Latest Data" to load EIA rates</p>
        </div>
      )}

      <footer>
        <p>Data: <a href="https://www.eia.gov/" target="_blank" rel="noreferrer">U.S. Energy Information Administration</a> • Built for <a href="https://comparepower.com" target="_blank" rel="noreferrer">ComparePower.com</a></p>
      </footer>
    </div>
  )
}

export default App
