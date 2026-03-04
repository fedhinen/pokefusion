import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { config } from 'dotenv';
import { WorkerAiResponse } from './types/Cloudflare';

config();

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

app.post('/api/fuse', async (req, res) => {
  const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '';
  const authToken = process.env['CLOUDFLARE_AUTH_TOKEN'] ?? '';

  if (!accountId || !authToken) {
    res.status(500).json({ error: 'Server credentials not configured.' });
    return;
  }

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/ibm-granite/granite-4.0-h-micro`;

  try {
    const cloudflareResponse = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...req.body, max_tokens: 1024 }),
    });

    if (!cloudflareResponse.ok) {
      const text = await cloudflareResponse.text();
      res.status(cloudflareResponse.status).json({ error: text });
      return;
    }

    const data = await cloudflareResponse.json() as WorkerAiResponse;

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: message });
  }
});

// ─── API proxy: POST /api/generate-image ─────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '';
  const authToken = process.env['CLOUDFLARE_AUTH_TOKEN'] ?? '';

  if (!accountId || !authToken) {
    res.status(500).json({ error: 'Server credentials not configured.' });
    return;
  }

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/leonardo/phoenix-1.0`;

  try {
    const cloudflareResponse = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!cloudflareResponse.ok) {
      const text = await cloudflareResponse.text();
      res.status(cloudflareResponse.status).json({ error: text });
      return;
    }

    const contentType = cloudflareResponse.headers.get('content-type') ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const buffer = await cloudflareResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: message });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
