const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('=== 1. Checking main.ts (Helmet, CORS, ValidationPipe, Trust Proxy) ===');
const mainTsPath = path.join(repoRoot, 'apps/api/src/main.ts');
if (fs.existsSync(mainTsPath)) {
  const code = fs.readFileSync(mainTsPath, 'utf8');
  console.log('Has helmet:', code.includes('helmet'));
  console.log('Has ValidationPipe:', code.includes('ValidationPipe'));
  console.log('ValidationPipe whitelist:', code.includes('whitelist: true'));
  console.log('ValidationPipe forbidNonWhitelisted:', code.includes('forbidNonWhitelisted: true'));
  console.log('Has trust proxy:', code.includes('trust proxy'));
  console.log('CORS setup:', code.includes('enableCors'));
}

console.log('\n=== 2. Checking JWT Secrets & Fallbacks in auth.service.ts & jwt.strategy.ts ===');
const authServicePath = path.join(repoRoot, 'apps/api/src/modules/auth/auth.service.ts');
if (fs.existsSync(authServicePath)) {
  const code = fs.readFileSync(authServicePath, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('JWT_ACCESS_SECRET') || l.includes('JWT_REFRESH_SECRET') || l.includes('secret:') || l.includes('secretOrKey:')) {
      console.log(`auth.service.ts:${idx + 1}: ${l.trim()}`);
    }
  });
}

const jwtStrategyPath = path.join(repoRoot, 'apps/api/src/modules/auth/strategies/jwt.strategy.ts');
if (fs.existsSync(jwtStrategyPath)) {
  const code = fs.readFileSync(jwtStrategyPath, 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('secretOrKey') || l.includes('JWT_ACCESS_SECRET')) {
      console.log(`jwt.strategy.ts:${idx + 1}: ${l.trim()}`);
    }
  });
}

console.log('\n=== 3. Checking HTML Injection in email.service.ts ===');
const emailServicePath = path.join(repoRoot, 'apps/api/src/modules/email/email.service.ts');
if (fs.existsSync(emailServicePath)) {
  const code = fs.readFileSync(emailServicePath, 'utf8');
  const hasEscape = code.includes('escapeHtml') || code.includes('sanitizeHtml');
  console.log('email.service.ts has escape/sanitize function:', hasEscape);
  const interpolations = [...code.matchAll(/\$\{([^}]+)\}/g)].map(m => m[1]);
  console.log('Sample interpolations in email HTML:', interpolations.slice(0, 10));
}

console.log('\n=== 4. Checking dangerouslySetInnerHTML in apps/web ===');
function walk(dir) {
  let res = [];
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) return res;
  for (const f of fs.readdirSync(full)) {
    const p = path.join(full, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(f)) res = res.concat(walk(path.join(dir, f)));
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      res.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  return res;
}

const webFiles = walk('apps/web/src');
for (const rel of webFiles) {
  const code = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  if (code.includes('dangerouslySetInnerHTML')) {
    console.log(`dangerouslySetInnerHTML found in: ${rel}`);
  }
}

console.log('\n=== 5. Checking Client Token Storage in auth-client.ts ===');
const authClientPath = path.join(repoRoot, 'apps/web/src/lib/auth-client.ts');
if (fs.existsSync(authClientPath)) {
  const code = fs.readFileSync(authClientPath, 'utf8');
  console.log('Uses localStorage:', code.includes('localStorage'));
  console.log('Uses document.cookie:', code.includes('document.cookie'));
}

console.log('\n=== 6. Checking Upload Image Handlers ===');
const uploadRoute = path.join(repoRoot, 'apps/web/src/app/api/upload-images/route.ts');
if (fs.existsSync(uploadRoute)) {
  const code = fs.readFileSync(uploadRoute, 'utf8');
  console.log('upload-images route: checks auth:', code.includes('auth') || code.includes('token') || code.includes('session'));
  console.log('upload-images route: checks mime/extension:', code.includes('type') || code.includes('image/'));
  console.log('upload-images route: size limit check:', code.includes('size') || code.includes('10 * 1024 * 1024') || code.includes('5 * 1024 * 1024'));
}
