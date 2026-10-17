const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('=== 1. Checking 40% Commission occurrences ===');
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
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.md')) {
      res.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return res;
}

const allCodeFiles = walk('apps').concat(walk('packages'));
const fee40Matches = [];
for (const rel of allCodeFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  if (code.includes('40%') || code.includes('0.4') || code.includes('phi_thanh_cong_40')) {
    const lines = code.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('40%') || l.includes('phi_thanh_cong') || l.includes('0.40') || l.includes('40 %')) {
        fee40Matches.push({ file: rel, line: idx + 1, snippet: l.trim().slice(0, 100) });
      }
    });
  }
}
console.log(`40% fee occurrences: ${fee40Matches.length}`);
console.table(fee40Matches.slice(0, 15));

console.log('\n=== 2. Checking Buy/Sell Routes (/mua-ban, /du-an, /gia-nha-dat) ===');
const buySellRoutes = [
  'apps/web/src/app/mua-ban/page.tsx',
  'apps/web/src/app/du-an/page.tsx',
  'apps/web/src/app/gia-nha-dat/page.tsx'
];
for (const r of buySellRoutes) {
  const p = path.join(repoRoot, r);
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    console.log(`${r}: exists (${c.split('\n').length} lines). Title/Notice:`);
    const titleMatch = c.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (titleMatch) console.log(`   H1: ${titleMatch[1].trim()}`);
  }
}

console.log('\n=== 3. Checking Membership Routes (/gia-thanh-vien, /admin/duyet-goi) ===');
const memberRoutes = [
  'apps/web/src/app/gia-thanh-vien/page.tsx',
  'apps/web/src/app/admin/duyet-goi/page.tsx',
  'apps/web/src/app/admin/mua-cao-diem/page.tsx'
];
for (const r of memberRoutes) {
  const p = path.join(repoRoot, r);
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    console.log(`${r}: exists (${c.split('\n').length} lines)`);
  }
}

console.log('\n=== 4. Checking Header Links for Buy/Sell and Membership ===');
const headerPath = path.join(repoRoot, 'apps/web/src/components/Header.tsx');
if (fs.existsSync(headerPath)) {
  const c = fs.readFileSync(headerPath, 'utf8');
  console.log('Header has /mua-ban:', c.includes('/mua-ban'));
  console.log('Header has /du-an:', c.includes('/du-an'));
  console.log('Header has /gia-nha-dat:', c.includes('/gia-nha-dat'));
  console.log('Header has /gia-thanh-vien:', c.includes('/gia-thanh-vien'));
}
