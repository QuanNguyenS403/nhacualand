const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

function walk(dir) {
  let res = [];
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) return res;
  for (const f of fs.readdirSync(full)) {
    const p = path.join(full, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.git'].includes(f)) {
        res = res.concat(walk(path.join(dir, f)));
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      res.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return res;
}

console.log('=== 1. Checking Duplicated Constants / Functions in apps/web ===');
const webFiles = walk('apps/web/src');
const duplicates = [];

for (const rel of webFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  if (code.includes('const PROPERTY_TYPES =') || code.includes('export const PROPERTY_TYPES =')) {
    duplicates.push({ file: rel, issue: 'PROPERTY_TYPES redefined locally instead of @qns/shared' });
  }
  if ((code.includes('function formatPrice(') || code.includes('const formatPrice =')) && !code.includes('@qns/shared')) {
    duplicates.push({ file: rel, issue: 'formatPrice re-implemented locally instead of importing @qns/shared' });
  }
  if ((code.includes('function buildSlug(') || code.includes('const buildSlug =')) && !code.includes('@qns/shared')) {
    duplicates.push({ file: rel, issue: 'buildSlug re-implemented locally instead of importing @qns/shared' });
  }
  if (code.includes('const LISTING_STATUS =') && !rel.includes('shared')) {
    duplicates.push({ file: rel, issue: 'LISTING_STATUS redefined locally' });
  }
}
console.table(duplicates);

console.log('=== 2. Checking tsconfig strictness & any usage ===');
const tsconfigs = [
  'tsconfig.json',
  'apps/api/tsconfig.json',
  'apps/web/tsconfig.json',
  'packages/database/tsconfig.json',
  'packages/shared/tsconfig.json'
];

for (const tc of tsconfigs) {
  const tcPath = path.join(repoRoot, tc);
  if (fs.existsSync(tcPath)) {
    const content = fs.readFileSync(tcPath, 'utf8');
    const hasStrict = content.includes('"strict": true');
    const noImplicitAny = content.includes('"noImplicitAny": true');
    console.log(`${tc}: strict=${hasStrict}, noImplicitAny=${noImplicitAny}`);
  }
}

// Count : any in api and web
let anyApiCount = 0;
const apiFiles = walk('apps/api/src');
for (const rel of apiFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  const matches = code.match(/:\s*any\b/g);
  if (matches) anyApiCount += matches.length;
}

let anyWebCount = 0;
for (const rel of webFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  const matches = code.match(/:\s*any\b/g);
  if (matches) anyWebCount += matches.length;
}

console.log(`Any count in apps/api: ${anyApiCount}`);
console.log(`Any count in apps/web: ${anyWebCount}`);
