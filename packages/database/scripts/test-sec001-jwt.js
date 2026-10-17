/**
 * TEST BEHAVIORAL: SEC-001 & SEC-007 & OPS-001
 * Kiểm tra xác thực bảo mật JWT, gỡ bỏ fallback hardcode và không rò rỉ phone trong payload
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('\n================================================================');
console.log('🧪 TEST ĐỎ: SEC-001 / SEC-007 / OPS-001 JWT SECURITY VERIFICATION');
console.log('================================================================\n');

// 1. Kiểm tra không còn fallback hardcode trong auth.service.ts
const authServicePath = path.join(repoRoot, 'apps/api/src/modules/auth/auth.service.ts');
const authServiceContent = fs.readFileSync(authServicePath, 'utf8');

assert(
  !authServiceContent.includes('ac4a434d314c000e3f774d1f56f5a6a01c3326c74022d1a84ebaa5b5e3d0434b'),
  '[FAIL SEC-001] auth.service.ts vẫn còn chứa chuỗi khóa bí mật fallback hardcode!',
);
assert(
  !authServiceContent.includes('c27987125a9cdaadf550541f5a048eb3b55c5c37a7a21dde7b3a51baa3c9dd49'),
  '[FAIL SEC-001] auth.service.ts vẫn còn chứa chuỗi refresh secret fallback hardcode!',
);

// 2. Kiểm tra gỡ bỏ phone khỏi payload JWT trong issueTokens
const payloadMatch = authServiceContent.match(/const payload = \{([^}]+)\}/);
assert(payloadMatch, '[FAIL SEC-007] Không tìm thấy khai báo payload trong auth.service.ts');
assert(
  !payloadMatch[1].includes('phone'),
  '[FAIL SEC-007] auth.service.ts vẫn còn nhúng phone vào JWT payload!',
);

// 3. Kiểm tra assert-env.ts nhận diện cả 2 khóa hex mẫu trong .env.example
const assertEnvPath = path.join(repoRoot, 'apps/api/src/common/config/assert-env.ts');
const assertEnvContent = fs.readFileSync(assertEnvPath, 'utf8');

assert(
  assertEnvContent.includes('c27987125a9cdaadf550541f5a048eb3b55c5c37a7a21dde7b3a51baa3c9dd49'),
  '[FAIL OPS-001] assert-env.ts chưa bổ sung khóa hex mẫu vào danh sách insecure defaults!',
);

console.log('✅ TẤT CẢ CÁC BÀI TEST BẢO MẬT JWT ĐÃ ĐẠT!');
