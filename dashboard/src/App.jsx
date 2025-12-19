import { useState, useEffect } from 'react'
import './App.css'

// State configuration
const STATES = {
  TX: { name: 'Texas', abbrev: 'TX', emoji: '🤠', gridName: 'ERCOT', hasArticleGen: true },
  OH: { name: 'Ohio', abbrev: 'OH', emoji: '🌰', gridName: 'PJM', hasArticleGen: false },
  PA: { name: 'Pennsylvania', abbrev: 'PA', emoji: '🔔', gridName: 'PJM', hasArticleGen: false },
  MA: { name: 'Massachusetts', abbrev: 'MA', emoji: '🦞', gridName: 'ISO-NE', hasArticleGen: false }
}

function App() {
  const [activeState, setActiveState] = useState('TX')
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [copied, setCopied] = useState(null)
  
  // Article generator state (Texas only for now)
  const [articleEnabled, setArticleEnabled] = useState(false)
  const [competitorAnalysis, setCompetitorAnalysis] = useState(false)
  const [article, setArticle] = useState(null)
  const [articleLoading, setArticleLoading] = useState(false)
  const [articleError, setArticleError] = useState(null)
  const [competitorData, setCompetitorData] = useState(null)
  const [analysisProgress, setAnalysisProgress] = useState('')

  const currentStateConfig = STATES[activeState]

  const fetchStateRates = async (stateId) => {
    setLoading(true)
    setError(null)

    try {
      // Try serverless function first (production)
      let response = await fetch(`/api/state-rates?state=${stateId}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Serverless function not available, fetching directly from EIA...')
        const data = await fetchDirectFromEIA(stateId)
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
  const fetchDirectFromEIA = async (stateId) => {
    const API_KEY = '3U1SdIvYnXx3ZGczLrOUjwNLFXRBiPv7h2Bpcb2Z'
    const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data'
    
    const fetchData = async (state, sectorId, freq = 'monthly', length = 6) => {
      const params = new URLSearchParams({
        api_key: API_KEY,
        'facets[stateid][]': state,
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

    const [stateRes, stateCom, stateInd, usRes, usCom, stateResAnnual, usResAnnual, historicalRes] = await Promise.all([
      fetchData(stateId, 'RES', 'monthly', 6),
      fetchData(stateId, 'COM', 'monthly', 6),
      fetchData(stateId, 'IND', 'monthly', 6),
      fetchData('US', 'RES', 'monthly', 6),
      fetchData('US', 'COM', 'monthly', 6),
      fetchData(stateId, 'RES', 'annual', 2),
      fetchData('US', 'RES', 'annual', 2),
      fetchData(stateId, 'RES', 'annual', 10)
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
      stateId,
      stateName: STATES[stateId]?.name || stateId,
      period: stateRes[0]?.period,
      prevPeriod: stateRes[1]?.period,
      residential: {
        current: parseFloat(stateRes[0]?.price) || 0,
        prev: parseFloat(stateRes[1]?.price) || 0,
        history: stateRes.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(stateRes[0])
      },
      commercial: {
        current: parseFloat(stateCom[0]?.price) || 0,
        prev: parseFloat(stateCom[1]?.price) || 0,
        history: stateCom.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(stateCom[0])
      },
      industrial: {
        current: parseFloat(stateInd[0]?.price) || 0,
        prev: parseFloat(stateInd[1]?.price) || 0,
        history: stateInd.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(stateInd[0])
      },
      usResidential: {
        current: parseFloat(usRes[0]?.price) || 0,
        prev: parseFloat(usRes[1]?.price) || 0,
        history: usRes.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(usRes[0])
      },
      usCommercial: {
        current: parseFloat(usCom[0]?.price) || 0,
        prev: parseFloat(usCom[1]?.price) || 0,
        history: usCom.map(d => parseFloat(d.price)).reverse(),
        ...calcAvg(usCom[0])
      },
      annual: {
        state: stateResAnnual[0] ? { year: stateResAnnual[0].period, ...calcAnnualAvg(stateResAnnual[0]) } : null,
        us: usResAnnual[0] ? { year: usResAnnual[0].period, ...calcAnnualAvg(usResAnnual[0]) } : null
      },
      usageTrend: stateRes.map(d => ({
        period: d.period,
        usage: calcAvg(d).avgUsage,
        bill: calcAvg(d).avgBill
      })).reverse(),
      historicalRates: historicalRes.map(d => ({
        year: d.period,
        price: parseFloat(d.price) || 0,
        customers: Math.round(parseFloat(d.customers) || 0),
        avgMonthlyUsage: Math.round((parseFloat(d.sales) || 0) * 1000000 / (parseFloat(d.customers) || 1) / 12),
        avgMonthlyBill: Math.round((parseFloat(d.revenue) || 0) * 1000000 / (parseFloat(d.customers) || 1) / 12)
      })),
      fetchedAt: new Date().toISOString()
    }
  }

  // Fetch on mount and when state changes
  useEffect(() => { 
    setRates(null)
    setArticle(null)
    setCompetitorData(null)
    fetchStateRates(activeState) 
  }, [activeState])

  const handleStateChange = (stateId) => {
    if (stateId !== activeState) {
      setActiveState(stateId)
    }
  }

  const delta = (current, prev) => {
    const diff = current - prev
    const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(2) : '0.00'
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

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Get vs US comparison
  const getVsUS = (stateRate, usRate) => {
    if (!usRate) return { diff: 0, pct: 0 }
    const diff = stateRate - usRate
    const pct = ((diff / usRate) * 100).toFixed(1)
    return { diff: diff.toFixed(2), pct, isLower: diff < 0 }
  }

  // Analyze competitors via SERP crawling (Texas only)
  const analyzeCompetitors = async () => {
    setAnalysisProgress('Searching for top 10 competitors...')
    
    try {
      const response = await fetch('/api/analyze-serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'texas electricity rates' })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('SERP analysis requires deployment to Netlify.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `SERP analysis failed: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setCompetitorData(data)
      setAnalysisProgress(`Analyzed ${data.results?.length || 0} competitors. Avg word count: ${data.avgWordCount || 'N/A'}`)
      return data
    } catch (err) {
      setAnalysisProgress(`Competitor analysis failed: ${err.message}`)
      return null
    }
  }

  // Article generation (Texas only)
  const generateArticle = async () => {
    if (!rates || activeState !== 'TX') return
    setArticleLoading(true)
    setArticleError(null)
    setArticle(null)
    setAnalysisProgress('')

    try {
      let serpData = null
      
      if (competitorAnalysis) {
        serpData = await analyzeCompetitors()
        if (!serpData) {
          setAnalysisProgress('Proceeding without competitor analysis...')
        }
      }

      setAnalysisProgress(competitorAnalysis && serpData ? 'Generating comprehensive article with competitor insights...' : 'Generating article...')

      let response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Convert new format to old format for article generator
          txRes: rates.residential,
          txCom: rates.commercial,
          usRes: rates.usResidential,
          usCom: rates.usCommercial,
          period: rates.period,
          prevPeriod: rates.prevPeriod,
          annual: rates.annual ? { txRes: rates.annual.state, usRes: rates.annual.us } : null,
          usageTrend: rates.usageTrend,
          ercot: rates.grid,
          rankings: rates.rankings ? {
            ...rates.rankings,
            texas: rates.rankings.targetState
          } : null,
          competitorAnalysis: serpData
        })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Article generation requires deployment to Netlify.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to generate: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setArticle(data.article)
      setAnalysisProgress('')
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
    a.download = `${rates.stateName?.toLowerCase().replace(/\s/g, '-') || 'state'}-electricity-rates-${months[parseInt(month)] || 'article'}-${year || 'export'}.md`
    a.click()
    URL.revokeObjectURL(url)
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
      {/* State Navigation */}
      <nav className="state-nav">
        {Object.entries(STATES).map(([id, state]) => (
          <button
            key={id}
            className={`state-nav-btn ${activeState === id ? 'active' : ''}`}
            onClick={() => handleStateChange(id)}
          >
            <span className="state-emoji">{state.emoji}</span>
            <span className="state-name">{state.name}</span>
            <span className="state-abbrev">{state.abbrev}</span>
          </button>
        ))}
      </nav>

      <header>
        <h1>{currentStateConfig.emoji} {currentStateConfig.name} Electricity Rate Sync</h1>
        <p className="meta">
          Powered by EIA.gov API • Grid: {currentStateConfig.gridName} • 
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
        <button onClick={() => fetchStateRates(activeState)} disabled={loading} className="btn-primary">
          {loading ? '⏳ Fetching...' : `⟳ Refresh ${currentStateConfig.abbrev} Data`}
        </button>
      </div>

      {rates && (
        <>
          {/* Key Stats Cards */}
          <section className="stats-cards">
            <div className="stat-card">
              <div className="stat-label">{rates.stateName} Avg Monthly Usage</div>
              <div className="stat-value">{formatNumber(rates.residential.avgUsage)} kWh</div>
              <div className="stat-compare">US Avg: {rates.annual?.us ? formatNumber(rates.annual.us.avgMonthlyUsage) : '—'} kWh</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{rates.stateName} Avg Monthly Bill</div>
              <div className="stat-value">${formatNumber(rates.residential.avgBill)}</div>
              <div className="stat-compare">US Avg: ${rates.annual?.us ? formatNumber(rates.annual.us.avgMonthlyBill) : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{rates.stateName} Residential Customers</div>
              <div className="stat-value">{(rates.residential.customers / 1000000).toFixed(1)}M</div>
              <div className="stat-compare">{formatPeriod(rates.period)}</div>
            </div>
            <div className={`stat-card ${getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'accent' : 'warning'}`}>
              <div className="stat-label">{rates.stateName} vs US</div>
              <div className="stat-value">{getVsUS(rates.residential.current, rates.usResidential.current).pct}%</div>
              <div className="stat-compare">
                {getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'Lower than national avg' : 'Higher than national avg'}
              </div>
            </div>
          </section>

          {/* Grid Monitor */}
          {rates.grid && (
            <section className="ercot-panel">
              <h2>🔌 {rates.grid.name} Grid Monitor <span className="live-badge">Daily Data</span></h2>
              <div className="ercot-grid">
                <div className="ercot-card demand">
                  <div className="ercot-label">Daily Demand</div>
                  <div className="ercot-value">{formatNumber(rates.grid.demand)} <span>MWh</span></div>
                  <div className="ercot-sub">Forecast: {formatNumber(rates.grid.forecast)} MWh</div>
                </div>
                <div className="ercot-card generation">
                  <div className="ercot-label">Total Generation</div>
                  <div className="ercot-value">{formatNumber(rates.grid.totalGeneration)} <span>MWh</span></div>
                  <div className="ercot-sub">{rates.grid.latestDate}</div>
                </div>
                <div className="ercot-card renewable">
                  <div className="ercot-label">Renewable Mix</div>
                  <div className="ercot-value">{rates.grid.renewablePercent}<span>%</span></div>
                  <div className="ercot-sub">Wind + Solar</div>
                </div>
              </div>
              
              {/* Fuel Mix */}
              <div className="fuel-mix">
                <h3>Generation by Fuel Type</h3>
                <div className="fuel-bars">
                  {rates.grid.fuelMix && Object.entries(rates.grid.fuelMix)
                    .filter(([_, v]) => v.value > 0)
                    .sort((a, b) => b[1].value - a[1].value)
                    .map(([fuel, data]) => (
                      <div key={fuel} className="fuel-bar-row">
                        <span className="fuel-name">{data.name}</span>
                        <div className="fuel-bar-container">
                          <div 
                            className={`fuel-bar fuel-${fuel.toLowerCase()}`} 
                            style={{ width: `${data.percent}%` }}
                          />
                        </div>
                        <span className="fuel-percent">{data.percent}%</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Daily Trend */}
              {rates.grid.dailyTrend && rates.grid.dailyTrend.length > 0 && (
                <div className="ercot-trend">
                  <h3>7-Day Trend</h3>
                  <table className="ercot-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Demand (MWh)</th>
                        <th>Wind (MWh)</th>
                        <th>Solar (MWh)</th>
                        <th>Gas (MWh)</th>
                        {rates.grid.dailyTrend.some(d => d.nuclear > 0) && <th>Nuclear (MWh)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rates.grid.dailyTrend.map((day, i) => (
                        <tr key={i}>
                          <td>{day.date}</td>
                          <td className="value">{formatNumber(Math.round(day.demand))}</td>
                          <td>{formatNumber(Math.round(day.wind))}</td>
                          <td>{formatNumber(Math.round(day.solar))}</td>
                          <td>{formatNumber(Math.round(day.gas))}</td>
                          {rates.grid.dailyTrend.some(d => d.nuclear > 0) && (
                            <td>{formatNumber(Math.round(day.nuclear))}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* State Rankings */}
          {rates.rankings && (
            <section className="rankings-panel">
              <h2>🏆 {rates.stateName} State Rankings ({rates.rankings.year})</h2>
              <div className="rankings-grid">
                <div className="rankings-texas">
                  <h3>{rates.stateName} Position</h3>
                  <div className="rank-cards">
                    <div className="rank-card">
                      <div className="rank-number">#{rates.rankings.targetState?.priceRank || '—'}</div>
                      <div className="rank-label">Retail Price</div>
                      <div className="rank-value">{rates.rankings.targetState?.price}¢/kWh</div>
                    </div>
                    <div className="rank-card">
                      <div className="rank-number">#{rates.rankings.targetState?.salesRank || '—'}</div>
                      <div className="rank-label">Total Sales</div>
                      <div className="rank-value">Market Size</div>
                    </div>
                    <div className="rank-card">
                      <div className="rank-number">#{rates.rankings.targetState?.generationRank || '—'}</div>
                      <div className="rank-label">Net Generation</div>
                      <div className="rank-value">Power Producer</div>
                    </div>
                    <div className="rank-card accent">
                      <div className="rank-label">Prime Source</div>
                      <div className="rank-value big">{rates.rankings.targetState?.primeSource || '—'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="rankings-compare">
                  <div className="ranking-list cheapest">
                    <h3>🏅 Cheapest States</h3>
                    <ol>
                      {rates.rankings.cheapest5?.map((s, i) => (
                        <li key={i} className={s.stateID === rates.stateId ? 'highlight-tx' : ''}>
                          <span className="rank-pos">#{s.rank}</span>
                          <span className="rank-state">{s.state}</span>
                          <span className="rank-price">{s.price}¢</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="ranking-list expensive">
                    <h3>💸 Most Expensive States</h3>
                    <ol>
                      {rates.rankings.mostExpensive5?.map((s, i) => (
                        <li key={i} className={s.stateID === rates.stateId ? 'highlight-tx' : ''}>
                          <span className="rank-pos">#{s.rank}</span>
                          <span className="rank-state">{s.state}</span>
                          <span className="rank-price">{s.price}¢</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Rate Comparison Table */}
          <section className="data-panel">
            <h2>📊 {rates.stateName} Rate Comparison</h2>
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
                  <td>{rates.stateName} Residential</td>
                  <td className="value">{rates.residential.current.toFixed(2)}</td>
                  <td>{rates.residential.prev.toFixed(2)}</td>
                  <td className={delta(rates.residential.current, rates.residential.prev).positive ? 'up' : 'down'}>
                    {delta(rates.residential.current, rates.residential.prev).arrow} {delta(rates.residential.current, rates.residential.prev).diff} ({delta(rates.residential.current, rates.residential.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.residential.history} color="#00d4aa" /></td>
                </tr>
                <tr>
                  <td>{rates.stateName} Commercial</td>
                  <td className="value">{rates.commercial.current.toFixed(2)}</td>
                  <td>{rates.commercial.prev.toFixed(2)}</td>
                  <td className={delta(rates.commercial.current, rates.commercial.prev).positive ? 'up' : 'down'}>
                    {delta(rates.commercial.current, rates.commercial.prev).arrow} {delta(rates.commercial.current, rates.commercial.prev).diff} ({delta(rates.commercial.current, rates.commercial.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.commercial.history} color="#00b4d8" /></td>
                </tr>
                <tr>
                  <td>{rates.stateName} Industrial</td>
                  <td className="value">{rates.industrial.current.toFixed(2)}</td>
                  <td>{rates.industrial.prev.toFixed(2)}</td>
                  <td className={delta(rates.industrial.current, rates.industrial.prev).positive ? 'up' : 'down'}>
                    {delta(rates.industrial.current, rates.industrial.prev).arrow} {delta(rates.industrial.current, rates.industrial.prev).diff} ({delta(rates.industrial.current, rates.industrial.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.industrial.history} color="#f0ad4e" /></td>
                </tr>
                <tr>
                  <td>U.S. Residential</td>
                  <td className="value">{rates.usResidential.current.toFixed(2)}</td>
                  <td>{rates.usResidential.prev.toFixed(2)}</td>
                  <td className={delta(rates.usResidential.current, rates.usResidential.prev).positive ? 'up' : 'down'}>
                    {delta(rates.usResidential.current, rates.usResidential.prev).arrow} {delta(rates.usResidential.current, rates.usResidential.prev).diff} ({delta(rates.usResidential.current, rates.usResidential.prev).pct}%)
                  </td>
                  <td><Sparkline data={rates.usResidential.history} color="#8b8b8b" /></td>
                </tr>
                <tr className="highlight">
                  <td><strong>{rates.stateName} vs US (Residential)</strong></td>
                  <td className={`value ${getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'savings' : ''}`}>{getVsUS(rates.residential.current, rates.usResidential.current).diff}</td>
                  <td>—</td>
                  <td className={getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'savings' : 'up'}>
                    {getVsUS(rates.residential.current, rates.usResidential.current).pct}% {getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'lower' : 'higher'}
                  </td>
                  <td></td>
                </tr>
                <tr className="highlight">
                  <td><strong>{rates.stateName} vs US (Commercial)</strong></td>
                  <td className="value">{getVsUS(rates.commercial.current, rates.usCommercial.current).diff}</td>
                  <td>—</td>
                  <td className={getVsUS(rates.commercial.current, rates.usCommercial.current).isLower ? 'savings' : 'up'}>
                    {getVsUS(rates.commercial.current, rates.usCommercial.current).pct}% {getVsUS(rates.commercial.current, rates.usCommercial.current).isLower ? 'lower' : 'higher'}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 10-Year Historical Rates */}
          {rates.historicalRates && rates.historicalRates.length > 0 && (
            <section className="data-panel">
              <h2>📈 10-Year Rate History ({rates.stateName} Residential)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Avg Rate (¢/kWh)</th>
                    <th>Avg Monthly Usage</th>
                    <th>Avg Monthly Bill</th>
                    <th>Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.historicalRates.map((yr, i) => (
                    <tr key={i}>
                      <td className="value">{yr.year}</td>
                      <td className="value">{yr.price.toFixed(2)}</td>
                      <td>{formatNumber(yr.avgMonthlyUsage)} kWh</td>
                      <td>${formatNumber(yr.avgMonthlyBill)}</td>
                      <td>{(yr.customers / 1000000).toFixed(2)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Usage Trend */}
          {rates.usageTrend && rates.usageTrend.length > 0 && (
            <section className="data-panel">
              <h2>📈 Monthly Usage & Bill Trend ({rates.stateName} Residential)</h2>
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
            <h2>💡 Content Ideas for {rates.stateName} Readers</h2>
            <div className="story-grid">
              <div className="story-card" onClick={() => copyToClipboard(`${rates.stateName} residents ${rates.residential.avgUsage > (rates.annual?.us?.avgMonthlyUsage || 863) ? 'use' : 'use'} ${Math.abs(Math.round(((rates.residential.avgUsage / (rates.annual?.us?.avgMonthlyUsage || 863)) - 1) * 100))}% ${rates.residential.avgUsage > (rates.annual?.us?.avgMonthlyUsage || 863) ? 'more' : 'less'} electricity than the national average, averaging ${formatNumber(rates.residential.avgUsage)} kWh per month.`, 'story1')}>
                <div className="story-stat">{Math.abs(Math.round(((rates.residential.avgUsage / (rates.annual?.us?.avgMonthlyUsage || 863)) - 1) * 100))}%</div>
                <div className="story-text">{rates.stateName} usage vs national average</div>
                <div className="story-detail">{formatNumber(rates.residential.avgUsage)} kWh vs {formatNumber(rates.annual?.us?.avgMonthlyUsage)} kWh nationally</div>
                <span className="copy-hint">{copied === 'story1' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className="story-card" onClick={() => copyToClipboard(`The average ${rates.stateName} electricity bill is $${formatNumber(rates.residential.avgBill)} per month, based on ${formatNumber(rates.residential.avgUsage)} kWh of usage at ${rates.residential.current.toFixed(2)}¢/kWh.`, 'story2')}>
                <div className="story-stat">${formatNumber(rates.residential.avgBill)}</div>
                <div className="story-text">Average monthly electric bill in {rates.stateName}</div>
                <div className="story-detail">Based on {formatNumber(rates.residential.avgUsage)} kWh at {rates.residential.current.toFixed(2)}¢/kWh</div>
                <span className="copy-hint">{copied === 'story2' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className={`story-card ${getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'accent' : ''}`} onClick={() => copyToClipboard(`${rates.stateName} electricity rates are ${Math.abs(parseFloat(getVsUS(rates.residential.current, rates.usResidential.current).pct))}% ${getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'below' : 'above'} the national average—${rates.residential.current.toFixed(2)}¢/kWh vs ${rates.usResidential.current.toFixed(2)}¢/kWh.`, 'story3')}>
                <div className="story-stat">{Math.abs(parseFloat(getVsUS(rates.residential.current, rates.usResidential.current).pct))}%</div>
                <div className="story-text">{rates.stateName} rates {getVsUS(rates.residential.current, rates.usResidential.current).isLower ? 'below' : 'above'} national average</div>
                <div className="story-detail">{rates.residential.current.toFixed(2)}¢ vs {rates.usResidential.current.toFixed(2)}¢/kWh nationally</div>
                <span className="copy-hint">{copied === 'story3' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
              
              <div className="story-card" onClick={() => copyToClipboard(`${(rates.residential.customers / 1000000).toFixed(1)} million ${rates.stateName} households are served by electricity providers in the ${currentStateConfig.gridName} market.`, 'story4')}>
                <div className="story-stat">{(rates.residential.customers / 1000000).toFixed(1)}M</div>
                <div className="story-text">{rates.stateName} households served</div>
                <div className="story-detail">{currentStateConfig.gridName} market</div>
                <span className="copy-hint">{copied === 'story4' ? '✓ Copied!' : 'Click to copy'}</span>
              </div>
            </div>
          </section>

          {/* Article Generator (Texas Only) */}
          {currentStateConfig.hasArticleGen && (
            <section className="article-panel">
              <div className="article-header">
                <h2>📝 Generate Article</h2>
                <div className="article-controls">
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
              </div>
              
              {articleEnabled && (
                <div className="article-content">
                  <p className="article-desc">
                    Generate a complete "{rates.stateName} Electricity Rates" article using the current EIA data. 
                    Written in ComparePower voice with SEO optimization and schema markup.
                  </p>
                  
                  <div className="competitor-option">
                    <label className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={competitorAnalysis}
                        onChange={(e) => setCompetitorAnalysis(e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-label">
                        <strong>🔍 Competitor Analysis</strong>
                        <span className="checkbox-desc">
                          Crawl top 10 Google results, analyze content structure & word counts, 
                          ensure article covers all competitor topics to rank competitively.
                        </span>
                      </span>
                    </label>
                  </div>

                  {analysisProgress && (
                    <div className="analysis-progress">
                      <span className="progress-spinner"></span>
                      {analysisProgress}
                    </div>
                  )}
                  
                  <button 
                    onClick={generateArticle} 
                    disabled={articleLoading || !rates}
                    className="btn-generate"
                  >
                    {articleLoading 
                      ? (competitorAnalysis ? '⏳ Analyzing competitors & generating...' : '⏳ Generating with Claude...') 
                      : (competitorAnalysis ? '🚀 Generate Competitive Article' : `✨ Generate ${rates.stateName} Electricity Rates Article`)}
                  </button>

                  {articleError && (
                    <div className="article-error">❌ {articleError}</div>
                  )}

                  {competitorData && (
                    <div className="competitor-summary">
                      <h4>📊 Competitor Insights</h4>
                      <div className="competitor-stats">
                        <div className="comp-stat">
                          <span className="comp-stat-value">{competitorData.results?.length || 0}</span>
                          <span className="comp-stat-label">Pages Analyzed</span>
                        </div>
                        <div className="comp-stat">
                          <span className="comp-stat-value">{competitorData.avgWordCount?.toLocaleString() || 'N/A'}</span>
                          <span className="comp-stat-label">Avg Words</span>
                        </div>
                        <div className="comp-stat">
                          <span className="comp-stat-value">{competitorData.minWordCount?.toLocaleString() || 'N/A'}</span>
                          <span className="comp-stat-label">Min Words</span>
                        </div>
                        <div className="comp-stat accent">
                          <span className="comp-stat-value">{competitorData.maxWordCount?.toLocaleString() || 'N/A'}</span>
                          <span className="comp-stat-label">Max Words</span>
                        </div>
                      </div>
                      {competitorData.commonTopics && competitorData.commonTopics.length > 0 && (
                        <div className="common-topics">
                          <span className="topics-label">Common Topics:</span>
                          <div className="topic-tags">
                            {competitorData.commonTopics.slice(0, 12).map((topic, i) => (
                              <span key={i} className="topic-tag">{topic}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {article && (
                    <>
                      <div className="article-preview">
                        <div className="preview-header">
                          <span>Article Preview</span>
                          <div className="preview-stats">
                            <span className="preview-length">{article.length.toLocaleString()} chars</span>
                            <span className="preview-words">~{Math.round(article.split(/\s+/).length).toLocaleString()} words</span>
                          </div>
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
          )}

          {/* Export */}
          <section className="export-panel">
            <h2>📦 Export {rates.stateName} Data</h2>
            <div className="export-buttons">
              <button onClick={() => copyToClipboard(JSON.stringify(rates, null, 2), 'json')} className="btn-export">
                {copied === 'json' ? '✓ Copied!' : '📋 Copy JSON'}
              </button>
              <button onClick={() => {
                const csv = `Metric,Value\nState,${rates.stateName}\nPeriod,${rates.period}\nResidential Rate,${rates.residential.current} ¢/kWh\nCommercial Rate,${rates.commercial.current} ¢/kWh\nIndustrial Rate,${rates.industrial.current} ¢/kWh\nUS Residential Rate,${rates.usResidential.current} ¢/kWh\nAvg Monthly Usage,${rates.residential.avgUsage} kWh\nAvg Monthly Bill,$${rates.residential.avgBill}\nCustomers,${rates.residential.customers}`
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${rates.stateId.toLowerCase()}_rates_${rates?.period || 'export'}.csv`
                a.click()
              }} className="btn-export">
                ⬇️ Download CSV
              </button>
            </div>
          </section>
        </>
      )}

      {!rates && !loading && (
        <div className="empty">
          <p>Click "Refresh {currentStateConfig.abbrev} Data" to load EIA rates</p>
        </div>
      )}

      <footer>
        <p>Data: <a href="https://www.eia.gov/" target="_blank" rel="noreferrer">U.S. Energy Information Administration</a> • Built for <a href="https://comparepower.com" target="_blank" rel="noreferrer">ComparePower.com</a></p>
      </footer>
    </div>
  )
}

export default App
