#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_VOCAB = 5000;
const DEFAULT_OUT = path.join('feed', 'notes_vectors.json');

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','when','while','for','to','of','in','on','at','by','with',
  'as','is','are','was','were','be','been','being','it','this','that','these','those','i','you','he','she','they',
  'we','me','my','your','yours','his','her','their','ours','from','into','out','up','down','over','under','again',
  'further','here','there','all','any','both','each','few','more','most','other','some','such','no','nor','not',
  'only','own','same','so','than','too','very','can','will','just','don','should','now'
]);

function parseArgs(argv) {
  const args = { source: null, out: DEFAULT_OUT, maxVocab: DEFAULT_MAX_VOCAB };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source' && argv[i + 1]) args.source = argv[++i];
    else if (a === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (a === '--maxVocab' && argv[i + 1]) args.maxVocab = Number(argv[++i]);
  }
  return args;
}

function isTextFile(p) {
  const ext = path.extname(p).toLowerCase();
  return ['.md', '.markdown', '.mdx', '.txt'].includes(ext);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.isFile() && isTextFile(full)) files.push(full);
  }
  return files;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function extractTitle(text, fallback) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0] ? lines[0].slice(0, 120) : fallback;
}

function buildTf(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function normalizeVec(vec) {
  let sum = 0;
  for (const v of Object.values(vec)) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  for (const k of Object.keys(vec)) vec[k] = vec[k] / norm;
  return norm;
}

function main() {
  const { source, out, maxVocab } = parseArgs(process.argv);
  if (!source) {
    console.error('Usage: node utilities/vectorize_notes.js --source "/path/to/notes" [--out feed/notes_vectors.json] [--maxVocab 5000]');
    process.exit(1);
  }
  const absSource = path.resolve(source);
  if (!fs.existsSync(absSource)) {
    console.error(`Source path not found: ${absSource}`);
    process.exit(1);
  }

  const files = walk(absSource);
  if (files.length === 0) {
    console.error('No note files found.');
    process.exit(1);
  }

  const docs = [];
  const df = new Map();
  const tfByDoc = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const tokens = tokenize(raw);
    if (tokens.length === 0) continue;
    const tf = buildTf(tokens);
    tfByDoc.push(tf);
    for (const term of new Set(tokens)) df.set(term, (df.get(term) || 0) + 1);
    docs.push({
      path: file,
      title: extractTitle(raw, path.basename(file)),
      preview: raw.slice(0, 200).replace(/\s+/g, ' ').trim()
    });
  }

  const N = tfByDoc.length;
  const idf = {};
  for (const [term, dcount] of df.entries()) {
    idf[term] = Math.log((N + 1) / (dcount + 1)) + 1;
  }

  const globalWeights = new Map();
  const rawVectors = [];
  for (const tf of tfByDoc) {
    const vec = {};
    for (const [term, count] of tf.entries()) {
      const weight = count * (idf[term] || 0);
      vec[term] = weight;
      globalWeights.set(term, (globalWeights.get(term) || 0) + weight);
    }
    rawVectors.push(vec);
  }

  const vocab = Array.from(globalWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxVocab)
    .map(([term]) => term);
  const vocabSet = new Set(vocab);

  const centroid = {};
  const outDocs = [];
  for (let i = 0; i < rawVectors.length; i++) {
    const vec = {};
    for (const term of Object.keys(rawVectors[i])) {
      if (!vocabSet.has(term)) continue;
      vec[term] = rawVectors[i][term];
    }
    normalizeVec(vec);
    for (const [t, v] of Object.entries(vec)) centroid[t] = (centroid[t] || 0) + v;
    outDocs.push({
      id: `doc_${i + 1}`,
      path: docs[i].path,
      title: docs[i].title,
      preview: docs[i].preview,
      vector: vec
    });
  }
  normalizeVec(centroid);

  const output = {
    generatedAt: new Date().toISOString(),
    sourceDir: absSource,
    docCount: outDocs.length,
    vocab,
    idf,
    centroid,
    docs: outDocs
  };

  const outPath = path.resolve(out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${outDocs.length} vectors to ${outPath}`);
}

main();
