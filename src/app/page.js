'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

const EXAMPLES = ['stripe.com', 'Tesla', 'Microsoft', 'OpenAI'];

const STEP_LABELS = [
  'Finding official website',
  'Crawling website pages',
  'Searching public sources',
  'Analyzing with AI',
  'Identifying competitors',
  'Compiling report',
];

export default function Home() {
  const [config, setConfig] = useState({
    openrouterKey: '',
    serperKey: '',
    model: 'google/gemini-2.0-flash-001',
    discordBotToken: '',
    discordChannelId: '',
    applicantName: '',
    applicantEmail: '',
  });

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [toast, setToast] = useState(null);
  const [discordSending, setDiscordSending] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentProgress]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function handleNewResearch() {
    setMessages([]);
    setCurrentProgress(null);
    setInputValue('');
    setSidebarOpen(false);
  }

  function handleExampleClick(example) {
    setInputValue(example);
    inputRef.current?.focus();
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const query = inputValue.trim();
    if (!query || isLoading) return;

    if (!config.openrouterKey || !config.serperKey) {
      showToast('Please configure your OpenRouter and Serper.dev API keys in the sidebar first.', 'error');
      return;
    }

    setMessages(prev => [...prev, { type: 'user', content: query }]);
    setInputValue('');
    setIsLoading(true);
    setCurrentProgress({ steps: Array(6).fill('pending'), message: '' });
    setSidebarOpen(false);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          openrouterKey: config.openrouterKey,
          serperKey: config.serperKey,
          model: config.model,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setCurrentProgress(prev => {
                const steps = [...(prev?.steps || Array(6).fill('pending'))];
                const stepIdx = event.data.step - 1;

                for (let i = 0; i < stepIdx; i++) {
                  steps[i] = 'done';
                }

                steps[stepIdx] = event.data.done ? 'done' : 'active';

                return { steps, message: event.data.message };
              });
            } else if (event.type === 'result') {
              setCurrentProgress({
                steps: Array(6).fill('done'),
                message: 'Report ready',
              });

              setTimeout(() => {
                setMessages(prev => [...prev, {
                  type: 'result',
                  content: event.data,
                }]);
                setCurrentProgress(null);
                setIsLoading(false);
                showToast('Research complete. View your report below.');
              }, 500);
            } else if (event.type === 'error') {
              setMessages(prev => [...prev, {
                type: 'error',
                content: event.data.message,
              }]);
              setCurrentProgress(null);
              setIsLoading(false);
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

      // Handle unexpected stream termination
      setIsLoading(prev => {
        if (prev) {
          setCurrentProgress(null);
          setMessages(msgs => [...msgs, {
            type: 'error',
            content: 'The research stream ended unexpectedly. Please try again.',
          }]);
        }
        return false;
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Request failed: ${err.message}`,
      }]);
      setCurrentProgress(null);
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleDownloadPDF(data) {
    try {
      const { generatePDF } = await import('@/utils/pdfGenerator');
      generatePDF(data);
      showToast('PDF report downloaded successfully.');
    } catch (err) {
      showToast(`PDF generation failed: ${err.message}`, 'error');
    }
  }

  async function handleSendDiscord(data) {
    if (!config.discordBotToken || !config.discordChannelId) {
      showToast('Please configure Discord Bot Token and Channel ID in the sidebar first.', 'error');
      return;
    }

    setDiscordSending(true);

    try {
      const { generatePDFBlob } = await import('@/utils/pdfGenerator');
      const pdfBlob = generatePDFBlob(data);

      const base64Promise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const pdfBase64 = await base64Promise;

      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.discordBotToken,
          channelId: config.discordChannelId,
          applicantName: config.applicantName,
          applicantEmail: config.applicantEmail,
          companyName: data.companyName,
          companyWebsite: data.website,
          pdfBase64,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast('Report sent to Discord successfully.');
      } else {
        showToast(`Discord error: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast(`Failed to send to Discord: ${err.message}`, 'error');
    } finally {
      setDiscordSending(false);
    }
  }

  const showWelcome = messages.length === 0 && !currentProgress;

  return (
    <div className="app-container">
      <Sidebar
        config={config}
        setConfig={setConfig}
        onNewResearch={handleNewResearch}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <header className="main-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            id="mobile-menu-btn"
            aria-label="Open menu"
          >
            &#9776;
          </button>
          <span className="header-title">Company Research</span>
          <div className="live-badge">
            <span className="live-dot" />
            LIVE
          </div>
        </header>

        <div className="chat-area">
          {showWelcome ? (
            <div className="welcome-state">
              <div className="welcome-label">Intelligent Company Research</div>
              <h1 className="welcome-title">
                Know any company<br />in minutes.
              </h1>
              <p className="welcome-subtitle">
                Enter a company name or website URL to get comprehensive insights,
                competitor analysis, pain points, and a professional PDF report.
              </p>
              <div className="example-pills">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    className="example-pill"
                    onClick={() => handleExampleClick(ex)}
                    id={`example-${ex.replace(/\./g, '-')}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="config-hint">
                Configure API keys in the sidebar to get started
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className="message">
                  {msg.type === 'user' && (
                    <>
                      <div className="message-avatar user">U</div>
                      <div className="message-content user-msg">
                        <p>{msg.content}</p>
                      </div>
                    </>
                  )}

                  {msg.type === 'error' && (
                    <>
                      <div className="message-avatar ai">C</div>
                      <div className="message-content">
                        <div className="error-message">
                          <span className="error-icon">!</span>
                          <span>{msg.content}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {msg.type === 'result' && (
                    <>
                      <div className="message-avatar ai">C</div>
                      <div className="message-content">
                        <div className="research-result">
                          <div className="result-header">
                            <div>
                              <h2 className="result-company-name">{msg.content.companyName}</h2>
                              <a
                                className="result-website"
                                href={msg.content.website?.startsWith('http') ? msg.content.website : `https://${msg.content.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {msg.content.website}
                              </a>
                            </div>
                            <div className="result-badge">Research Complete</div>
                          </div>

                          <div className="info-cards">
                            <div className="info-card">
                              <div className="info-card-label">Phone</div>
                              <div className="info-card-value">{msg.content.phone}</div>
                            </div>
                            <div className="info-card">
                              <div className="info-card-label">Address</div>
                              <div className="info-card-value">{msg.content.address}</div>
                            </div>
                          </div>

                          {msg.content.summary && (
                            <>
                              <div className="section-title">Company Summary</div>
                              <div className="summary-text">{msg.content.summary}</div>
                            </>
                          )}

                          {msg.content.productsAndServices?.length > 0 && (
                            <>
                              <div className="section-title">Products & Services</div>
                              <div className="product-tags">
                                {msg.content.productsAndServices.map((p, j) => (
                                  <span key={j} className="product-tag">{p}</span>
                                ))}
                              </div>
                            </>
                          )}

                          {msg.content.painPoints?.length > 0 && (
                            <>
                              <div className="section-title">Potential Pain Points</div>
                              <ul className="pain-points-list">
                                {msg.content.painPoints.map((pp, j) => (
                                  <li key={j} className="pain-point-item">{pp}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          {msg.content.competitors?.length > 0 && (
                            <>
                              <div className="section-title">Competitors</div>
                              <div className="competitors-grid">
                                {msg.content.competitors.map((comp, j) => (
                                  <div key={j} className="competitor-card">
                                    <div className="competitor-name">{comp.name}</div>
                                    <a
                                      className="competitor-website"
                                      href={comp.website?.startsWith('http') ? comp.website : `https://${comp.website}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {comp.website}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {(msg.content.industry || msg.content.founded) && (
                            <div className="info-cards" style={{ marginTop: 4 }}>
                              {msg.content.industry && (
                                <div className="info-card">
                                  <div className="info-card-label">Industry</div>
                                  <div className="info-card-value">{msg.content.industry}</div>
                                </div>
                              )}
                              {msg.content.founded && msg.content.founded !== 'Unknown' && (
                                <div className="info-card">
                                  <div className="info-card-label">Founded</div>
                                  <div className="info-card-value">{msg.content.founded}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {msg.content.pagesAnalyzed > 0 && (
                            <div className="pages-analyzed-badge">
                              {msg.content.pagesAnalyzed} pages analyzed
                            </div>
                          )}

                          <div className="action-buttons">
                            <button
                              className="action-btn primary"
                              onClick={() => handleDownloadPDF(msg.content)}
                              id="download-pdf-btn"
                            >
                              Download PDF Report
                            </button>
                            {config.discordBotToken && config.discordChannelId && (
                              <button
                                className="action-btn secondary"
                                onClick={() => handleSendDiscord(msg.content)}
                                disabled={discordSending}
                                id="send-discord-btn"
                              >
                                {discordSending ? 'Sending...' : 'Send to Discord'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {currentProgress && (
                <div className="message">
                  <div className="message-avatar ai">C</div>
                  <div className="message-content">
                    <div className="progress-container">
                      {STEP_LABELS.map((label, i) => (
                        <div
                          key={i}
                          className={`progress-step ${currentProgress.steps[i]}`}
                        >
                          <div className={`step-icon ${currentProgress.steps[i]}`}>
                            {currentProgress.steps[i] === 'done'
                              ? '\u2713'
                              : currentProgress.steps[i] === 'active'
                              ? '\u25CC'
                              : '\u25CB'}
                          </div>
                          <span className={`step-label ${currentProgress.steps[i]}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                      {currentProgress.message && (
                        <div className="progress-detail">
                          {currentProgress.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div className="input-area">
          <form onSubmit={handleSubmit}>
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://stripe.com)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                id="chat-input"
              />
              <button
                type="submit"
                className="send-btn"
                disabled={isLoading || !inputValue.trim()}
                id="research-btn"
              >
                {isLoading ? (
                  <span className="loading-dots">
                    <span /><span /><span />
                  </span>
                ) : (
                  'Research'
                )}
              </button>
            </div>
          </form>
          <div className="input-hint">
            Press Enter to research
          </div>
        </div>

        {toast && (
          <div className={`toast ${toast.type}`} onClick={() => setToast(null)}>
            <span className="toast-icon">
              {toast.type === 'error' ? '!' : '\u2713'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </main>
    </div>
  );
}
