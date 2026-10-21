export default async function handler(req: any, res: any) {
  try {
    // @ts-ignore
    const mod = await import('./server.bundle.js');
    res.status(200).json({ status: 'server imported successfully', hasDefault: !!mod.default });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to import server',
      message: err?.message || String(err),
      stack: err?.stack || ''
    });
  }
}
