const { Redis } = require('@upstash/redis');
const RATE_LIMIT_INTERVAL = 60 * 1000;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    console.log('[CORS] Preflight request received.');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.warn('[ERROR] Method Not Allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const key = `rate_limit:${ip}`;
  const now = Date.now();

  try {
    console.log('[IP] Request from IP:', ip);

    const lastTs = await redis.get(key);
    console.log('[Redis] Last timestamp for', ip, ':', lastTs);

    if (lastTs) {
      const elapsed = now - parseInt(lastTs, 10);
      if (elapsed < RATE_LIMIT_INTERVAL) {
        const waitTime = Math.ceil((RATE_LIMIT_INTERVAL - elapsed) / 1000);
        console.log(`[RATE LIMIT] Blocked. Wait ${waitTime}s more.`);
        res.setHeader('Retry-After', waitTime);
        return res.status(429).json({ error: `Tunggu ${waitTime} detik sebelum mencoba lagi.` });
      }
    }

    await redis.set(key, now.toString(), {
      ex: Math.ceil(RATE_LIMIT_INTERVAL / 1000),
    });
    console.log('[Redis] Rate limit key set for IP:', ip);

    const payload = req.body;
    console.log('[Payload] Received:', payload);

    const PaykuClient = require('../utils/payku');
    const payku = new PaykuClient({
      apiKey: process.env.PAYKU_API_KEY,
      secretKey: process.env.PAYKU_SECRET_KEY,
    });

    const result = await payku.createTransaction(payload);
    console.log('[Payku] Transaction result:', result);

    return res.status(200).json(result);

  } catch (error) {
    const status = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    console.error('[ERROR]', message, error);
    return res.status(status).json({ error: message });
  }
};