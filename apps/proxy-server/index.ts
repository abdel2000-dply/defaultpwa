const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
import type { Request, Response } from 'express';

const app = express();
const PORT = 8182;

app.use(cors());
app.use(express.json());

app.use('/', async (req: Request, res: Response) => {
  const targetUrl = `https://l2e9r36f5zp2.c01-14.plentymarkets.com${req.url}`; // ✅ keeps /rest/xx/yy
  console.log('[PROXY] Forwarding to:', targetUrl);

  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') normalizedHeaders[key] = value;
    else if (Array.isArray(value)) normalizedHeaders[key] = value.join(',');
  }
  delete normalizedHeaders.host;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: normalizedHeaders,
      body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : JSON.stringify(req.body)
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('[PROXY] Error:', error);
    res.status(500).send({ error: 'Proxy failed', detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[PROXY] Server running on http://localhost:${PORT}`);
});
