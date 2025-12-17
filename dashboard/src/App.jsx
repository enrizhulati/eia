import { useState, useEffect } from 'react'
import './App.css'

const API_KEY = '3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z'
const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data'

function App() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [copied, setCopied] = useState(null)

  const fetchEIAData = async (stateId, sectorId, months = 6) => {
    const params = new URLSearchParams({
      api_key: API_KEY,
      'data[]': 'price',
      'facets[stateid][]': stateId,
      'facets[sectorid][]': sectorId,
      frequency: 'monthly',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      length: months.toString()
    })

    const response = await fetch(`${BASE_URL}?${params}`)
    const data = await response.json()
    return data.response?.data || []
  }

  const fetchAllRates = async () => {
    setLoading(true)
    setError(null)

    try {
      const [txRes, txCom, usRes, usCom] = await Promise.all([
        fetchEIAData('TX', 'RES', 6),
        fetchEIAData('TX', 'COM', 6),
        fetchEIAData('US', 'RES', 6),
        fetchEIAData('US', 'COM', 6)
      ])

      const raw = {
        period: txRes[0]?.period,
        prevPeriod: txRes[1]?.period,
        txRes: { current: parseFloat(txRes[0]?.price), prev: parseFloat(txRes[1]?.price), history: txRes.map(d => parseFloat(d.price)).reverse() },
        txCom: { current: parseFloat(txCom[0]?.price), prev: parseFloat(txCom[1]?.price), history: txCom.map(d => parseFloat(d.price)).reverse() },
        usRes: { current: parseFloat(usRes[0]?.price), prev: parseFloat(usRes[1]?.price), history: usRes.map(d => parseFloat(d.price)).reverse() },
        usCom: { current: parseFloat(usCom[0]?.price), prev: parseFloat(usCom[1]?.price), history: usCom.map(d => parseFloat(d.price)).reverse() }
      }

      setRates(raw)
      setLastFetched(new Date().toLocaleString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllRates()
  }, [])

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

  const getShortcodes = () => {
    if (!rates) return {}
    const r = rates
    return {
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
      tx_vs_us_residential_diff: (r.txRes.current - r.usRes.current).toFixed(2),
      tx_vs_us_commercial_diff: (r.txCom.current - r.usCom.current).toFixed(2),
      tx_vs_us_residential_pct: (((r.txRes.current - r.usRes.current) / r.usRes.current) * 100).toFixed(1),
      tx_vs_us_commercial_pct: (((r.txCom.current - r.usCom.current) / r.usCom.current) * 100).toFixed(1),
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
          <span className="status">API Connected ✓</span>
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
          <section className="data-panel">
            <h2>📊 Rate Comparison</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Current (¢/kWh)</th>
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
        <p>Data: <a href="https://www.eia.gov/" target="_blank">U.S. Energy Information Administration</a> • Built for <a href="https://comparepower.com" target="_blank">ComparePower.com</a></p>
      </footer>
    </div>
  )
}

export default App
