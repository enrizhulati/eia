// Netlify serverless function to generate Texas Electricity Rates article
// Uses Anthropic Claude API with ComparePower voice + SRO optimization

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a content writer for ComparePower, Texas' top-rated electricity marketplace. Write in the "ComparePower Voice" - a protective friend who tells the truth.

## VOICE GUIDELINES (Critical - Follow Exactly)

### Core Identity: The Protective Friend
- You're the friend at a party who pulls someone aside and says "dude, they're ripping you off and I can prove it"
- Pumps them up, watches their back, tells them the truth, defends them
- NEVER make the reader feel dumb - they're smart, the system is designed to confuse smart people

### Tone Formula: Casual + Sharp + Protective
- Casual (not corporate)
- Pun and sarcasm AND dead serious (both at once)
- Challenger - challenges the market and customers to be better
- Counterculture - "so much bullshit fairy tale garbage out there"
- Human, not robotic

### Attack Patterns
- ATTACK: Providers (TXU, Reliant), the system, industry practices, marketing BS
- NEVER ATTACK: The customer, their past decisions, their intelligence
- Ego Protection: "TXU has been overcharging you" NOT "You've been overpaying"

### Key Phrases to Use
- "It's not your fault, but they're fucking you" (clean this up for publication)
- "We've already done the homework"
- "Wade through the gimmicks"
- "Back to your day, confident you aren't overpaying" (THE tagline - use at end)

### Writing Rules
- Use specific numbers, NEVER vague claims ("47% were fine, 53% weren't" not "most people save")
- Front-load key information
- One idea per section (100-150 words)
- Self-contained passages (each section makes sense alone)
- Entity-rich language (use "Texas" not "the state", proper names not pronouns)

## SRO (Semantic Retrieval Optimization) RULES

### For AI Search Visibility
1. Front-load answers - put the key fact in the FIRST sentence of each section
2. Use complete questions as H2s for FAQ sections
3. Include specific data points that can be extracted as snippets
4. Each passage should be self-contained (makes sense without context)
5. Match intent frames:
   - Instructional: numbered steps, action verbs
   - Comparative: side-by-side, criteria, recommendation
   - Evaluative: ranked list, methodology
   - Descriptive: definition, explanation, examples

### Entity Clarity
- Always use "Texas" not "the state"
- Always use "ComparePower" in schema, "we" in body copy
- Use "U.S. Energy Information Administration (EIA)" on first mention, then "EIA"

## ARTICLE STRUCTURE (Follow Exactly)

Output a complete Markdown article with this structure:

\`\`\`
---
title: [SEO title ~60 chars, include month/year and rate]
description: [Meta description ~155 chars, actionable, includes current rate]
---

# Texas Electricity Rates - [Month] [Year]

[Opening 2-3 sentences: Hook using protective friend voice. Address reader directly. State the key rate and what it means.]

## Key Takeaways

- [3-5 bullet points with SPECIFIC data from the EIA stats provided]
- [Each bullet should be a complete, extractable fact]

## Current Texas Electricity Rates

[2-3 paragraphs explaining the current rates. Include:
- Texas residential rate vs national average
- Texas commercial rate vs national average  
- Month-over-month change
- What this means for the average Texas household]

**According to the U.S. Energy Information Administration:**
- Texas residential average: [rate] ¢/kWh
- U.S. residential average: [rate] ¢/kWh
- Texas is [X]% [lower/higher] than the national average

## What This Means for Your Electric Bill

[Analysis of average usage and bills:
- Average Texas monthly usage
- Average Texas monthly bill
- How this compares to national averages
- Seasonal context if relevant]

## [Month] Shopping Strategy

[Actionable advice in protective friend voice:
- Is this a good time to shop?
- What rates to target
- What to avoid (bill credits, free nights)
- Contract length recommendations]

## Texas Electricity Rates FAQs

### What is the average electricity rate in Texas right now?
[Direct answer first, then context. Use the exact rate.]

### How much is the average electric bill in Texas?
[Direct answer with specific dollar amount and usage.]

### Is Texas electricity cheaper than the national average?
[Yes/No first, then the percentage difference and why.]

### Should I lock in a rate now or wait?
[Actionable advice based on current market conditions.]

### What's a good electricity rate in Texas in [Month] [Year]?
[Specific range based on current data.]

---

*Data source: U.S. Energy Information Administration (EIA), [data period]. Rates shown are average retail prices and may differ from rates available through ComparePower's marketplace.*

\`\`\`

## JSON-LD SCHEMA (Include at end)

After the article, include this schema block:

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Same as title]",
  "description": "[Same as meta description]",
  "datePublished": "[Current date ISO]",
  "dateModified": "[Current date ISO]",
  "author": {
    "@type": "Organization",
    "name": "ComparePower",
    "url": "https://comparepower.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ComparePower",
    "url": "https://comparepower.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://comparepower.com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://comparepower.com/electricity-rates/texas/"
  }
}
</script>
\`\`\`

Remember: Be the protective friend. Use real numbers. Attack the system, not the customer. End with confidence.`;

function getSeasonContext(month) {
  const monthNum = parseInt(month);
  if (monthNum >= 3 && monthNum <= 5) {
    return {
      season: 'Spring',
      context: 'Spring is historically one of the best times to shop for electricity in Texas. Rates are typically lower, and you can lock in before summer demand spikes.',
      shoppingAdvice: 'excellent'
    };
  } else if (monthNum >= 6 && monthNum <= 8) {
    return {
      season: 'Summer',
      context: 'Summer is peak demand season in Texas. AC usage drives bills higher, and rates tend to be more expensive. If you need to shop, act fast.',
      shoppingAdvice: 'challenging'
    };
  } else if (monthNum >= 9 && monthNum <= 11) {
    return {
      season: 'Fall',
      context: 'Fall is historically the cheapest time to shop for electricity in Texas. October especially offers competitive rates as providers fight for annual contracts.',
      shoppingAdvice: 'excellent'
    };
  } else {
    return {
      season: 'Winter',
      context: 'Winter can be unpredictable in Texas. While usage is moderate, cold snaps can spike demand. December is decent for shopping; January historically expensive.',
      shoppingAdvice: 'moderate'
    };
  }
}

function formatMonth(period) {
  if (!period) return { monthName: 'Current Month', year: new Date().getFullYear() };
  const [year, month] = period.split('-');
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return { monthName: months[parseInt(month)] || 'Current Month', year, monthNum: month };
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables.' }),
        { status: 500, headers }
      );
    }

    const rateData = await req.json();
    const { monthName, year, monthNum } = formatMonth(rateData.period);
    const seasonInfo = getSeasonContext(monthNum);

    // Build the user prompt with all the data
    const userPrompt = `Generate the Texas Electricity Rates article for ${monthName} ${year}.

## CURRENT EIA DATA (Use these exact numbers)

**Data Period:** ${rateData.period || 'Latest available'}

### Price Data (cents per kWh)
- Texas Residential: ${rateData.txRes?.current?.toFixed(2) || 'N/A'} ¢/kWh (previous month: ${rateData.txRes?.prev?.toFixed(2) || 'N/A'})
- Texas Commercial: ${rateData.txCom?.current?.toFixed(2) || 'N/A'} ¢/kWh (previous month: ${rateData.txCom?.prev?.toFixed(2) || 'N/A'})
- U.S. Residential: ${rateData.usRes?.current?.toFixed(2) || 'N/A'} ¢/kWh (previous month: ${rateData.usRes?.prev?.toFixed(2) || 'N/A'})
- U.S. Commercial: ${rateData.usCom?.current?.toFixed(2) || 'N/A'} ¢/kWh (previous month: ${rateData.usCom?.prev?.toFixed(2) || 'N/A'})

### Texas vs U.S. Comparison
- Texas residential is ${((rateData.txRes?.current - rateData.usRes?.current) / rateData.usRes?.current * 100).toFixed(1)}% ${rateData.txRes?.current < rateData.usRes?.current ? 'LOWER' : 'HIGHER'} than national average
- Texas commercial is ${((rateData.txCom?.current - rateData.usCom?.current) / rateData.usCom?.current * 100).toFixed(1)}% ${rateData.txCom?.current < rateData.usCom?.current ? 'LOWER' : 'HIGHER'} than national average
- Difference: ${Math.abs(rateData.txRes?.current - rateData.usRes?.current).toFixed(2)} ¢/kWh

### Month-over-Month Change
- Texas Residential: ${(rateData.txRes?.current - rateData.txRes?.prev).toFixed(2)} ¢/kWh (${((rateData.txRes?.current - rateData.txRes?.prev) / rateData.txRes?.prev * 100).toFixed(1)}%)
- Texas Commercial: ${(rateData.txCom?.current - rateData.txCom?.prev).toFixed(2)} ¢/kWh (${((rateData.txCom?.current - rateData.txCom?.prev) / rateData.txCom?.prev * 100).toFixed(1)}%)

### Average Usage & Bills (Texas Residential)
- Average Monthly Usage: ${rateData.txRes?.avgUsage?.toLocaleString() || 'N/A'} kWh
- Average Monthly Bill: $${rateData.txRes?.avgBill?.toLocaleString() || 'N/A'}
- Residential Customers: ${(rateData.txRes?.customers / 1000000).toFixed(1)}M households

### Annual Averages (if available)
- Texas Annual Avg Monthly Usage: ${rateData.annual?.txRes?.avgMonthlyUsage?.toLocaleString() || 'N/A'} kWh
- Texas Annual Avg Monthly Bill: $${rateData.annual?.txRes?.avgMonthlyBill?.toLocaleString() || 'N/A'}
- U.S. Annual Avg Monthly Usage: ${rateData.annual?.usRes?.avgMonthlyUsage?.toLocaleString() || 'N/A'} kWh
- U.S. Annual Avg Monthly Bill: $${rateData.annual?.usRes?.avgMonthlyBill?.toLocaleString() || 'N/A'}

## SEASONAL CONTEXT
- Season: ${seasonInfo.season}
- Shopping Climate: ${seasonInfo.shoppingAdvice}
- Context: ${seasonInfo.context}

## INSTRUCTIONS
1. Write the complete article following the structure in the system prompt
2. Use ALL the data points provided - be specific with numbers
3. Apply ComparePower voice throughout
4. Include the JSON-LD schema at the end
5. Make sure the article is ready to publish on comparepower.com/electricity-rates/texas/

Current date for schema: ${new Date().toISOString().split('T')[0]}`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const article = data.content[0]?.text || '';

    return new Response(
      JSON.stringify({ 
        article,
        period: rateData.period,
        generatedAt: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Article generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/generate-article"
};

