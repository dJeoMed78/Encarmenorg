import app from '../server';

export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Serverless Handler Exception', message: err?.message || String(err) });
    }
  }
}

