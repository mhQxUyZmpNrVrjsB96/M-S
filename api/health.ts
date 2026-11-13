export default function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  return res.status(200).json({ 
    status: 'ok', 
    version: '2.0.0-with-ai-invoice-scanner',
    cloud: 'supabase-realtime-enabled',
    timestamp: new Date().toISOString()
  });
}
