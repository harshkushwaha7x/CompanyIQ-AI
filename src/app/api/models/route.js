export async function POST(request) {
  try {
    const { apiKey } = await request.json();
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch models' }, { status: response.status });
    }
    
    const data = await response.json();
    
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
      .filter(m => m.id && m.context_length >= 4000)
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length,
        isPopular: popularIds.includes(m.id),
        pricing: m.pricing,
      }))
      .sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.name.localeCompare(b.name);
      });
    
    return Response.json({ models });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
