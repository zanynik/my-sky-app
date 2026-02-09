#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_VECTORS = path.join('feed', 'notes_vectors.json');
const DEFAULT_OUT = path.join('feed', 'youtube_feed.json');
const DEFAULT_THRESHOLD = 0.75;

function parseArgs(argv) {
  const args = { vectors: DEFAULT_VECTORS, out: DEFAULT_OUT, threshold: DEFAULT_THRESHOLD, maxResults: 25 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--vectors' && argv[i + 1]) args.vectors = argv[++i];
    else if (a === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (a === '--threshold' && argv[i + 1]) args.threshold = Number(argv[++i]);
    else if (a === '--maxResults' && argv[i + 1]) args.maxResults = Number(argv[++i]);
  }
  return args;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1);
}

function vectorizeText(text, vocabSet, idf) {
  const tf = new Map();
  for (const t of tokenize(text)) {
    if (!vocabSet.has(t)) continue;
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const vec = {};
  for (const [term, count] of tf.entries()) {
    const weight = count * (idf[term] || 0);
    if (weight) vec[term] = weight;
  }
  normalize(vec);
  return vec;
}

function normalize(vec) {
  let sum = 0;
  for (const v of Object.values(vec)) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  for (const k of Object.keys(vec)) vec[k] = vec[k] / norm;
}

function cosine(a, b) {
  let sum = 0;
  for (const k of Object.keys(a)) {
    if (b[k]) sum += a[k] * b[k];
  }
  return sum;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const { vectors, out, threshold, maxResults } = parseArgs(process.argv);
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY in environment.');
    process.exit(1);
  }

  const vectorsPath = path.resolve(vectors);
  if (!fs.existsSync(vectorsPath)) {
    console.error(`Vectors file not found: ${vectorsPath}`);
    process.exit(1);
  }

  const notes = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));
  const centroid = notes.centroid || {};
  const vocab = notes.vocab || [];
  const idf = notes.idf || {};
  const vocabSet = new Set(vocab);

  const topTerms = Object.entries(centroid)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
  const query = topTerms.join(' ');

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const data = await httpGetJson(url.toString());
  const items = Array.isArray(data.items) ? data.items : [];

  const scored = items.map(item => {
    const snippet = item.snippet || {};
    const text = `${snippet.title || ''} ${snippet.description || ''}`;
    const vec = vectorizeText(text, vocabSet, idf);
    const score = cosine(centroid, vec);
    return {
      videoId: item.id && item.id.videoId ? item.id.videoId : null,
      title: snippet.title || '',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      publishedAt: snippet.publishedAt || '',
      thumbnails: snippet.thumbnails || {},
      thumbnail: (snippet.thumbnails && (snippet.thumbnails.medium || snippet.thumbnails.default)) || null,
      score
    };
  }).filter(v => v.videoId);

  let thresholdUsed = threshold;
  let results = scored.filter(v => v.score >= thresholdUsed);
  if (results.length === 0) {
    thresholdUsed = Math.max(0.6, threshold - 0.15);
    results = scored.filter(v => v.score >= thresholdUsed);
  }
  results.sort((a, b) => b.score - a.score);

  const output = {
    generatedAt: new Date().toISOString(),
    queryTerms: topTerms,
    threshold,
    thresholdUsed,
    totalFetched: scored.length,
    results: results.map(v => ({
      ...v,
      watchUrl: `https://www.youtube.com/watch?v=${v.videoId}`
    }))
  };

  const outPath = path.resolve(out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${results.length} results to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
