const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('=== Checking Cloudflare Tunnel Tokens in .bat files ===');
const batFiles = ['chay-website-va-tunnel.bat', 'chay-cloudflare-tunnel.bat', 'cai-dat-cloudflare-service.bat'];
for (const bf of batFiles) {
  const p = path.join(repoRoot, bf);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const m = line.match(/--token\s+([A-Za-z0-9._-]+)/);
      if (m) {
        console.log(`SECRET: Cloudflare Tunnel Token found in ${bf}:${idx + 1}, type: JWT_TUNNEL_TOKEN, length: ${m[1].length} chars`);
      }
    });
  }
}

console.log('\n=== Checking Git history for large binaries or secrets ===');
const { execSync } = require('child_process');
try {
  const gitLog = execSync('git log --all --name-only --oneline', { cwd: repoRoot }).toString();
  if (gitLog.includes('cloudflared.exe')) {
    console.log('ALERT: cloudflared.exe was committed in git history!');
  }
} catch (e) {
  console.log('Git log check error:', e.message);
}
