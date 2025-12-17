import { useState } from 'react'
import './App.css'

const API_KEY = '3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z'
const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data'

function App() {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchEIAData = async (stateId, sectorId) => {
    const params = new URLSearchParams({
      api_key: API_KEY,
      'data[]': 'price',
      'facets[stateid][]': stateId,
      'facets[sectorid][]': sectorId,
      frequency: 'monthly',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      length: '2'
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
        fetchEIAData('TX', 'RES'),
        fetchEIAData('TX', 'COM'),
        fetchEIAData('US', 'RES'),
        fetchEIAData('US', 'COM')
      ])

      const rawRates = {
        dataPeriod: txRes[0]?.period || 'Unknown',
        prevPeriod: txRes[1]?.period || 'Unknown',
        txResCurrent: parseFloat(txRes[0]?.price) || 0,
        txResPrev: parseFloat(txRes[1]?.price) || 0,
        txComCurrent: parseFloat(txCom[0]?.price) || 0,
        txComPrev: parseFloat(txCom[1]?.price) || 0,
        usResCurrent: parseFloat(usRes[0]?.price) || 0,
        usResPrev: parseFloat(usRes[1]?.price) || 0,
        usComCurrent: parseFloat(usCom[0]?.price) || 0,
        usComPrev: parseFloat(usCom[1]?.price) || 0
      }

      const calculated = calculateShortcodes(rawRates)
      setRates(calculated)
      setLastFetched(new Date().toLocaleString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateShortcodes = (r) => {
    const txResChange = r.txResCurrent - r.txResPrev
    const txComChange = r.txComCurrent - r.txComPrev
    const usResChange = r.usResCurrent - r.usResPrev
    const usComChange = r.usComCurrent - r.usComPrev

    return {
      month: r.dataPeriod,
      previousMonth: r.prevPeriod,
      
      // Existing shortcodes
      avg_texas_residential_rate: `${r.txResCurrent.toFixed(2)} ¢/kWh`,
      'previous_month_avg_texas_residential_rate-copy': `${r.txResPrev.toFixed(2)} ¢/kWh`,
      percent_diff_monthly_resi: `${((txResChange / r.txResPrev) * 100).toFixed(2)}%`,
      avg_commercial_rate_texas: `${r.txComCurrent.toFixed(2)} ¢/kWh`,
      percent_off_us_avg_com: `${(((r.txComCurrent - r.usComCurrent) / r.usComCurrent) * 100).toFixed(1)}%`,
      percent_off_us_avg: `${(((r.txResCurrent - r.usResCurrent) / r.usResCurrent) * 100).toFixed(1)}%`,
      national_avg_rate_residential: `${r.usResCurrent.toFixed(2)} ¢/kWh`,

      // New shortcodes
      tx_res_prev_rate: `${r.txResPrev.toFixed(2)} ¢/kWh`,
      tx_res_change: `${txResChange >= 0 ? '+' : ''}${txResChange.toFixed(2)} ¢/kWh`,
      us_res_prev_rate: `${r.usResPrev.toFixed(2)} ¢/kWh`,
      us_res_change: `${usResChange >= 0 ? '+' : ''}${usResChange.toFixed(2)} ¢/kWh`,
      tx_res_vs_us_diff: `${(r.txResCurrent - r.usResCurrent).toFixed(2)} ¢/kWh`,
      tx_com_prev_rate: `${r.txComPrev.toFixed(2)} ¢/kWh`,
      tx_com_change: `${txComChange >= 0 ? '+' : ''}${txComChange.toFixed(2)} ¢/kWh`,
      us_com_rate: `${r.usComCurrent.toFixed(2)} ¢/kWh`,
      us_com_prev_rate: `${r.usComPrev.toFixed(2)} ¢/kWh`,
      us_com_change: `${usComChange >= 0 ? '+' : ''}${usComChange.toFixed(2)} ¢/kWh`,
      tx_com_vs_us_diff: `${(r.txComCurrent - r.usComCurrent).toFixed(2)} ¢/kWh`,

      // Calculated bills
      average_monthly_bill: `$${(r.txResCurrent * 10).toFixed(2)}`,
      average_monthly_bill_business: `$${(r.txComCurrent * 10).toFixed(2)}`,
      avg_texas_residential_rate_dollars: `$${(r.txResCurrent / 100).toFixed(2)}`
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const copyAllAsJSON = () => {
    if (rates) {
      navigator.clipboard.writeText(JSON.stringify(rates, null, 2))
      alert('Copied all rates as JSON!')
    }
  }

  const existingShortcodes = [
    'avg_texas_residential_rate',
    'previous_month_avg_texas_residential_rate-copy',
    'percent_diff_monthly_resi',
    'avg_commercial_rate_texas',
    'percent_off_us_avg_com',
    'percent_off_us_avg',
    'national_avg_rate_residential'
  ]

  const newShortcodes = [
    'tx_res_prev_rate',
    'tx_res_change',
    'us_res_prev_rate',
    'us_res_change',
    'tx_res_vs_us_diff',
    'tx_com_prev_rate',
    'tx_com_change',
    'us_com_rate',
    'us_com_prev_rate',
    'us_com_change',
    'tx_com_vs_us_diff'
  ]

  const calculatedFields = [
    'average_monthly_bill',
    'average_monthly_bill_business',
    'avg_texas_residential_rate_dollars'
  ]

  return (
    <div className="app">
      <header>
        <div className="logo">⚡</div>
        <h1>ComparePower EIA Rate Fetcher</h1>
        <p className="subtitle">Fetch latest Texas electricity rates from EIA.gov</p>
      </header>

      <div className="controls">
        <button 
          onClick={fetchAllRates} 
          disabled={loading}
          className="fetch-btn"
        >
          {loading ? '⏳ Fetching...' : '🔄 Fetch Latest Rates'}
        </button>
        
        {rates && (
          <button onClick={copyAllAsJSON} className="copy-btn">
            📋 Copy All as JSON
          </button>
        )}
      </div>

      {error && <div className="error">❌ Error: {error}</div>}

      {lastFetched && (
        <div className="meta">
          Last fetched: {lastFetched} | Data period: <strong>{rates?.month}</strong> (prev: {rates?.previousMonth})
        </div>
      )}

      {rates && (
        <div className="tables">
          <section>
            <h2>📊 Existing Shortcodes</h2>
            <p className="section-desc">Update these in WordPress</p>
            <table>
              <thead>
                <tr>
                  <th>Shortcode</th>
                  <th>Value</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {existingShortcodes.map(key => (
                  <tr key={key}>
                    <td className="code">{key}</td>
                    <td className="value">{rates[key]}</td>
                    <td>
                      <button 
                        className="copy-cell" 
                        onClick={() => copyToClipboard(rates[key])}
                        title="Copy value"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>🆕 New Shortcodes</h2>
            <p className="section-desc">Create these if needed</p>
            <table>
              <thead>
                <tr>
                  <th>Shortcode</th>
                  <th>Value</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {newShortcodes.map(key => (
                  <tr key={key}>
                    <td className="code">{key}</td>
                    <td className="value">{rates[key]}</td>
                    <td>
                      <button 
                        className="copy-cell" 
                        onClick={() => copyToClipboard(rates[key])}
                        title="Copy value"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>🧮 Calculated Fields</h2>
            <p className="section-desc">Based on 1,000 kWh usage</p>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {calculatedFields.map(key => (
                  <tr key={key}>
                    <td className="code">{key}</td>
                    <td className="value">{rates[key]}</td>
                    <td>
                      <button 
                        className="copy-cell" 
                        onClick={() => copyToClipboard(rates[key])}
                        title="Copy value"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {!rates && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>Click "Fetch Latest Rates" to get current EIA data</p>
        </div>
      )}

      <footer>
        <p>Data source: <a href="https://www.eia.gov/" target="_blank" rel="noopener noreferrer">U.S. Energy Information Administration</a></p>
        <p>Built for <a href="https://www.comparepower.com" target="_blank" rel="noopener noreferrer">ComparePower.com</a></p>
      </footer>
    </div>
  )
}

export default App
