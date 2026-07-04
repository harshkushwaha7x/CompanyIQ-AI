const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Call OpenRouter chat completions API
 */
async function callOpenRouter(messages, apiKey, model = 'google/gemini-2.0-flash-001') {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://companyiq-ai.vercel.app',
      'X-Title': 'CompanyIQ',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate comprehensive company analysis
 */
export async function analyzeCompany(crawledData, serperData, companyName, websiteUrl, apiKey, model) {
  const crawledContent = crawledData.pages
    .map(p => `--- Page: ${p.url} ---\n${p.content}`)
    .join('\n\n');
  
  const serperContent = serperData.companyInfo.organic
    .map(r => `${r.title}: ${r.snippet}`)
    .join('\n');
  
  const contactSerper = serperData.contactInfo.organic
    .map(r => `${r.title}: ${r.snippet}`)
    .join('\n');
  
  const knowledgeGraph = serperData.companyInfo.knowledgeGraph
    ? JSON.stringify(serperData.companyInfo.knowledgeGraph, null, 2)
    : 'Not available';
  
  const prompt = `You are a business research analyst. Analyze the following data about "${companyName}" and provide a comprehensive company research report.

WEBSITE DATA (crawled from ${websiteUrl}):
${crawledContent.slice(0, 6000)}

SEARCH ENGINE DATA:
${serperContent.slice(0, 2000)}

CONTACT INFORMATION FROM SEARCH:
${contactSerper.slice(0, 1000)}

KNOWLEDGE GRAPH:
${knowledgeGraph.slice(0, 1000)}

CRAWLED CONTACT INFO:
Phones: ${crawledData.contactInfo.phones.join(', ') || 'Not found'}
Emails: ${crawledData.contactInfo.emails.join(', ') || 'Not found'}
Addresses: ${crawledData.contactInfo.addresses.join(', ') || 'Not found'}

Provide your analysis in the following JSON format ONLY (no markdown, no code blocks, just pure JSON):
{
  "companyName": "Official company name",
  "website": "${websiteUrl}",
  "phone": "Phone number or 'Not publicly listed'",
  "address": "Full address or 'Not publicly available'",
  "summary": "2-3 sentence company overview",
  "productsAndServices": ["Product 1", "Product 2", "Service 1", ...],
  "painPoints": [
    "Detailed pain point 1 (2-3 sentences explaining the challenge)",
    "Detailed pain point 2",
    "Detailed pain point 3",
    "Detailed pain point 4"
  ],
  "industry": "Primary industry/sector",
  "country": "Country of headquarters",
  "founded": "Year founded or 'Unknown'",
  "employeeCount": "Approximate employee count or 'Unknown'"
}`;

  const response = await callOpenRouter([
    { role: 'system', content: 'You are a precise business research analyst. Always respond with valid JSON only. No markdown formatting, no code blocks.' },
    { role: 'user', content: prompt }
  ], apiKey, model);
  
  // Parse JSON from response (handle potential markdown wrapping)
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    return JSON.parse(cleanResponse);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Identify competitors
 */
export async function identifyCompetitors(companyAnalysis, serperCompetitorData, apiKey, model) {
  const serperResults = serperCompetitorData.organic
    .map(r => `${r.title}: ${r.snippet} (${r.link})`)
    .join('\n');
  
  const prompt = `Based on the following company information and search results, identify 4-6 key competitors for "${companyAnalysis.companyName}".

COMPANY INFO:
- Name: ${companyAnalysis.companyName}
- Industry: ${companyAnalysis.industry}
- Country: ${companyAnalysis.country}
- Products/Services: ${companyAnalysis.productsAndServices?.join(', ')}

SEARCH RESULTS FOR COMPETITORS:
${serperResults.slice(0, 3000)}

For each competitor, provide the following information in JSON format ONLY (no markdown, no code blocks):
{
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "https://competitor-website.com",
      "reason": "Brief reason why they are a competitor"
    }
  ]
}

Rules:
- Only include real, well-known companies
- Include their actual official website URL
- Competitors should be in the same or similar industry
- Prefer competitors in the same country/region when possible
- Do NOT include the researched company itself`;

  const response = await callOpenRouter([
    { role: 'system', content: 'You are a competitive intelligence analyst. Always respond with valid JSON only. No markdown formatting, no code blocks.' },
    { role: 'user', content: prompt }
  ], apiKey, model);
  
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    return JSON.parse(cleanResponse);
  } catch (e) {
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse competitor analysis');
  }
}

/**
 * Fetch available models from OpenRouter
 */
export async function fetchModels(apiKey) {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  
  const data = await response.json();
  
  // Filter and sort models - prefer popular ones
  const popularIds = [
    'google/gemini-2.0-flash-001',
    'google/gemini-2.5-flash-preview',
    'anthropic/claude-sonnet-4',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'meta-llama/llama-3.1-70b-instruct',
    'deepseek/deepseek-chat-v3-0324',
    'mistralai/mistral-large-2411',
    'qwen/qwen-2.5-72b-instruct',
  ];
  
  const models = (data.data || [])
    .filter(m => m.id && !m.id.includes(':free') && m.context_length >= 4000)
    .map(m => ({
      id: m.id,
      name: m.name || m.id,
      contextLength: m.context_length,
      isPopular: popularIds.includes(m.id),
    }))
    .sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });
  
  return models;
}
