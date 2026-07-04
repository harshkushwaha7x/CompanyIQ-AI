# CompanyIQ AI - Company Research Assistant

An intelligent company research tool that combines website crawling, search engine data (Serper.dev), and AI analysis (OpenRouter) to generate comprehensive company reports with competitor analysis and downloadable PDF output.

## Features

### Core Features
- **Company Research** - Enter a company name (e.g., "Microsoft") or website URL (e.g., "https://stripe.com")
- **Intelligent Website Crawling** - Automatically discovers and crawls important pages (About, Products, Services, Contact, Pricing)
- **Serper.dev Search Integration** - Enriches research with search engine data, contact details, and competitor information
- **OpenRouter AI Analysis** - Generates company summaries, products/services lists, and pain points
- **Competitor Analysis** - Identifies competitors in the same industry/country with names and websites
- **PDF Report Generation** - Professional dark-themed PDF with all research data, downloadable in one click
- **Conversational Interface** - Modern chat-style UI with real-time progress tracking

### Bonus Features
- **AI Model Selection** - Choose any OpenRouter-supported model (GPT-4o, Claude, Gemini, Llama, etc.)
- **Discord Integration** - Send research reports with PDF attachments to Discord channels
- **Responsive Design** - Mobile-friendly layout with sidebar toggle
- **Progress Tracking** - Step-by-step progress indicators during research
- **Smart Crawling** - Deduplication, login page filtering, content extraction optimization

## Quick Start

### Prerequisites
- Node.js 18+ installed
- An [OpenRouter](https://openrouter.ai/) API key
- A [Serper.dev](https://serper.dev/) API key

### Installation

```bash
git clone https://github.com/harshkushwaha7x/CompanyIQ-AI.git
cd companyiq-ai

npm install

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. **API Keys** - Click the "API" tab in the sidebar
   - Enter your OpenRouter API key
   - Enter your Serper.dev API key
   - Select your preferred AI model
   - Click "Save Configuration"

2. **Discord (Optional)** - Click the "Discord" tab in the sidebar
   - Enter your Discord Bot Token
   - Enter the target Channel ID
   - Enter your name and email
   - Click "Save Discord Config"

## Architecture

```
companyiq-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── research/    # Main research orchestrator (SSE streaming)
│   │   │   ├── discord/     # Discord bot integration
│   │   │   └── models/      # OpenRouter model listing
│   │   ├── globals.css      # Design system and all styles
│   │   ├── layout.js        # Root layout with SEO
│   │   └── page.js          # Main application page
│   ├── components/
│   │   └── Sidebar.js       # Config sidebar component
│   └── utils/
│       ├── crawler.js       # Website crawling engine
│       ├── serper.js        # Serper.dev API client
│       ├── openrouter.js    # OpenRouter API client
│       └── pdfGenerator.js  # PDF report generator
├── next.config.mjs
├── vercel.json
├── .env.example
└── package.json
```

### Data Flow

1. **User Input** - Company name or URL
2. **Serper.dev** - Finds official website (if company name given)
3. **Crawler** - Discovers and scrapes important pages
4. **Serper.dev** - Gathers additional company info, contact details
5. **OpenRouter** - AI analyzes all data, generates insights
6. **OpenRouter** - Identifies competitors
7. **Frontend** - Displays structured results with real-time progress
8. **jsPDF** - Generates professional PDF report
9. **Discord** - (Optional) Sends report to configured channel

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | No* | OpenRouter API key (can be set in UI) |
| `SERPER_API_KEY` | No* | Serper.dev API key (can be set in UI) |
| `DISCORD_BOT_TOKEN` | No | Discord bot token (set in UI) |
| `DISCORD_CHANNEL_ID` | No | Discord channel ID (set in UI) |

\* API keys are entered via the browser UI and stored in localStorage. Environment variables are optional.

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel

vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Other Platforms

The app can be deployed on any platform that supports Next.js:
- **Netlify** - Use the Next.js adapter
- **Railway** - Direct deployment support

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | JavaScript |
| Styling | Vanilla CSS (custom design system) |
| AI | OpenRouter (any supported model) |
| Search | Serper.dev |
| Crawling | Cheerio + native fetch |
| PDF | jsPDF |
| Deployment | Vercel |

## Evaluation Criteria Coverage

| Criteria | Points | Status |
|----------|--------|--------|
| Company Research | 15 | Done |
| Website Crawling and Data Extraction | 15 | Done |
| OpenRouter AI Integration | 15 | Done |
| Serper.dev Integration | 10 | Done |
| Competitor Analysis | 10 | Done |
| PDF Report Generation | 10 | Done |
| Deployment and Documentation | 5 | Done |
| Discord Integration (Bonus) | 10 | Done |
| Additional Enhancements (Bonus) | 10 | Done |
