const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tìm đường dẫn thực tế của binary next để chạy trực tiếp qua Node.js — loại bỏ overhead của npx và shell
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next');
} catch {
  nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
}

// Tự động bảo vệ Next.js Dev Overlay khỏi lỗi ngoại lai của tiện ích mở rộng trình duyệt (Chrome/Firefox/Safari Extensions)
function patchNextDevOverlayForBrowserExtensions() {
  try {
    const nextDistDir = path.resolve(path.dirname(nextBin), '..');
    const targets = [
      path.join(nextDistDir, 'client', 'components', 'react-dev-overlay', 'internal', 'helpers', 'use-error-handler.js'),
      path.join(nextDistDir, 'esm', 'client', 'components', 'react-dev-overlay', 'internal', 'helpers', 'use-error-handler.js'),
    ];
    const helperFn = `function isBrowserExtensionError(err, ev) {
    try {
        const filename = ev && ev.filename ? String(ev.filename) : "";
        const message = err && err.message ? String(err.message) : ev && ev.message ? String(ev.message) : "";
        const stack = err && err.stack ? String(err.stack) : "";
        const combined = filename + "\\n" + message + "\\n" + stack;
        return (
            combined.includes("chrome-extension://") ||
            combined.includes("moz-extension://") ||
            combined.includes("safari-extension://") ||
            combined.includes("safari-web-extension://") ||
            combined.includes("eppiocemhmnlbhjplcgkofciiegomcon") ||
            combined.includes("executors/200.js") ||
            combined.includes("reading 'M_ID'")
        );
    } catch (_) {
        return false;
    }
}`;
    for (const file of targets) {
      if (!fs.existsSync(file)) continue;
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('isBrowserExtensionError')) continue;
      content = content.replace(
        'const rejectionHandlers = [];',
        `const rejectionHandlers = [];\n${helperFn}`
      );
      content = content.replace(
        'if ((0, _isnextroutererror.isNextRouterError)(ev.error)) {',
        'if ((0, _isnextroutererror.isNextRouterError)(ev.error) || isBrowserExtensionError(ev == null ? void 0 : ev.error, ev)) {'
      );
      content = content.replace(
        'if (isNextRouterError(ev.error)) {',
        'if (isNextRouterError(ev.error) || isBrowserExtensionError(ev == null ? void 0 : ev.error, ev)) {'
      );
      content = content.replace(
        'const reason = ev == null ? void 0 : ev.reason;\n        if (!reason',
        'const reason = ev == null ? void 0 : ev.reason;\n        if (isBrowserExtensionError(reason, ev)) {\n            ev.preventDefault();\n            return;\n        }\n        if (!reason'
      );
      fs.writeFileSync(file, content, 'utf8');
    }
  } catch (_) {}
}

patchNextDevOverlayForBrowserExtensions();

// Khởi chạy Next.js với Turbopack (--turbo) bằng chính tiến trình Node hiện tại
const child = spawn(process.execPath, [nextBin, 'dev', '--turbo'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

let browserOpened = false;

function openBrowser(url) {
  if (browserOpened) return;
  browserOpened = true;
  console.log(`\n🚀 Đang tự động mở trình duyệt tới ${url}...`);

  const startCmd = process.platform === 'win32'
    ? `powershell -NoProfile -Command "Start-Process '${url}'"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err && process.platform === 'win32') {
      exec(`start "" "${url}"`);
    }
  });
}

function handleOutput(data) {
  const text = data.toString();
  process.stdout.write(text);

  // Bắt chuỗi địa chỉ URL khi dev server sẵn sàng (VD: - Local: http://localhost:3000 hoặc http://localhost:3001)
  const match = text.match(/Local:\s+(https?:\/\/[^\s]+)/i) || text.match(/(https?:\/\/localhost:\d+)/i);
  if (match && !browserOpened) {
    const url = match[1];
    setTimeout(() => openBrowser(url), 400);
  }
}

child.stdout.on('data', handleOutput);
child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
