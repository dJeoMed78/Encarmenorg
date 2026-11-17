import { timingSafeEqual } from 'node:crypto';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const equals = (a, b) => {
  const x = Buffer.from(a || '');
  const y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
};
export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405);
    const key = process.env.GEMINI_API_KEY;
    const token = process.env.PROXY_ACCESS_TOKEN;
    if (!key || !token) return json({ error: { message: 'Gateway not configured' } }, 503);
    const bearer = (request.headers.get('authorization') || '').replace(/^Bearer /i, '');
    if (!equals(bearer, token)) return json({ error: { message: 'Unauthorized' } }, 401);
    const maxBytes = 65536;
    const raw = await request.text();
    if (Buffer.byteLength(raw) > maxBytes) return json({ error: { message: 'Request too large' } }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: { message: 'Invalid JSON' } }, 400); }
    const model = body?.model || 'gemini-3.5-flash-lite';
    if (model !== 'gemini-3.5-flash-lite') return json({ error: { message: 'Only configured free-tier model is allowed' } }, 400);
    if (body?.stream === true) return json({ error: { message: 'Streaming is not implemented' } }, 400);
    if (!Array.isArray(body?.messages) || !body.messages.length || body.messages.length > 40) return json({ error: { message: 'Invalid messages' } }, 400);
    if (body.messages.some(m => !['system','user','assistant'].includes(m?.role) || typeof m.content !== 'string')) return json({ error: { message: 'Text-only messages supported' } }, 400);
    const systemInstruction = body.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const contents = body.messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    if (!contents.length) return json({ error: { message: 'User or assistant message required' } }, 400);
    const payload = { contents, ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}), generationConfig: { maxOutputTokens: Math.min(Math.max(Number(body.max_tokens) || 512, 1), 2048), ...(typeof body.temperature === 'number' ? { temperature: Math.min(Math.max(body.temperature, 0), 2) } : {}) } };
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
      if (!response.ok) return json({ error: { message: response.status === 429 ? 'Provider quota exceeded' : 'Provider request failed', type: 'provider_error' } }, response.status === 429 ? 429 : 502);
      const result = await response.json();
      const content = (result.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      return json({ id: 'chatcmpl-gemini', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: result.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? 'length' : 'stop' }], usage: { prompt_tokens: result.usageMetadata?.promptTokenCount || 0, completion_tokens: result.usageMetadata?.candidatesTokenCount || 0, total_tokens: result.usageMetadata?.totalTokenCount || 0 } });
    } catch { return json({ error: { message: 'Provider unavailable or timed out' } }, 502); }
  }
};