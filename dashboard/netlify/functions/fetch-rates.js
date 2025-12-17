// Netlify serverless function to fetch EIA rates
// API key is stored as environment variable, never exposed to client

const API_KEY = process.env.EIA_API_KEY;
const BASE_URL = 'https://api.eia.gov/v2/electricity/retail-sales/data';

async function fetchEIAData(stateId, sectorId, months = 6) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'data[]': 'price',
    'facets[stateid][]': stateId,
    'facets[sectorid][]': sectorId,
    frequency: 'monthly',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: months.toString()
  });

  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  return data.response?.data || [];
}

export default async (req, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
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

    // Fetch all rate data in parallel
    const [txRes, txCom, usRes, usCom] = await Promise.all([
      fetchEIAData('TX', 'RES', 6),
      fetchEIAData('TX', 'COM', 6),
      fetchEIAData('US', 'RES', 6),
      fetchEIAData('US', 'COM', 6)
    ]);

    const result = {
      period: txRes[0]?.period,
      prevPeriod: txRes[1]?.period,
      txRes: {
        current: parseFloat(txRes[0]?.price) || 0,
        prev: parseFloat(txRes[1]?.price) || 0,
        history: txRes.map(d => parseFloat(d.price)).reverse()
      },
      txCom: {
        current: parseFloat(txCom[0]?.price) || 0,
        prev: parseFloat(txCom[1]?.price) || 0,
        history: txCom.map(d => parseFloat(d.price)).reverse()
      },
      usRes: {
        current: parseFloat(usRes[0]?.price) || 0,
        prev: parseFloat(usRes[1]?.price) || 0,
        history: usRes.map(d => parseFloat(d.price)).reverse()
      },
      usCom: {
        current: parseFloat(usCom[0]?.price) || 0,
        prev: parseFloat(usCom[1]?.price) || 0,
        history: usCom.map(d => parseFloat(d.price)).reverse()
      },
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

