import * as cheerio from 'cheerio';

const IMPORTANT_KEYWORDS = [
  'about', 'product', 'service', 'solution', 'contact',
  'pricing', 'team', 'career', 'feature', 'platform',
  'overview', 'company', 'who-we-are', 'what-we-do'
];

const IGNORE_PATTERNS = [
  /login/i, /signin/i, /signup/i, /register/i, /auth/i,
  /password/i, /account/i, /dashboard/i, /admin/i,
  /\.pdf$/i, /\.zip$/i, /\.png$/i, /\.jpg$/i, /\.jpeg$/i,
  /\.gif$/i, /\.svg$/i, /\.css$/i, /\.js$/i,
  /mailto:/i, /tel:/i, /javascript:/i, /#$/,
  /blog\//i, /news\//i, /press/i, /privacy/i, /terms/i,
  /cookie/i, /legal/i, /sitemap/i, /feed/i, /rss/i,
  /\.xml$/i, /cdn-cgi/i, /wp-content/i, /wp-admin/i
];

const MAX_PAGES = 8;
const FETCH_TIMEOUT = 10000;

/**
 * Fetch a page with timeout
 */
async function fetchPage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    
    const html = await response.text();
    return html;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Extract meaningful text content from HTML
 */
function extractContent($) {
  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, footer, header, .cookie-banner, .popup, .modal, [role="navigation"], [role="banner"]').remove();
  
  const content = {
    title: $('title').text().trim(),
    metaDescription: $('meta[name="description"]').attr('content') || '',
    headings: [],
    paragraphs: [],
    listItems: [],
  };
  
  // Extract headings
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 300) {
      content.headings.push(text);
    }
  });
  
  // Extract paragraphs
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20 && text.length < 2000) {
      content.paragraphs.push(text);
    }
  });
  
  // Extract list items
  $('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10 && text.length < 500) {
      content.listItems.push(text);
    }
  });
  
  return content;
}

/**
 * Extract contact information from HTML
 */
function extractContactInfo($, html) {
  const contact = {
    phones: [],
    emails: [],
    addresses: [],
  };
  
  // Phone patterns
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = html.match(phoneRegex) || [];
  contact.phones = [...new Set(phoneMatches)].slice(0, 3);
  
  // Email patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = html.match(emailRegex) || [];
  contact.emails = [...new Set(emailMatches)]
    .filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('webpack'))
    .slice(0, 3);
  
  // Address - look for structured data
  const addressEl = $('[itemprop="address"], .address, [class*="address"]');
  if (addressEl.length) {
    const addr = addressEl.first().text().trim().replace(/\s+/g, ' ');
    if (addr.length > 5 && addr.length < 300) {
      contact.addresses.push(addr);
    }
  }
  
  return contact;
}

/**
 * Discover links on a page that match important keywords
 */
function discoverLinks($, baseUrl) {
  const links = new Set();
  const baseUrlObj = new URL(baseUrl);
  
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      
      const resolvedUrl = new URL(href, baseUrl);
      
      // Only same domain
      if (resolvedUrl.hostname !== baseUrlObj.hostname) return;
      
      // Remove hash and query
      resolvedUrl.hash = '';
      const cleanUrl = resolvedUrl.toString().replace(/\/$/, '');
      
      // Check ignore patterns
      if (IGNORE_PATTERNS.some(pattern => pattern.test(cleanUrl))) return;
      
      // Check if it matches important keywords
      const path = resolvedUrl.pathname.toLowerCase();
      const isImportant = IMPORTANT_KEYWORDS.some(keyword => path.includes(keyword));
      
      // Only add root-level or important pages
      const depth = path.split('/').filter(Boolean).length;
      if (isImportant || depth <= 1) {
        links.add(cleanUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  });
  
  return [...links];
}

/**
 * Prioritize URLs - important pages first
 */
function prioritizeUrls(urls) {
  return urls.sort((a, b) => {
    const aScore = IMPORTANT_KEYWORDS.reduce((score, kw) => 
      score + (a.toLowerCase().includes(kw) ? 1 : 0), 0);
    const bScore = IMPORTANT_KEYWORDS.reduce((score, kw) => 
      score + (b.toLowerCase().includes(kw) ? 1 : 0), 0);
    return bScore - aScore;
  });
}

/**
 * Main crawl function
 */
export async function crawlWebsite(websiteUrl, onProgress) {
  const normalizedUrl = websiteUrl.replace(/\/$/, '');
  const visited = new Set();
  const results = [];
  const allContact = { phones: [], emails: [], addresses: [] };
  let toVisit = [normalizedUrl];
  
  if (onProgress) onProgress(`Starting crawl of ${normalizedUrl}`);
  
  // Crawl the homepage first
  while (toVisit.length > 0 && visited.size < MAX_PAGES) {
    const url = toVisit.shift();
    
    if (visited.has(url)) continue;
    visited.add(url);
    
    if (onProgress) onProgress(`Crawling: ${url}`);
    
    const html = await fetchPage(url);
    if (!html) continue;
    
    const $ = cheerio.load(html);
    
    // Extract content
    const content = extractContent($);
    const contactInfo = extractContactInfo($, html);
    
    // Merge contact info
    allContact.phones.push(...contactInfo.phones);
    allContact.emails.push(...contactInfo.emails);
    allContact.addresses.push(...contactInfo.addresses);
    
    // Build page summary
    const pageText = [
      content.title ? `Title: ${content.title}` : '',
      content.metaDescription ? `Description: ${content.metaDescription}` : '',
      content.headings.length ? `Headings: ${content.headings.join('; ')}` : '',
      content.paragraphs.slice(0, 10).join('\n'),
      content.listItems.slice(0, 10).join('\n'),
    ].filter(Boolean).join('\n\n');
    
    if (pageText.length > 50) {
      results.push({
        url,
        title: content.title,
        content: pageText.slice(0, 3000), // Limit content per page
      });
    }
    
    // Discover new links (only from first few pages to avoid explosion)
    if (visited.size <= 3) {
      const newLinks = discoverLinks($, url);
      const prioritized = prioritizeUrls(
        newLinks.filter(l => !visited.has(l) && !toVisit.includes(l))
      );
      toVisit.push(...prioritized);
    }
  }
  
  // Deduplicate contact info
  allContact.phones = [...new Set(allContact.phones)].slice(0, 3);
  allContact.emails = [...new Set(allContact.emails)].slice(0, 3);
  allContact.addresses = [...new Set(allContact.addresses)].slice(0, 2);
  
  if (onProgress) onProgress(`Crawl complete. Analyzed ${results.length} pages.`);
  
  return {
    pages: results,
    contactInfo: allContact,
    pagesAnalyzed: results.length,
  };
}
