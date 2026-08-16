'use strict';

// Submits every URL in sitemap.xml to IndexNow so participating search
// engines (Bing, Yandex, Seznam.cz, Naver, Yep) recrawl fresh/changed
// pages without waiting for their next organic crawl pass.
//
// The IndexNow key is not a secret — it is published at
// https://<host>/<key>.txt by design so engines can verify ownership.
// Override via INDEXNOW_KEY / SITE_DOMAIN env vars if the key ever rotates.
//
// Uses Node's built-in https module (not fetch/undici) so the process
// exits cleanly without lingering keep-alive sockets.

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

const HOST = process.env.SITE_DOMAIN || 'asia888.cc';
const KEY = process.env.INDEXNOW_KEY || 'dbf3425e86c7190a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const ENDPOINTS = [
  'https://api.indexnow.org/indexnow', // aggregator: fans out to all participating engines
  'https://www.bing.com/indexnow', // direct submission, kept for redundancy
];

function extractUrls(xml) {
  const matches = xml.match(/<loc>([\s\S]*?)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, '').trim()).filter(Boolean);
}

function submit(urlList, endpointUrl) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname } = new URL(endpointUrl);
    const payload = Buffer.from(JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }));

    const req = https.request({
      hostname,
      path: pathname,
      method: 'POST',
      agent: false, // no keep-alive pooling — socket closes as soon as the response ends
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': payload.length,
        Connection: 'close',
      },
    }, (res) => {
      res.resume(); // drain body, we only need the status
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.log('sitemap.xml not found — skipping IndexNow submission.');
    return;
  }

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urlList = extractUrls(xml);

  if (urlList.length === 0) {
    console.log('No URLs found in sitemap.xml — skipping IndexNow submission.');
    return;
  }

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow for host "${HOST}"...`);

  for (const endpoint of ENDPOINTS) {
    try {
      const status = await submit(urlList, endpoint);
      console.log(`  ${endpoint} -> ${status}`);
    } catch (err) {
      console.warn(`  ${endpoint} -> failed: ${err.message}`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
