/**
 * Verify a deployed Strapi instance (Railway/staging).
 *
 * Usage:
 *   node scripts/verify-railway-deploy.js https://your-app.railway.app
 */

'use strict';

const { setTimeout: sleep } = require('timers/promises');

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { ok: res.ok, status: res.status, text, json };
}

function assert(cond, msg) {
  if (!cond) {
    const err = new Error(msg);
    err.isAssertion = true;
    throw err;
  }
}

async function main() {
  const base = (process.argv[2] || '').trim().replace(/\/+$/, '');
  if (!base) {
    console.error('Missing base URL. Example: node scripts/verify-railway-deploy.js https://your-app.railway.app');
    process.exit(1);
  }

  const endpoints = [
    { name: 'Quiz health', url: `${base}/api/quiz/health` },
    { name: 'General health', url: `${base}/api/health` },
  ];

  console.log(`🔎 Verifying deployment: ${base}`);

  // Railway can take a few seconds after deploy; do a short retry loop.
  for (const ep of endpoints) {
    let last;
    for (let i = 0; i < 5; i++) {
      last = await fetchJson(ep.url);
      if (last.status !== 502 && last.status !== 503 && last.status !== 504) break;
      await sleep(1000);
    }

    console.log(`\n- ${ep.name}: ${ep.url}`);
    console.log(`  status: ${last.status}`);
    assert(last.ok, `Failed ${ep.name} (${last.status}). Body: ${last.text?.slice(0, 500)}`);
    if (last.json) {
      console.log(`  json: ${JSON.stringify(last.json).slice(0, 500)}`);
    }
  }

  console.log('\n✅ Deployment looks healthy.');
}

main().catch(err => {
  console.error('\n❌ Verification failed.');
  console.error(err?.stack || String(err));
  process.exit(1);
});

