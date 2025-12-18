// Netlify serverless function to analyze SERP competitors for "texas electricity rates"
// Crawls top 10 results, extracts headings, word counts, and content structure

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY; // Free tier: 2500 queries/month at serper.dev

// Fetch search results from Serper.dev (Google SERP API)
async function fetchSerpResults(query) {
  if (!SERPER_API_KEY) {
    // Fallback: use a curated list of known competitors
    return getFallbackCompetitors();
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: 10
      })
    });

    if (!response.ok) {
      console.error('Serper API error:', response.status);
      return getFallbackCompetitors();
    }

    const data = await response.json();
    return data.organic?.slice(0, 10).map(r => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet
    })) || getFallbackCompetitors();
  } catch (err) {
    console.error('SERP fetch error:', err);
    return getFallbackCompetitors();
  }
}

// Fallback competitors if no SERP API key
function getFallbackCompetitors() {
  return [
    { title: 'Texas Electricity Rates', url: 'https://www.energybot.com/texas-electricity-rates.html', snippet: 'Compare Texas electricity rates' },
    { title: 'Texas Electricity Rates | Choose Energy', url: 'https://www.chooseenergy.com/electricity-rates/texas/', snippet: 'Texas electricity rates comparison' },
    { title: 'Texas Electricity Rates - SaveOnEnergy', url: 'https://www.saveonenergy.com/electricity-rates/texas/', snippet: 'Find the best Texas electricity rates' },
    { title: 'Texas Electric Rates | ElectricityPlans', url: 'https://electricityplans.com/texas/', snippet: 'Compare Texas electric rates' },
    { title: 'Texas Electricity Rates - Power to Choose', url: 'https://www.powertochoose.org/', snippet: 'Official Texas electricity marketplace' },
    { title: 'Texas Electric Rates | EnergyRates', url: 'https://www.energyrates.com/texas-electricity/', snippet: 'Texas electricity rate comparison' },
  ];
}

// Fetch and parse a webpage
async function fetchAndParsePage(url, timeout = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    return parseHtmlContent(html);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

// Extract content from HTML
function parseHtmlContent(html) {
  // Remove script, style, nav, footer, header tags
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract headings
  const headings = [];
  const h1Match = cleaned.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2Match = cleaned.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h3Match = cleaned.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

  h1Match.forEach(h => {
    const text = h.replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: 1, text });
  });
  h2Match.forEach(h => {
    const text = h.replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: 2, text });
  });
  h3Match.forEach(h => {
    const text = h.replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: 3, text });
  });

  // Extract main content text
  const textContent = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Count words
  const words = textContent.split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;

  // Extract key topics from headings and content
  const topics = extractTopics(headings, textContent);

  return {
    headings: headings.slice(0, 20), // Limit to top 20 headings
    wordCount,
    topics,
    contentPreview: textContent.slice(0, 500)
  };
}

// Extract key topics from content
function extractTopics(headings, content) {
  const topicKeywords = [
    'average rate', 'electricity rate', 'kwh', 'kilowatt', 'monthly bill',
    'residential', 'commercial', 'business', 'fixed rate', 'variable rate',
    'deregulated', 'ercot', 'power to choose', 'energy plan', 'electricity plan',
    'tdu', 'tdsp', 'delivery charges', 'usage', 'consumption',
    'renewable', 'green energy', 'solar', 'wind', 'natural gas',
    'winter', 'summer', 'seasonal', 'peak', 'off-peak',
    'compare', 'best rates', 'cheapest', 'lowest', 'save money',
    'how to choose', 'tips', 'faq', 'questions',
    'houston', 'dallas', 'austin', 'san antonio', 'fort worth',
    'oncor', 'centerpoint', 'aep', 'texas-new mexico',
    'credit check', 'no deposit', 'prepaid', 'contract',
    'eia', 'energy information', 'average bill', 'price history',
    'rate trends', 'forecast', 'market', 'wholesale'
  ];

  const foundTopics = new Set();
  const lowerContent = content.toLowerCase();
  const lowerHeadings = headings.map(h => h.text.toLowerCase()).join(' ');

  topicKeywords.forEach(topic => {
    if (lowerContent.includes(topic) || lowerHeadings.includes(topic)) {
      foundTopics.add(topic);
    }
  });

  // Also add heading texts as topics
  headings.forEach(h => {
    const cleanHeading = h.text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    if (cleanHeading.length > 3 && cleanHeading.length < 50) {
      foundTopics.add(cleanHeading);
    }
  });

  return Array.from(foundTopics).slice(0, 30);
}

// Use Claude to synthesize competitor insights
async function synthesizeInsights(competitorData) {
  if (!ANTHROPIC_API_KEY) return null;

  const prompt = `Analyze these competitor pages for "texas electricity rates" and provide a strategic content outline.

## COMPETITOR DATA
${competitorData.map((c, i) => `
### Competitor ${i + 1}: ${c.title}
- URL: ${c.url}
- Word Count: ${c.wordCount || 'Unknown'}
- Headings: ${c.headings?.map(h => `H${h.level}: ${h.text}`).join(', ') || 'None extracted'}
- Topics: ${c.topics?.join(', ') || 'None'}
`).join('\n')}

Based on this competitor analysis, provide:
1. A list of ALL topics that must be covered to be competitive
2. Recommended minimum word count (should exceed average competitor word count)
3. Suggested H2 sections that cover competitor topics while being unique
4. Content gaps that competitors miss that we could fill

Format as JSON:
{
  "requiredTopics": ["topic1", "topic2", ...],
  "minimumWordCount": number,
  "suggestedH2Sections": ["section1", "section2", ...],
  "contentGaps": ["gap1", "gap2", ...],
  "competitiveAdvantage": "brief strategy note"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.content[0]?.text || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error('Claude synthesis error:', err);
    return null;
  }
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
    const body = await req.json();
    const query = body.query || 'texas electricity rates';

    // Step 1: Get SERP results
    const serpResults = await fetchSerpResults(query);
    
    // Step 2: Crawl and parse each result (in parallel with limits)
    const parsePromises = serpResults.map(async (result) => {
      const parsed = await fetchAndParsePage(result.url);
      return {
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        ...parsed
      };
    });

    const parsedResults = await Promise.all(parsePromises);
    const validResults = parsedResults.filter(r => r.wordCount && r.wordCount > 100);

    // Step 3: Calculate statistics
    const wordCounts = validResults.map(r => r.wordCount).filter(Boolean);
    const avgWordCount = wordCounts.length > 0 
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) 
      : 2000;
    const minWordCount = Math.min(...wordCounts) || 1000;
    const maxWordCount = Math.max(...wordCounts) || 3000;

    // Step 4: Aggregate all topics
    const allTopics = new Map();
    validResults.forEach(r => {
      r.topics?.forEach(topic => {
        allTopics.set(topic, (allTopics.get(topic) || 0) + 1);
      });
    });

    // Sort topics by frequency
    const commonTopics = Array.from(allTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([topic]) => topic);

    // Step 5: Aggregate all headings
    const allHeadings = [];
    validResults.forEach(r => {
      r.headings?.forEach(h => {
        if (!allHeadings.some(ah => ah.text.toLowerCase() === h.text.toLowerCase())) {
          allHeadings.push(h);
        }
      });
    });

    // Step 6: Use Claude to synthesize insights (optional enhancement)
    const synthesizedInsights = await synthesizeInsights(validResults);

    return new Response(JSON.stringify({
      query,
      results: validResults.map(r => ({
        title: r.title,
        url: r.url,
        wordCount: r.wordCount,
        headingCount: r.headings?.length || 0,
        topicCount: r.topics?.length || 0
      })),
      avgWordCount,
      minWordCount,
      maxWordCount,
      recommendedWordCount: Math.max(avgWordCount + 500, maxWordCount), // Exceed competitors
      commonTopics,
      allHeadings: allHeadings.slice(0, 40),
      synthesizedInsights,
      analyzedAt: new Date().toISOString()
    }), { status: 200, headers });

  } catch (error) {
    console.error('SERP analysis error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/analyze-serp"
};

