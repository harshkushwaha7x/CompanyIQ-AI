const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Make a Serper.dev search request
 */
async function serperSearch(query, apiKey, options = {}) {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: options.num || 10,
      ...options,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Find the official website for a company name
 */
export async function findCompanyWebsite(companyName, apiKey) {
  const results = await serperSearch(`${companyName} official website`, apiKey, { num: 5 });
  
  // Try to find the official website from organic results
  const organic = results.organic || [];
  
  // Look for the most likely official domain
  for (const result of organic) {
    const link = result.link || '';
    // Skip social media and Wikipedia
    if (/wikipedia|linkedin|facebook|twitter|x\.com|youtube|crunchbase|glassdoor/i.test(link)) {
      continue;
    }
    // Return the first non-social result
    return {
      url: link,
      title: result.title,
      snippet: result.snippet,
    };
  }
  
  // Fallback: return first result
  if (organic.length > 0) {
    return {
      url: organic[0].link,
      title: organic[0].title,
      snippet: organic[0].snippet,
    };
  }
  
  return null;
}

/**
 * Search for company information
 */
export async function searchCompanyInfo(companyName, apiKey) {
  const results = await serperSearch(`${companyName} company information products services`, apiKey, { num: 10 });
  
  const info = {
    organic: (results.organic || []).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
    })),
    knowledgeGraph: results.knowledgeGraph || null,
    answerBox: results.answerBox || null,
  };
  
  return info;
}

/**
 * Search for company contact details
 */
export async function searchContactDetails(companyName, apiKey) {
  const results = await serperSearch(`${companyName} contact phone number address headquarters`, apiKey, { num: 5 });
  
  return {
    organic: (results.organic || []).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
    })),
    knowledgeGraph: results.knowledgeGraph || null,
  };
}

/**
 * Search for competitors
 */
export async function searchCompetitors(companyName, industry, apiKey) {
  const query = industry
    ? `${companyName} competitors in ${industry}`
    : `${companyName} competitors alternatives`;
    
  const results = await serperSearch(query, apiKey, { num: 10 });
  
  return {
    organic: (results.organic || []).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
    })),
    knowledgeGraph: results.knowledgeGraph || null,
  };
}

/**
 * Gather comprehensive company data from Serper
 */
export async function gatherCompanyData(companyName, apiKey) {
  const [companyInfo, contactInfo, competitorInfo] = await Promise.all([
    searchCompanyInfo(companyName, apiKey),
    searchContactDetails(companyName, apiKey),
    searchCompetitors(companyName, null, apiKey),
  ]);
  
  return {
    companyInfo,
    contactInfo,
    competitorInfo,
  };
}
