// Netlify serverless function to fetch EIA rates
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
  path: "/api/rates"
};
