import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { CopilotClient, RuntimeConnection } from '@github/copilot-sdk';

const port = Number(process.env.PORT || 3000);
const secret = process.env.COPILOT_PROBE_SECRET;
const githubToken = process.env.COPILOT_GITHUB_TOKEN;
const allow = (value) => {
  if (!secret || !value) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
};
const reply = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') return reply(res, 200, { status: 'ready', runtime: 'not-tested' });
  if (req.url !== '/probe' || req.method !== 'POST') return reply(res, 404, { error: 'not_found' });
  if (!allow(req.headers.authorization?.replace(/^Bearer\s+/i, ''))) return reply(res, 401, { error: 'unauthorized' });
  if (!githubToken) return reply(res, 503, { error: 'copilot_auth_not_configured' });
  let client;
  try {
    client = new CopilotClient({
      connection: RuntimeConnection.forInProcess(),
      gitHubToken: githubToken,
      useLoggedInUser: false,
    });
    await client.start();
    const session = await client.createSession({ model: 'auto' });
    const result = await session.sendAndWait({ prompt: 'Responde exactamente: COPILOT_PROBE_OK' }, 60000);
    return reply(res, 200, { status: 'completed', output: result?.data?.content ?? null });
  } catch (error) {
    console.error('copilot_probe_failed', error?.message);
    return reply(res, 502, { error: 'copilot_probe_failed', detail: String(error?.message || 'unknown').slice(0, 200) });
  } finally {
    if (client) try { await client.stop(); } catch (error) { console.error('copilot_stop_failed', error?.message); }
  }
});
server.listen(port, '0.0.0.0', () => console.log('Copilot probe listening on port', port));
