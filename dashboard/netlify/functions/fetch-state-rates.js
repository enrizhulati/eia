// Netlify serverless function to fetch EIA rates for any state
// Supports TX, OH, PA, MA with grid operator specific data

const API_KEY = process.env.EIA_API_KEY;
const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data';

// State configuration
const STATE_CONFIG = {
  TX: { name: 'Texas', gridOperator: 'ERCO', gridName: 'ERCOT', timezone: 'Central' },
  OH: { name: 'Ohio', gridOperator: 'PJM', gridName: 'PJM', timezone: 'Eastern' },
  PA: { name: 'Pennsylvania', gridOperator: 'PJM', gridName: 'PJM', timezone: 'Eastern' },
  MA: { name: 'Massachusetts', gridOperator: 'ISNE', gridName: 'ISO-NE', timezone: 'Eastern' }
};

async function fetchEIAData(stateId, sectorId, months = 6, dataFields = ['price']) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[stateid][]': stateId,
    'facets[sectorid][]': sectorId,
    frequency: 'monthly',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: months.toString()
  });
  
  dataFields.forEach(field => params.append('data[]', field));
  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

async function fetchAnnualData(stateId, sectorId) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[stateid][]': stateId,
    'facets[sectorid][]': sectorId,
    frequency: 'annual',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '2'
  });
  
  ['price', 'sales', 'customers', 'revenue'].forEach(field => params.append('data[]', field));
  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

// Grid operator daily demand data
async function fetchGridDemand(respondent, timezone = 'Central', days = 7) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[respondent][]': respondent,
    frequency: 'daily',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: (days * 5).toString()
  });
  if (timezone) params.append('facets[timezone][]', timezone);
  params.append('data[]', 'value');

  const response = await fetch(`https://api.eia.gov/v2/electricity/rto/daily-region-data/data?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

// Grid operator generation by fuel type
async function fetchGridGeneration(respondent, timezone = 'Central', days = 7) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[respondent][]': respondent,
    frequency: 'daily',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: (days * 10).toString()
  });
  if (timezone) params.append('facets[timezone][]', timezone);
  params.append('data[]', 'value');

  const response = await fetch(`https://api.eia.gov/v2/electricity/rto/daily-fuel-type-data/data?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

// State Rankings
async function fetchStateRankings() {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '51'
  });
  
  ['average-retail-price', 'average-retail-price-rank', 'total-retail-sales', 
   'total-retail-sales-rank', 'net-generation', 'net-generation-rank', 'prime-source'].forEach(field => {
    params.append('data[]', field);
  });

  const response = await fetch(`https://api.eia.gov/v2/electricity/state-electricity-profiles/summary/data?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

// 10-year historical rates
async function fetchHistoricalRates(stateId, sectorId) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[stateid][]': stateId,
    'facets[sectorid][]': sectorId,
    frequency: 'annual',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '10'
  });
  
  ['price', 'sales', 'customers', 'revenue'].forEach(field => params.append('data[]', field));
  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers }
      );
    }

    // Get state from query parameter
    const url = new URL(req.url);
    const stateId = (url.searchParams.get('state') || 'TX').toUpperCase();
    
    if (!STATE_CONFIG[stateId]) {
      return new Response(
        JSON.stringify({ error: `Unsupported state: ${stateId}. Supported: TX, OH, PA, MA` }),
        { status: 400, headers }
      );
    }

    const config = STATE_CONFIG[stateId];

    // Fetch monthly price data
    const [stateRes, stateCom, stateInd, usRes, usCom] = await Promise.all([
      fetchEIAData(stateId, 'RES', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData(stateId, 'COM', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData(stateId, 'IND', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData('US', 'RES', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData('US', 'COM', 6, ['price', 'sales', 'customers', 'revenue'])
    ]);

    // Fetch annual and historical data
    const [stateResAnnual, usResAnnual, historicalRes, stateRankings] = await Promise.all([
      fetchAnnualData(stateId, 'RES'),
      fetchAnnualData('US', 'RES'),
      fetchHistoricalRates(stateId, 'RES'),
      fetchStateRankings()
    ]);

    // Fetch grid operator data
    const [gridDemand, gridGeneration] = await Promise.all([
      fetchGridDemand(config.gridOperator, config.timezone, 7),
      fetchGridGeneration(config.gridOperator, config.timezone, 7)
    ]);

    // Helper functions
    const calcAvg = (row) => {
      const sales = parseFloat(row?.sales || 0) * 1000000;
      const customers = parseFloat(row?.customers || 0);
      const revenue = parseFloat(row?.revenue || 0) * 1000000;
      return {
        avgUsage: customers > 0 ? Math.round(sales / customers) : 0,
        avgBill: customers > 0 ? Math.round(revenue / customers) : 0,
        customers: Math.round(customers)
      };
    };

    const calcAnnualAvg = (row) => {
      const sales = parseFloat(row?.sales || 0) * 1000000;
      const customers = parseFloat(row?.customers || 0);
      const revenue = parseFloat(row?.revenue || 0) * 1000000;
      return {
        avgMonthlyUsage: customers > 0 ? Math.round((sales / customers) / 12) : 0,
        avgMonthlyBill: customers > 0 ? Math.round((revenue / customers) / 12) : 0,
        avgAnnualUsage: customers > 0 ? Math.round(sales / customers) : 0,
        avgAnnualBill: customers > 0 ? Math.round(revenue / customers) : 0,
        customers: Math.round(customers)
      };
    };

    // Process grid data
    function processGridData(demand, generation) {
      const demandByDate = {};
      demand.forEach(d => {
        if (!demandByDate[d.period]) demandByDate[d.period] = {};
        demandByDate[d.period][d.type] = {
          value: parseFloat(d.value),
          name: d['type-name']
        };
      });

      const genByDate = {};
      generation.forEach(g => {
        if (!genByDate[g.period]) genByDate[g.period] = {};
        genByDate[g.period][g.fueltype] = {
          value: parseFloat(g.value),
          name: g['type-name']
        };
      });

      const dates = Object.keys(demandByDate).sort().reverse();
      let latestDate = dates[0];
      for (const date of dates) {
        const dayDemand = demandByDate[date]?.D?.value || 0;
        if (dayDemand > 0) {
          latestDate = date;
          break;
        }
      }
      
      const latestDemand = demandByDate[latestDate] || {};
      const latestGen = genByDate[latestDate] || {};

      const fuelTypes = ['NG', 'WND', 'COL', 'SUN', 'NUC', 'BAT', 'OTH', 'OIL'];
      const fuelNames = {
        NG: 'Natural Gas', WND: 'Wind', COL: 'Coal', 
        SUN: 'Solar', NUC: 'Nuclear', BAT: 'Battery', OTH: 'Other', OIL: 'Oil'
      };
      
      let totalGen = 0;
      const fuelMix = {};
      fuelTypes.forEach(fuel => {
        const val = latestGen[fuel]?.value || 0;
        if (val > 0) totalGen += val;
        fuelMix[fuel] = { value: val, name: fuelNames[fuel] || fuel };
      });

      Object.keys(fuelMix).forEach(fuel => {
        fuelMix[fuel].percent = totalGen > 0 
          ? ((fuelMix[fuel].value / totalGen) * 100).toFixed(1) 
          : 0;
      });

      const dailyTrend = dates.slice(0, 7).map(date => {
        const dayDemand = demandByDate[date]?.D?.value || 0;
        const dayForecast = demandByDate[date]?.DF?.value || 0;
        const dayGen = genByDate[date] || {};
        
        return {
          date,
          demand: Math.round(dayDemand),
          forecast: Math.round(dayForecast),
          wind: dayGen.WND?.value || 0,
          solar: dayGen.SUN?.value || 0,
          gas: dayGen.NG?.value || 0,
          nuclear: dayGen.NUC?.value || 0
        };
      }).reverse();

      return {
        name: config.gridName,
        operator: config.gridOperator,
        latestDate,
        demand: Math.round(latestDemand.D?.value || 0),
        forecast: Math.round(latestDemand.DF?.value || 0),
        fuelMix,
        totalGeneration: Math.round(totalGen),
        renewablePercent: totalGen > 0 
          ? (((fuelMix.WND?.value || 0) + (fuelMix.SUN?.value || 0)) / totalGen * 100).toFixed(1)
          : 0,
        dailyTrend
      };
    }

    // Process state rankings
    function processStateRankings(data, targetStateId) {
      const latestYear = data[0]?.period;
      const latestData = data.filter(d => d.period === latestYear);
      
      const targetState = latestData.find(d => d.stateID === targetStateId);
      
      const byPrice = [...latestData].sort((a, b) => 
        parseFloat(a['average-retail-price']) - parseFloat(b['average-retail-price'])
      );
      
      const cheapest5 = byPrice.slice(0, 5).map(s => ({
        state: s.stateDescription,
        stateID: s.stateID,
        price: parseFloat(s['average-retail-price']).toFixed(2),
        rank: s['average-retail-price-rank']
      }));
      
      const mostExpensive5 = byPrice.slice(-5).reverse().map(s => ({
        state: s.stateDescription,
        stateID: s.stateID,
        price: parseFloat(s['average-retail-price']).toFixed(2),
        rank: s['average-retail-price-rank']
      }));

      return {
        year: latestYear,
        targetState: targetState ? {
          priceRank: targetState['average-retail-price-rank'],
          price: parseFloat(targetState['average-retail-price']).toFixed(2),
          salesRank: targetState['total-retail-sales-rank'],
          generationRank: targetState['net-generation-rank'],
          primeSource: targetState['prime-source']
        } : null,
        cheapest5,
        mostExpensive5,
        totalStates: latestData.length
      };
    }

    const result = {
      stateId,
      stateName: config.name,
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
        state: stateResAnnual[0] ? {
          year: stateResAnnual[0].period,
          ...calcAnnualAvg(stateResAnnual[0])
        } : null,
        us: usResAnnual[0] ? {
          year: usResAnnual[0].period,
          ...calcAnnualAvg(usResAnnual[0])
        } : null
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
        sales: Math.round((parseFloat(d.sales) || 0) * 1000000),
        avgMonthlyUsage: Math.round((parseFloat(d.sales) || 0) * 1000000 / (parseFloat(d.customers) || 1) / 12),
        avgMonthlyBill: Math.round((parseFloat(d.revenue) || 0) * 1000000 / (parseFloat(d.customers) || 1) / 12)
      })),

      grid: processGridData(gridDemand, gridGeneration),
      rankings: processStateRankings(stateRankings, stateId),

      fetchedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/state-rates"
};

