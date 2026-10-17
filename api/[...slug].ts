import app from '../server';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Catch-All Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Serverless Handler Exception', message: err?.message || String(err) });
    }
  }
}
