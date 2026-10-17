const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('=== 1. Checking demo-data.ts usage in apps/web ===');
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

const webFiles = walk('apps/web/src');
const demoImports = [];
for (const rel of webFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  if (code.includes('demo-data') || code.includes('DEMO_LISTINGS') || code.includes('FEATURED_LISTINGS')) {
    demoImports.push(rel);
  }
}
console.log('Files importing demo-data:');
console.table(demoImports);

console.log('\n=== 2. Checking Unsplash image links in apps/web ===');
let unsplashCount = 0;
const unsplashFiles = [];
for (const rel of webFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  if (code.includes('images.unsplash.com')) {
    const matches = code.match(/images\.unsplash\.com/g);
    unsplashCount += matches.length;
    unsplashFiles.push({ file: rel, count: matches.length });
  }
}
console.log(`Total Unsplash occurrences: ${unsplashCount}`);
console.table(unsplashFiles);

console.log('\n=== 3. Checking Error Boundaries and 404 Pages ===');
const appFiles = fs.readdirSync(path.join(repoRoot, 'apps/web/src/app'));
console.log('Has not-found.tsx:', appFiles.includes('not-found.tsx'));
console.log('Has error.tsx:', appFiles.includes('error.tsx'));
console.log('Has loading.tsx:', appFiles.includes('loading.tsx'));

console.log('\n=== 4. Checking /qnsbroker/admin/page.tsx ===');
const oldAdminPath = path.join(repoRoot, 'apps/web/src/app/qnsbroker/admin/page.tsx');
if (fs.existsSync(oldAdminPath)) {
  const c = fs.readFileSync(oldAdminPath, 'utf8');
  console.log('Content of /qnsbroker/admin/page.tsx:');
  console.log(c.trim());
}
