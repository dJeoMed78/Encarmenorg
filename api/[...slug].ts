// @ts-ignore
import app from './server.bundle.js';

export default function handler(req: any, res: any) {
  try {
    // In Vercel serverless, req.url may be /businesses/123 or /?slug=...
    // Express expects the full path starting with /api/
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Catch-All Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Serverless Handler Exception', message: err?.message || String(err) });
    }
  }
}

