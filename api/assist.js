// Vercel serverless function: POST /api/assist. All logic lives in server/assist-core.js (unit-tested); this only adapts req/res.
import {handleAssist} from '../server/assist-core.js';

export default async function handler(req, res) {
  const r = await handleAssist({method: req.method, headers: req.headers, body: req.body, env: process.env, fetchImpl: fetch});
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.status(r.status).end(JSON.stringify(r.json));
}
