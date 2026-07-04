'use client';

import { useState, useEffect } from 'react';

const POPULAR_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
];

export default function Sidebar({ config, setConfig, onNewResearch, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('api');
  const [saved, setSaved] = useState(false);
  const [discordSaved, setDiscordSaved] = useState(false);
  const [models, setModels] = useState(POPULAR_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('companyiq-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch {
        // Ignore corrupted localStorage data
      }
    }
  }, []);

  // Fetch models when API key is available
  useEffect(() => {
    if (config.openrouterKey && config.openrouterKey.length > 10) {
      fetchModels();
    }
  }, [config.openrouterKey]);

  async function fetchModels() {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.openrouterKey }),
      });
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        // Merge popular models first, then others
        const popular = data.models.filter(m => m.isPopular);
        const others = data.models.filter(m => !m.isPopular).slice(0, 50);
        setModels([...popular, ...others].map(m => ({ id: m.id, name: m.name })));
      }
    } catch {
      // Fall back to default model list
    } finally {
      setLoadingModels(false);
    }
  }

  function handleSaveConfig() {
    localStorage.setItem('companyiq-config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveDiscord() {
    localStorage.setItem('companyiq-config', JSON.stringify(config));
    setDiscordSaved(true);
    setTimeout(() => setDiscordSaved(false), 2000);
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <div className="brand-icon">C</div>
            <div className="brand-text">
              <span className="brand-name">CompanyIQ AI</span>
              <span>Company Intelligence</span>
            </div>
          </div>
        </div>

        {/* New Research Button */}
        <button className="new-research-btn" onClick={onNewResearch} id="new-research-btn">
          + New Research
        </button>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
            id="tab-api"
          >
            API
          </button>
          <button
            className={`tab-btn ${activeTab === 'discord' ? 'active' : ''}`}
            onClick={() => setActiveTab('discord')}
            id="tab-discord"
          >
            Discord
          </button>
        </div>

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="sidebar-section" id="api-config-section">
            <label className="sidebar-label">OpenRouter API Key</label>
            <input
              type="password"
              className="sidebar-input"
              placeholder="sk-or-v1-..."
              value={config.openrouterKey}
              onChange={(e) => setConfig(prev => ({ ...prev, openrouterKey: e.target.value }))}
              id="openrouter-key-input"
            />

            <div style={{ height: 14 }} />

            <label className="sidebar-label">Serper.dev API Key</label>
            <input
              type="password"
              className="sidebar-input"
              placeholder="Your Serper key..."
              value={config.serperKey}
              onChange={(e) => setConfig(prev => ({ ...prev, serperKey: e.target.value }))}
              id="serper-key-input"
            />

            <div style={{ height: 14 }} />

            <label className="sidebar-label">AI Model</label>
            <select
              className="sidebar-select"
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              id="model-select"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <button
              className={`save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSaveConfig}
              id="save-config-btn"
            >
              {saved ? 'Saved' : 'Save Configuration'}
            </button>
          </div>
        )}

        {/* Discord Tab */}
        {activeTab === 'discord' && (
          <div className="sidebar-section" id="discord-config-section">
            <div className="discord-info">
              <h4>Discord Bot Integration</h4>
              <p>After research completes, the report auto-sends to your configured channel.</p>
            </div>

            <div style={{ height: 12 }} />

            <label className="sidebar-label">Bot Token</label>
            <input
              type="password"
              className="sidebar-input"
              placeholder="Bot token..."
              value={config.discordBotToken}
              onChange={(e) => setConfig(prev => ({ ...prev, discordBotToken: e.target.value }))}
              id="discord-token-input"
            />

            <div style={{ height: 14 }} />

            <label className="sidebar-label">Channel ID</label>
            <input
              type="text"
              className="sidebar-input"
              placeholder="000000000000000000"
              value={config.discordChannelId}
              onChange={(e) => setConfig(prev => ({ ...prev, discordChannelId: e.target.value }))}
              id="discord-channel-input"
            />

            <div style={{ height: 16 }} />

            <label className="sidebar-label">Applicant Details</label>

            <label className="sidebar-label" style={{ marginTop: 8, fontSize: 11, letterSpacing: 0 }}>Full Name</label>
            <input
              type="text"
              className="sidebar-input"
              placeholder="Your full name"
              value={config.applicantName}
              onChange={(e) => setConfig(prev => ({ ...prev, applicantName: e.target.value }))}
              id="applicant-name-input"
            />

            <div style={{ height: 10 }} />

            <label className="sidebar-label" style={{ fontSize: 11, letterSpacing: 0 }}>Email Address</label>
            <input
              type="email"
              className="sidebar-input"
              placeholder="email@example.com"
              value={config.applicantEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, applicantEmail: e.target.value }))}
              id="applicant-email-input"
            />

            <button
              className={`save-btn ${discordSaved ? 'saved' : ''}`}
              onClick={handleSaveDiscord}
              id="save-discord-btn"
            >
              {discordSaved ? 'Saved' : 'Save Discord Config'}
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="step-item">
            <div className="step-number">1</div>
            <span className="step-text">Enter a company name or URL</span>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <span className="step-text">Serper.dev searches and crawls it</span>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <span className="step-text">OpenRouter AI generates insights</span>
          </div>
          <div className="step-item">
            <div className="step-number">4</div>
            <span className="step-text">Download a professional PDF report</span>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <span>OpenRouter</span>
          <span className="dot">·</span>
          <span>Serper</span>
          <span className="dot">·</span>
          <span>jsPDF</span>
        </div>
      </aside>
    </>
  );
}
