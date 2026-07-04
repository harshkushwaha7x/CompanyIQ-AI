import { crawlWebsite } from '@/utils/crawler';
import { findCompanyWebsite, gatherCompanyData } from '@/utils/serper';
import { analyzeCompany, identifyCompetitors } from '@/utils/openrouter';

export const maxDuration = 60;

export async function POST(request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type, data) {
        const event = JSON.stringify({ type, data, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      
      try {
        const body = await request.json();
        const { input, openrouterKey, serperKey, model } = body;
        
        if (!input || !openrouterKey || !serperKey) {
          sendEvent('error', { message: 'Missing required fields: input, openrouterKey, serperKey' });
          controller.close();
          return;
        }
        
        let companyName = input.trim();
        let websiteUrl = null;
        
        // Determine if input is a URL or company name
        const isUrl = /^https?:\/\//i.test(companyName) || /\.\w{2,}/.test(companyName);
        
        if (isUrl) {
          websiteUrl = companyName.startsWith('http') ? companyName : `https://${companyName}`;
          // Extract company name from URL
          try {
            const urlObj = new URL(websiteUrl);
            companyName = urlObj.hostname.replace(/^www\./, '').split('.')[0];
            companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
          } catch {
            companyName = input;
          }
          sendEvent('progress', { step: 1, message: `Using provided website: ${websiteUrl}`, total: 6 });
        } else {
          // Search for company website
          sendEvent('progress', { step: 1, message: `Searching for ${companyName}'s official website...`, total: 6 });
          
          try {
            const websiteResult = await findCompanyWebsite(companyName, serperKey);
            if (websiteResult) {
              websiteUrl = websiteResult.url;
              sendEvent('progress', { step: 1, message: `Found website: ${websiteUrl}`, total: 6, done: true });
            }
          } catch (err) {
            sendEvent('progress', { step: 1, message: `Website search issue: ${err.message}`, total: 6 });
          }
        }
        
        // Step 2: Crawl the website
        sendEvent('progress', { step: 2, message: `Crawling ${websiteUrl || 'website'}...`, total: 6 });
        
        let crawledData = { pages: [], contactInfo: { phones: [], emails: [], addresses: [] }, pagesAnalyzed: 0 };
        
        if (websiteUrl) {
          try {
            crawledData = await crawlWebsite(websiteUrl, (msg) => {
              sendEvent('progress', { step: 2, message: msg, total: 6 });
            });
            sendEvent('progress', { step: 2, message: `Crawled ${crawledData.pagesAnalyzed} pages`, total: 6, done: true });
          } catch (err) {
            sendEvent('progress', { step: 2, message: `Crawling issue: ${err.message}. Continuing with search data...`, total: 6 });
          }
        }
        
        // Step 3: Gather data from Serper
        sendEvent('progress', { step: 3, message: `Searching for additional information about ${companyName}...`, total: 6 });
        
        let serperData;
        try {
          serperData = await gatherCompanyData(companyName, serperKey);
          sendEvent('progress', { step: 3, message: 'Collected search data', total: 6, done: true });
        } catch (err) {
          sendEvent('error', { message: `Search failed: ${err.message}` });
          controller.close();
          return;
        }
        
        // Step 4: AI Analysis
        sendEvent('progress', { step: 4, message: `Analyzing ${companyName} with AI...`, total: 6 });
        
        let analysis;
        try {
          analysis = await analyzeCompany(
            crawledData,
            serperData,
            companyName,
            websiteUrl || 'Not found',
            openrouterKey,
            model || 'google/gemini-2.0-flash-001'
          );
          sendEvent('progress', { step: 4, message: 'AI analysis complete', total: 6, done: true });
        } catch (err) {
          sendEvent('error', { message: `AI analysis failed: ${err.message}` });
          controller.close();
          return;
        }
        
        // Step 5: Competitor Analysis
        sendEvent('progress', { step: 5, message: 'Identifying competitors...', total: 6 });
        
        let competitors = { competitors: [] };
        try {
          competitors = await identifyCompetitors(
            analysis,
            serperData.competitorInfo,
            openrouterKey,
            model || 'google/gemini-2.0-flash-001'
          );
          sendEvent('progress', { step: 5, message: `Found ${competitors.competitors?.length || 0} competitors`, total: 6, done: true });
        } catch (err) {
          sendEvent('progress', { step: 5, message: `Competitor analysis issue: ${err.message}`, total: 6 });
        }
        
        // Step 6: Generate final report
        sendEvent('progress', { step: 6, message: 'Compiling research report...', total: 6 });
        
        const report = {
          companyName: analysis.companyName || companyName,
          website: analysis.website || websiteUrl || 'Not found',
          phone: analysis.phone || crawledData.contactInfo.phones[0] || 'Not publicly listed',
          address: analysis.address || crawledData.contactInfo.addresses[0] || 'Not publicly available',
          summary: analysis.summary || '',
          productsAndServices: analysis.productsAndServices || [],
          painPoints: analysis.painPoints || [],
          competitors: competitors.competitors || [],
          industry: analysis.industry || 'Unknown',
          country: analysis.country || 'Unknown',
          founded: analysis.founded || 'Unknown',
          employeeCount: analysis.employeeCount || 'Unknown',
          pagesAnalyzed: crawledData.pagesAnalyzed,
        };
        
        sendEvent('progress', { step: 6, message: 'Report ready!', total: 6, done: true });
        sendEvent('result', report);
        
      } catch (err) {
        sendEvent('error', { message: err.message || 'An unexpected error occurred' });
      } finally {
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
