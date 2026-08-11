/**
 * Vercel Serverless Function: GET/POST /api/data
 * 数据存储：Upstash Redis（REST API，无需 SDK）
 *
 * 环境变量（由 Upstash Marketplace 自动注入）：
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const KEY = 'mandarin_data';

  if (!url || !token) {
    res.status(500).json({
      code: -1,
      message: 'Upstash not configured. Please connect Upstash Redis in Vercel Storage.'
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      // GET key
      const r = await fetch(`${url}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      // Upstash 返回格式: { result: "<base64-encoded-json>" } 或 null
      let data = null;
      if (j.result) {
        try { data = JSON.parse(j.result); } catch (e) { data = null; }
      }
      res.status(200).json({ code: 0, data });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      if (!body || !body.questions) {
        res.status(400).json({ code: -1, message: 'invalid data' });
        return;
      }
      // SET key
      const value = JSON.stringify(body);
      const r = await fetch(`${url}/set/${KEY}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([value]),
      });
      await r.json();
      res.status(200).json({ code: 0, success: true });
      return;
    }

    res.status(405).json({ code: -1, message: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message });
  }
};