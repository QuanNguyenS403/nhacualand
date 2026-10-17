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
    } else if (f.endsWith('page.tsx') || f.endsWith('layout.tsx')) {
      res.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return res;
}

console.log('=== Checking Dot (.) at the end of metadata titles and descriptions ===');
const pages = walk('apps/web/src/app');
const dotViolations = [];
for (const p of pages) {
  const code = fs.readFileSync(path.join(repoRoot, p), 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, idx) => {
    const m = l.match(/(title|description)\s*:\s*['"]([^'"]+)['"]/);
    if (m) {
      const val = m[2].trim();
      if (val.endsWith('.')) {
        dotViolations.push({ file: p, line: idx + 1, key: m[1], val });
      }
    }
  });
}
console.log(`Dot violations found: ${dotViolations.length}`);
console.table(dotViolations);
