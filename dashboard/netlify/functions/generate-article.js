// Netlify serverless function to generate Texas Electricity Rates article
// Uses Anthropic Claude API with ComparePower voice + SRO optimization

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior SEO content strategist and writer for ComparePower, Texas' top-rated electricity marketplace. Your goal is to write THE definitive, most comprehensive article on Texas electricity rates that will outrank all competitors.

## VOICE GUIDELINES (ComparePower Voice)
- Casual, not corporate - like a protective friend who tells the truth
- Attack the system/providers, NEVER the customer
- Use specific numbers, never vague claims (EIA data, percentages, dollar amounts)
- Front-load key information (rate anchor in first paragraph)
- Be authoritative but accessible
- End with: "Back to your day, confident you aren't overpaying"

## KEY PHRASES TO WEAVE NATURALLY
- "tricky ads, teaser rates, and confusing terms"
- "We've already done the homework"
- "It's not your fault—the system is designed to be confusing"
- "power to choose" (reference the concept, not just the website)

## COMPREHENSIVE ARTICLE REQUIREMENTS
Your article MUST cover ALL of the following sections with substantial depth:

### MANDATORY SECTIONS (in order):
1. **Frontmatter**: YAML with title (include month/year and rate), description (150-160 chars), keywords
2. **H1**: "Texas Electricity Rates - [Month] [Year]" 
3. **Opening Hook** (200+ words): Rate anchor FIRST ("Texas rates average X¢/kWh..."), context, why this matters now
4. **Key Takeaways**: 5-7 bullet points with specific numbers and actionable insights
5. **Current Rates Overview** (400+ words): EIA data breakdown, TX vs US comparison, residential vs commercial, what's driving prices
6. **Rates by City** (300+ words): Table with Houston, Dallas, Austin, San Antonio, Fort Worth rates at 500/1000/2000 kWh
7. **Understanding Your Electric Bill** (350+ words): TDU charges, delivery fees, energy charge breakdown, taxes
8. **Types of Electricity Plans** (400+ words): Fixed-rate, variable, indexed, time-of-use, prepaid, free nights/weekends - pros/cons of each
9. **How to Compare Plans** (350+ words): EFL breakdown, true cost calculation, hidden fees to watch
10. **Seasonal Rate Trends** (300+ words): Historical patterns, best months to shop, summer vs winter
11. **Texas Deregulation Explained** (300+ words): ERCOT, REPs, how the market works, which areas are deregulated
12. **Money-Saving Tips** (300+ words): Practical strategies for Texas households
13. **FAQs** (500+ words): At least 10 comprehensive Q&As covering common searches
14. **Bottom Line** (150+ words): ComparePower CTA, Live Link mention, end with tagline
15. **Footnotes/Methodology**: EIA data period disclaimer, data sources
16. **JSON-LD Schema**: Article, FAQPage, BreadcrumbList schemas (complete and valid)

## CONTENT DEPTH REQUIREMENTS
- Include actual data tables (markdown format) where relevant
- Use bullet points and numbered lists for scannability  
- Include internal anchor links to sections
- Every claim should have a specific number or data point
- Address search intent: informational, commercial, and transactional
- Write for featured snippet potential (direct answers, lists, tables)

## SEO OPTIMIZATION
- Target keyword: "texas electricity rates" - use naturally 8-12 times
- Secondary keywords: "texas electric rates", "electricity prices texas", "average electric bill texas", "compare texas electricity"
- Use semantic variations throughout
- H2s should contain keywords where natural
- Include location-based terms (Houston, Dallas, etc.)

## QUALITY STANDARDS
- Minimum 3,000 words (aim for 3,500-4,000 to exceed competitors)
- Every section should provide genuine value, not filler
- Be more thorough than any competitor article
- Include unique insights that competitors miss (ERCOT grid data, seasonal patterns, deregulation nuances)`;

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
    const competitorData = rateData.competitorAnalysis;

    // Build competitor analysis section if available
    let competitorSection = '';
    if (competitorData && competitorData.results) {
      const insights = competitorData.synthesizedInsights;
      competitorSection = `

## COMPETITOR ANALYSIS (CRITICAL - YOU MUST COVER ALL THESE TOPICS)
We analyzed the top ${competitorData.results.length} ranking pages for "texas electricity rates":

### Word Count Benchmarks
- Average competitor word count: ${competitorData.avgWordCount || 'N/A'} words
- Minimum competitor: ${competitorData.minWordCount || 'N/A'} words  
- Maximum competitor: ${competitorData.maxWordCount || 'N/A'} words
- **YOUR TARGET: ${competitorData.recommendedWordCount || 3500}+ words** (must exceed competitors)

### Topics ALL Competitors Cover (YOU MUST INCLUDE):
${competitorData.commonTopics?.map(t => `- ${t}`).join('\n') || '- Standard electricity rate topics'}

### Competitor Headings to Match or Beat:
${competitorData.allHeadings?.slice(0, 20).map(h => `- H${h.level}: ${h.text}`).join('\n') || '- Standard section headings'}

${insights ? `### AI-Synthesized Competitive Strategy:
- Required Topics: ${insights.requiredTopics?.join(', ') || 'Cover all standard topics'}
- Suggested H2 Sections: ${insights.suggestedH2Sections?.join(', ') || 'Use comprehensive sections'}
- Content Gaps to Exploit: ${insights.contentGaps?.join(', ') || 'Add unique ComparePower insights'}
- Competitive Advantage: ${insights.competitiveAdvantage || 'Be more comprehensive and data-driven'}
` : ''}

**IMPORTANT**: Your article MUST:
1. Cover EVERY topic that competitors cover (with our EIA data)
2. Exceed the maximum competitor word count (${competitorData.maxWordCount || 3000}+ words)
3. Include sections competitors miss (ERCOT data, seasonal trends, bill breakdown)
4. Have MORE comprehensive FAQs than any competitor
5. Include actual rate tables by city
`;
    }

    const userPrompt = `Generate the ULTIMATE Texas Electricity Rates article for ${currentMonth.monthName} ${currentMonth.year}.

## EIA DATA (use these exact numbers - they are authoritative)
- Texas Residential: ${rateData.txRes?.current?.toFixed(2) || 'N/A'}¢/kWh
- Texas Commercial: ${rateData.txCom?.current?.toFixed(2) || 'N/A'}¢/kWh  
- U.S. Residential: ${rateData.usRes?.current?.toFixed(2) || 'N/A'}¢/kWh
- U.S. Commercial: ${rateData.usCom?.current?.toFixed(2) || 'N/A'}¢/kWh
- TX vs US Residential: ${((rateData.txRes?.current - rateData.usRes?.current) / rateData.usRes?.current * 100).toFixed(1)}% ${rateData.txRes?.current < rateData.usRes?.current ? 'lower' : 'higher'}
- TX vs US Commercial: ${((rateData.txCom?.current - rateData.usCom?.current) / rateData.usCom?.current * 100).toFixed(1)}% ${rateData.txCom?.current < rateData.usCom?.current ? 'lower' : 'higher'}
- Previous Month TX Residential: ${rateData.txRes?.prev?.toFixed(2) || 'N/A'}¢/kWh
- Month-over-Month Change: ${((rateData.txRes?.current - rateData.txRes?.prev) / rateData.txRes?.prev * 100).toFixed(1)}%
- Avg Monthly Usage: ${rateData.txRes?.avgUsage?.toLocaleString() || 'N/A'} kWh
- Avg Monthly Bill: $${rateData.txRes?.avgBill?.toLocaleString() || 'N/A'}
- TX Residential Customers: ${rateData.txRes?.customers?.toLocaleString() || 'N/A'}

## USAGE TREND DATA (last 6 months)
${rateData.usageTrend?.map(m => `- ${m.period}: ${m.usage} kWh, $${m.bill}`).join('\n') || '- Trend data not available'}

## ERCOT GRID DATA
${rateData.ercot ? `- Renewable Mix: ${rateData.ercot.renewablePercent}% (wind + solar)
- Daily Demand: ${rateData.ercot.demand?.toLocaleString()} MWh
- Total Generation: ${rateData.ercot.totalGeneration?.toLocaleString()} MWh
- Fuel Mix: ${rateData.ercot.fuelMix ? Object.entries(rateData.ercot.fuelMix).map(([k,v]) => `${v.name}: ${v.percent}%`).join(', ') : 'N/A'}` : '- ERCOT data not available (use historical averages: ~30% renewable)'}

## STATE RANKINGS
${rateData.rankings ? `- TX Price Rank: #${rateData.rankings.texas?.priceRank} of ${rateData.rankings.totalStates} states
- Cheapest States: ${rateData.rankings.cheapest5?.slice(0,5).map(s => `${s.state} (${s.price}¢)`).join(', ')}
- Most Expensive: ${rateData.rankings.mostExpensive5?.slice(0,5).map(s => `${s.state} (${s.price}¢)`).join(', ')}
- TX Prime Source: ${rateData.rankings.texas?.primeSource || 'Natural Gas'}` : '- Rankings not available'}

## SEASONAL CONTEXT
- Current Season: ${seasonInfo.season} (${seasonInfo.advice})
- EIA Data Month: ${eiaData.monthName} ${eiaData.year}
- Article Publication Date: ${new Date().toISOString().split('T')[0]}
${competitorSection}

## ARTICLE REQUIREMENTS
1. Title for ${currentMonth.monthName} ${currentMonth.year}
2. Include footnote: "*Rate data from U.S. Energy Information Administration (EIA), ${eiaData.monthName} ${eiaData.year}. EIA publishes with 2-3 month lag.*"
3. ${competitorData ? `MINIMUM ${competitorData.recommendedWordCount || 3500} words - this is non-negotiable` : 'Target 3,000+ words for comprehensive coverage'}
4. Include complete JSON-LD schema at the end
5. Make this THE definitive resource for anyone searching "texas electricity rates"

Write the complete article now. Be thorough, authoritative, and genuinely helpful.`;

    // Use Sonnet for competitor analysis (more thorough), Haiku for standard
    const useAdvancedModel = !!competitorData;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: useAdvancedModel ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307',
        max_tokens: useAdvancedModel ? 8192 : 4096,
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
