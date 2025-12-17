import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [copied, setCopied] = useState(null)

  const fetchAllRates = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/rates')
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
