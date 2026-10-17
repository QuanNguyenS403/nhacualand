const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('=== 1. Counting Hotline Occurrences (0981753082 / 0981 753 082) ===');
function walk(dir) {
  let res = [];
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) return res;
  for (const f of fs.readdirSync(full)) {
    const p = path.join(full, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.git', 'docs'].includes(f)) {
        res = res.concat(walk(path.join(dir, f)));
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.json') || f.endsWith('.bat') || f.endsWith('.env.example')) {
      res.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return res;
}

const files = walk('apps').concat(walk('packages')).concat(['.env.example', 'chay-website-local.bat']);
const hotlineMatches = [];
for (const rel of files) {
  const p = path.join(repoRoot, rel);
  if (!fs.existsSync(p)) continue;
  const code = fs.readFileSync(p, 'utf8');
  if (code.includes('0981753082') || code.includes('0981 753 082') || code.includes('0981.753.082')) {
    const lines = code.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('0981753082') || l.includes('0981 753 082') || l.includes('0981.753.082')) {
        hotlineMatches.push({ file: rel, line: idx + 1, snippet: l.trim().slice(0, 100) });
      }
    });
  }
}
console.log(`Hotline occurrences: ${hotlineMatches.length}`);
console.table(hotlineMatches);

console.log('\n=== 2. Counting Brand Occurrences: nhacualand vs QNS BROKER ===');
let nhacualandCount = 0;
let qnsBrokerCount = 0;
let qnsOnlyCount = 0;

for (const rel of files) {
  const p = path.join(repoRoot, rel);
  if (!fs.existsSync(p)) continue;
  const code = fs.readFileSync(p, 'utf8');
  const m1 = code.match(/nhacualand/gi);
  if (m1) nhacualandCount += m1.length;
  const m2 = code.match(/qns\s+broker/gi);
  if (m2) qnsBrokerCount += m2.length;
  const m3 = code.match(/\bqns\b/gi);
  if (m3) qnsOnlyCount += m3.length;
}
console.log(`"nhacualand" occurrences: ${nhacualandCount}`);
console.log(`"QNS BROKER" occurrences: ${qnsBrokerCount}`);
console.log(`"QNS" standalone occurrences: ${qnsOnlyCount}`);

console.log('\n=== 3. Checking viewings.service.ts for Hardcoded Phone User Creation ===');
const viewingsPath = path.join(repoRoot, 'apps/api/src/modules/viewings/viewings.service.ts');
if (fs.existsSync(viewingsPath)) {
  const code = fs.readFileSync(viewingsPath, 'utf8');
  lines = code.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('phone') && (l.includes('create') || l.includes('findOrCreate') || l.includes('user.create'))) {
      console.log(`viewings.service.ts:${idx + 1}: ${l.trim()}`);
    }
  });
}
