// Netlify serverless function to fetch EIA rates + ERCOT grid data + state rankings
// API key is stored as environment variable, never exposed to client

const API_KEY = process.env.EIA_API_KEY;
const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data';

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
  
  // Add each data field
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

// ERCOT Daily Demand Data
async function fetchERCOTDemand(days = 7) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[respondent][]': 'ERCO',
    'facets[timezone][]': 'Central',
    frequency: 'daily',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: (days * 5).toString() // Multiple types per day
  });
  params.append('data[]', 'value');

  const response = await fetch(`https://api.eia.gov/v2/electricity/rto/daily-region-data/data?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

// ERCOT Generation by Fuel Type
async function fetchERCOTGeneration(days = 7) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'facets[respondent][]': 'ERCO',
    'facets[timezone][]': 'Central',
    frequency: 'daily',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: (days * 10).toString() // Multiple fuel types per day
  });
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
    length: '51' // All states for latest year
  });
  
  ['average-retail-price', 'average-retail-price-rank', 'total-retail-sales', 
   'total-retail-sales-rank', 'net-generation', 'net-generation-rank', 'prime-source'].forEach(field => {
    params.append('data[]', field);
  });

  const response = await fetch(`https://api.eia.gov/v2/electricity/state-electricity-profiles/summary/data?${params}`);
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

    // Fetch monthly price data (6 months for trends)
    const [txRes, txCom, usRes, usCom] = await Promise.all([
      fetchEIAData('TX', 'RES', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData('TX', 'COM', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData('US', 'RES', 6, ['price', 'sales', 'customers', 'revenue']),
      fetchEIAData('US', 'COM', 6, ['price', 'sales', 'customers', 'revenue'])
    ]);

    // Fetch annual data for yearly averages
    const [txResAnnual, usResAnnual] = await Promise.all([
      fetchAnnualData('TX', 'RES'),
      fetchAnnualData('US', 'RES')
    ]);

    // Fetch ERCOT grid data and state rankings (in parallel)
    const [ercotDemand, ercotGeneration, stateRankings] = await Promise.all([
      fetchERCOTDemand(7),
      fetchERCOTGeneration(7),
      fetchStateRankings()
    ]);

    // Calculate average usage and bill from latest month
    const calcAvg = (row) => {
      const sales = parseFloat(row?.sales || 0) * 1000000; // Convert to kWh
      const customers = parseFloat(row?.customers || 0);
      const revenue = parseFloat(row?.revenue || 0) * 1000000; // Convert to dollars
      return {
        avgUsage: customers > 0 ? Math.round(sales / customers) : 0,
        avgBill: customers > 0 ? Math.round(revenue / customers) : 0,
        customers: Math.round(customers)
      };
    };

    // Calculate annual averages
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

    const result = {
      period: txRes[0]?.period,
      prevPeriod: txRes[1]?.period,
      
      // Price data with history
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

      // Annual averages
      annual: {
        txRes: txResAnnual[0] ? {
          year: txResAnnual[0].period,
          ...calcAnnualAvg(txResAnnual[0])
        } : null,
        usRes: usResAnnual[0] ? {
          year: usResAnnual[0].period,
          ...calcAnnualAvg(usResAnnual[0])
        } : null
      },

      // Monthly usage trend (for seasonality)
      usageTrend: txRes.map(d => ({
        period: d.period,
        usage: calcAvg(d).avgUsage,
        bill: calcAvg(d).avgBill
      })).reverse(),

      // ERCOT Grid Data
      ercot: processERCOTData(ercotDemand, ercotGeneration),

      // State Rankings
      rankings: processStateRankings(stateRankings),

      fetchedAt: new Date().toISOString()
    };

    // Process ERCOT demand and generation data
    function processERCOTData(demand, generation) {
      // Group demand by date and type
      const demandByDate = {};
      demand.forEach(d => {
        if (!demandByDate[d.period]) demandByDate[d.period] = {};
        demandByDate[d.period][d.type] = {
          value: parseFloat(d.value),
          name: d['type-name']
        };
      });

      // Group generation by date and fuel type
      const genByDate = {};
      generation.forEach(g => {
        if (!genByDate[g.period]) genByDate[g.period] = {};
        genByDate[g.period][g.fueltype] = {
          value: parseFloat(g.value),
          name: g['type-name']
        };
      });

      // Get latest day with ACTUAL data (not zeros)
      const dates = Object.keys(demandByDate).sort().reverse();
      
      // Find first date with non-zero demand data
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

      // Calculate fuel mix percentages
      const fuelTypes = ['NG', 'WND', 'COL', 'SUN', 'NUC', 'BAT', 'OTH'];
      const fuelNames = {
        NG: 'Natural Gas', WND: 'Wind', COL: 'Coal', 
        SUN: 'Solar', NUC: 'Nuclear', BAT: 'Battery', OTH: 'Other'
      };
      
      let totalGen = 0;
      const fuelMix = {};
      fuelTypes.forEach(fuel => {
        const val = latestGen[fuel]?.value || 0;
        if (val > 0) totalGen += val;
        fuelMix[fuel] = { value: val, name: fuelNames[fuel] || fuel };
      });

      // Add percentages
      Object.keys(fuelMix).forEach(fuel => {
        fuelMix[fuel].percent = totalGen > 0 
          ? ((fuelMix[fuel].value / totalGen) * 100).toFixed(1) 
          : 0;
      });

      // Build daily trend (last 7 days)
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
          gas: dayGen.NG?.value || 0
        };
      }).reverse();

      return {
        latestDate,
        demand: Math.round(latestDemand.D?.value || 0),
        forecast: Math.round(latestDemand.DF?.value || 0),
        generation: Math.round(latestDemand.NG?.value || 0),
        fuelMix,
        totalGeneration: Math.round(totalGen),
        renewablePercent: totalGen > 0 
          ? (((fuelMix.WND?.value || 0) + (fuelMix.SUN?.value || 0)) / totalGen * 100).toFixed(1)
          : 0,
        dailyTrend
      };
    }

    // Process state rankings
    function processStateRankings(data) {
      // Get latest year's data
      const latestYear = data[0]?.period;
      const latestData = data.filter(d => d.period === latestYear);
      
      // Find Texas
      const texas = latestData.find(d => d.stateID === 'TX');
      
      // Get top 5 cheapest and most expensive
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
        texas: texas ? {
          priceRank: texas['average-retail-price-rank'],
          price: parseFloat(texas['average-retail-price']).toFixed(2),
          salesRank: texas['total-retail-sales-rank'],
          generationRank: texas['net-generation-rank'],
          primeSource: texas['prime-source']
        } : null,
        cheapest5,
        mostExpensive5,
        totalStates: latestData.length
      };
    }

    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/rates"
};
