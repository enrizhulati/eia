// Netlify serverless function to generate Texas Electricity Rates article
// Uses Anthropic Claude API with ComparePower voice + SRO optimization

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a content writer for ComparePower, Texas' top-rated electricity marketplace. Write in the "ComparePower Voice" - a protective friend who tells the truth.

## VOICE GUIDELINES
- Casual, not corporate
- Attack the system/providers, NEVER the customer
- Use specific numbers, never vague claims
- Front-load key information (rate anchor in first paragraph)
- End with: "Back to your day, confident you aren't overpaying"

## ARTICLE STRUCTURE
Write a complete Markdown article with:

1. **Frontmatter**: title (with month/year and rate), description
2. **H1**: "Texas Electricity Rates - [Month] [Year]"
3. **Opening**: Rate anchor FIRST ("Texas rates range from X¢ to Y¢/kWh...")
4. **Key Takeaways**: 5 bullet points with specific numbers
5. **Current Rates Section**: EIA data, TX vs US comparison, what's driving prices
6. **What This Means for Your Bill**: Average usage/bill, seasonal context
7. **Shopping Strategy**: Advice for current month/season
8. **FAQs**: 6 questions with direct answers
9. **Bottom Line**: ComparePower CTA, end with tagline
10. **Footnote**: EIA data period disclaimer
11. **JSON-LD Schema**: Article, FAQPage, BreadcrumbList schemas

## KEY PHRASES TO USE
- "tricky ads, teaser rates, and confusing terms"
- "We've already done the homework"
- "It's not your fault—the system is designed to be confusing"
- "Back to your day, confident you aren't overpaying"`;

function getSeasonContext(monthNum) {
  const num = parseInt(monthNum);
  if (num >= 3 && num <= 5) return { season: 'Spring', advice: 'excellent time to shop' };
  if (num >= 6 && num <= 8) return { season: 'Summer', advice: 'peak demand—rates higher' };
  if (num >= 9 && num <= 11) return { season: 'Fall', advice: 'cheapest time to lock in rates' };
  return { season: 'Winter', advice: 'moderate—watch for cold snaps' };
}

function formatMonth(period) {
  if (!period) return { monthName: 'Current Month', year: new Date().getFullYear(), monthNum: (new Date().getMonth() + 1).toString() };
  const [year, month] = period.split('-');
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return { monthName: months[parseInt(month)] || 'Current Month', year, monthNum: month };
}

function getCurrentMonthInfo() {
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return { monthName: months[now.getMonth()], year: now.getFullYear().toString(), monthNum: (now.getMonth() + 1).toString() };
}

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500, headers });
    }

    const rateData = await req.json();
    const eiaData = formatMonth(rateData.period);
    const currentMonth = getCurrentMonthInfo();
    const seasonInfo = getSeasonContext(currentMonth.monthNum);

    const userPrompt = `Generate a Texas Electricity Rates article for ${currentMonth.monthName} ${currentMonth.year}.

## EIA DATA (use these exact numbers)
- Texas Residential: ${rateData.txRes?.current?.toFixed(2) || 'N/A'}¢/kWh
- Texas Commercial: ${rateData.txCom?.current?.toFixed(2) || 'N/A'}¢/kWh  
- U.S. Residential: ${rateData.usRes?.current?.toFixed(2) || 'N/A'}¢/kWh
- TX vs US: ${((rateData.txRes?.current - rateData.usRes?.current) / rateData.usRes?.current * 100).toFixed(1)}% ${rateData.txRes?.current < rateData.usRes?.current ? 'lower' : 'higher'}
- Avg Monthly Usage: ${rateData.txRes?.avgUsage?.toLocaleString() || 'N/A'} kWh
- Avg Monthly Bill: $${rateData.txRes?.avgBill?.toLocaleString() || 'N/A'}

## ERCOT DATA
${rateData.ercot ? `- Renewable Mix: ${rateData.ercot.renewablePercent}% (wind + solar)
- Daily Demand: ${rateData.ercot.demand?.toLocaleString()} MWh` : '- Not available'}

## STATE RANKINGS
${rateData.rankings ? `- TX Price Rank: #${rateData.rankings.texas?.priceRank} of ${rateData.rankings.totalStates} states
- Cheapest: ${rateData.rankings.cheapest5?.slice(0,3).map(s => s.state).join(', ')}
- Most Expensive: ${rateData.rankings.mostExpensive5?.slice(0,3).map(s => s.state).join(', ')}` : '- Not available'}

## CONTEXT
- Season: ${seasonInfo.season} (${seasonInfo.advice})
- EIA Data Month: ${eiaData.monthName} ${eiaData.year}
- Current Date: ${new Date().toISOString().split('T')[0]}

Title the article for ${currentMonth.monthName} ${currentMonth.year}. Include footnote: "*Rate data from EIA, ${eiaData.monthName} ${eiaData.year}. EIA publishes with 2-3 month lag.*"`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const article = data.content[0]?.text || '';

    return new Response(JSON.stringify({ article, period: rateData.period, generatedAt: new Date().toISOString() }), { status: 200, headers });

  } catch (error) {
    console.error('Article generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/generate-article"
};
