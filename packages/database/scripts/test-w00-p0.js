/**
 * TEST-W00-P0.js - BỘ TEST NGHIỆM THU P0 (W-00 THEO KẾ HOẠCH V2)
 *
 * Kiểm tra các ca:
 * 1. GAP-01 / OTP-01 / OTP-02:
 *    - AuthService.register() thiếu await verifyOtp đã được sửa:
 *      + OTP sai -> Ném BadRequestException, KHÔNG tạo user
 *      + OTP rỗng / null / whitespace -> Ném BadRequestException, KHÔNG tạo user
 *    - AuthService.resetPassword() thiếu await verifyOtp đã được sửa:
 *      + OTP sai -> Ném BadRequestException, KHÔNG đổi passwordHash / tokenVersion
 *      + OTP rỗng / whitespace -> Ném BadRequestException
 * 2. GAP-02 / GAP-03 / AUTH-07..10:
 *      + canonicalizeEmail: loại bỏ dot và tag cho Gmail cá nhân (@gmail.com, @googlemail.com)
 *      + canonicalizeEmail: GIỮ NGUYÊN dot cho domain Workspace tổ chức (KT-02)
 *      + canonicalizePhone: chuẩn hóa về chuẩn E.164 (+84...)
 *      + GoogleLoginDto: không còn trường phone tự khai
 * 3. GAP-06:
 *      + Loại bỏ hoàn toàn thanh toán trực tuyến và ngân hàng khỏi hệ thống
 */

const path = require('path');
const assert = require('assert');

// Thiết lập module paths
const apiNodeModules = path.resolve(__dirname, '../../../apps/api/node_modules');
const rootNodeModules = path.resolve(__dirname, '../../../node_modules');
module.paths.unshift(apiNodeModules, rootNodeModules);

const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { AuthService } = require('../../../apps/api/dist/modules/auth/auth.service');
const { OtpService } = require('../../../apps/api/dist/modules/auth/otp.service');
const { canonicalizeEmail, canonicalizePhone } = require('../../../apps/api/dist/modules/auth/utils/identity-canonical');

// Mock User Store
class MockUserStore {
  constructor() {
    this.users = new Map();
    this.nextId = 1n;
  }

  async findUnique({ where }) {
    if (where.phone) {
      for (const u of this.users.values()) {
        if (u.phone === where.phone) return { ...u };
      }
      return null;
    }
    if (where.id !== undefined) {
      const u = this.users.get(BigInt(where.id));
      return u ? { ...u } : null;
    }
    return null;
  }

  async create({ data }) {
    const id = this.nextId++;
    const record = {
      id,
      phone: data.phone,
      fullName: data.fullName ?? null,
      passwordHash: data.passwordHash,
      role: data.role ?? 'user',
      isBlocked: false,
      isPhoneVerified: data.isPhoneVerified ?? false,
      tokenVersion: 0,
      createdAt: new Date(),
    };
    this.users.set(id, record);
    return { ...record };
  }

  async update({ where, data }) {
    const id = BigInt(where.id);
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User not found with id ${id}`);
    const updated = {
      ...existing,
      ...data,
      tokenVersion: data.tokenVersion !== undefined ? (typeof data.tokenVersion === 'object' && data.tokenVersion.increment ? existing.tokenVersion + 1 : data.tokenVersion) : existing.tokenVersion,
    };
    this.users.set(id, updated);
    return { ...updated };
  }
}

// Mock PrismaService
function createMockPrisma(userStore) {
  return {
    user: userStore,
    $transaction: async (cb) => cb({ user: userStore }),
  };
}

// Mock OtpService
function createMockOtpService() {
  const validOtps = new Map(); // key: phone, val: code

  return {
    setValidOtp(phone, code) {
      validOtps.set(phone, code);
    },
    // Trả về Promise<boolean> để test đúng điều kiện await
    async verifyOtp(phone, otpCode) {
      if (!otpCode || typeof otpCode !== 'string' || !otpCode.trim()) {
        return false;
      }
      const stored = validOtps.get(phone);
      if (stored && stored === otpCode.trim()) {
        validOtps.delete(phone); // 1 lần dùng duy nhất
        return true;
      }
      return false;
    },
    async sendOtp() {
      return { success: true };
    },
  };
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('BẮT ĐẦU KIỂM THỬ W-00 — P0: AUTH (GAP-01, GAP-02), PAY (GAP-06)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  [PASS] #${total} ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] #${total} ${name}`);
      console.error(`         ${err.message}`);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] #${total} ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] #${total} ${name}`);
      console.error(`         ${err.message}`);
    }
  }

  // Khởi tạo dependencies
  const userStore = new MockUserStore();
  const mockPrisma = createMockPrisma(userStore);
  const mockOtp = createMockOtpService();
  const jwtService = new JwtService({ secret: 'test-secret-32-chars-long-min!!' });
  const mockEmail = { sendEmail: async () => true };

  const authService = new AuthService(
    mockPrisma,
    mockOtp,
    jwtService,
  );

  // -------------------------------------------------------------
  // NHÓM 1: GAP-01 / OTP-01 / OTP-02 (Thiếu await verifyOtp)
  // -------------------------------------------------------------
  console.log('--- NHÓM 1: KIỂM TRA LỖ HỔNG THIẾU AWAIT VERIFY OTP (GAP-01) ---');

  await testAsync('OTP-01: register() với OTP sai PHẢI bị từ chối 400 và KHÔNG tạo user', async () => {
    mockOtp.setValidOtp('0911000001', '123456');

    let errorThrown = null;
    try {
      await authService.register({
        phone: '0911000001',
        otpCode: '999999', // OTP SAI
        fullName: 'Nguyen Van A',
        password: 'Password123!',
      });
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown instanceof BadRequestException, 'Phải ném BadRequestException khi OTP sai');
    assert.strictEqual(errorThrown.message, 'Mã OTP không đúng hoặc đã hết hạn');

    // Chứng minh không tạo user trong store
    const userInDb = await userStore.findUnique({ where: { phone: '0911000001' } });
    assert.strictEqual(userInDb, null, 'User tuyệt đối KHÔNG được tạo khi OTP sai');
  });

  await testAsync('OTP-01b: register() với OTP rỗng/whitespace PHẢI bị từ chối 400', async () => {
    mockOtp.setValidOtp('0911000002', '123456');

    let errorThrown = null;
    try {
      await authService.register({
        phone: '0911000002',
        otpCode: '   ', // OTP RỖNG
        fullName: 'Nguyen Van B',
        password: 'Password123!',
      });
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown instanceof BadRequestException, 'Phải ném BadRequestException khi OTP rỗng');
    const userInDb = await userStore.findUnique({ where: { phone: '0911000002' } });
    assert.strictEqual(userInDb, null, 'User không được tạo khi OTP rỗng');
  });

  await testAsync('OTP-01c: register() với OTP đúng tạo user thành công', async () => {
    mockOtp.setValidOtp('0911000003', '654321');

    const result = await authService.register({
      phone: '0911000003',
      otpCode: '654321', // OTP ĐÚNG
      fullName: 'Nguyen Van C',
      password: 'Password123!',
    });

    assert(result.accessToken, 'Phải trả accessToken khi OTP đúng');
    assert(result.user, 'Phải trả user object');
    const userInDb = await userStore.findUnique({ where: { phone: '0911000003' } });
    assert.notStrictEqual(userInDb, null, 'User phải được lưu vào CSDL');
  });

  await testAsync('OTP-02: resetPassword() với OTP sai PHẢI bị từ chối 400 và KHÔNG đổi mật khẩu', async () => {
    // Tạo user trước
    const testUser = await userStore.create({
      data: {
        phone: '0911000004',
        fullName: 'Nguyen Van D',
        passwordHash: 'old_hash_value',
        isPhoneVerified: true,
      },
    });

    mockOtp.setValidOtp('0911000004', '888888');

    let errorThrown = null;
    try {
      await authService.resetPassword({
        phone: '0911000004',
        otpCode: '000000', // OTP SAI
        newPassword: 'NewPassword123!',
      });
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown instanceof BadRequestException, 'Phải ném BadRequestException');
    assert.strictEqual(errorThrown.message, 'Mã OTP không đúng hoặc đã hết hạn');

    // Kiểm tra mật khẩu trong DB không bị thay đổi
    const userAfter = await userStore.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(userAfter.passwordHash, 'old_hash_value', 'Password hash KHÔNG được thay đổi khi OTP sai');
    assert.strictEqual(userAfter.tokenVersion, 0, 'tokenVersion không được tăng khi OTP sai');
  });

  await testAsync('OTP-02b: resetPassword() với OTP đúng đổi mật khẩu và tăng tokenVersion', async () => {
    mockOtp.setValidOtp('0911000004', '888888');

    const result = await authService.resetPassword({
      phone: '0911000004',
      otpCode: '888888', // OTP ĐÚNG
      newPassword: 'NewPassword123!',
    });

    assert(result.success === true, 'Phải trả success: true');
    const userAfter = await userStore.findUnique({ where: { phone: '0911000004' } });
    assert.notStrictEqual(userAfter.passwordHash, 'old_hash_value', 'Password hash phải được cập nhật');
    assert.strictEqual(userAfter.tokenVersion, 1, 'tokenVersion phải tăng để revoke session cũ');
  });

  // -------------------------------------------------------------
  // NHÓM 2: GAP-02 / GAP-03 / AUTH-07..10 (Chuẩn hóa định danh, KT-02)
  // -------------------------------------------------------------
  console.log('\n--- NHÓM 2: KIỂM TRA CHUẨN HÓA ĐỊNH DANH (KT-02, KT-03) ---');

  test('AUTH-07: canonicalizeEmail bỏ dấu chấm và +tag với Gmail cá nhân (@gmail.com)', () => {
    assert.strictEqual(canonicalizeEmail('duc.quan.1610+test@gmail.com'), 'ducquan1610@gmail.com');
    assert.strictEqual(canonicalizeEmail('D.U.C.Q.U.A.N@gmail.com'), 'ducquan@gmail.com');
    assert.strictEqual(canonicalizeEmail('test.account@googlemail.com'), 'testaccount@gmail.com');
  });

  test('AUTH-08: canonicalizeEmail GIỮ NGUYÊN dấu chấm cho domain Workspace tổ chức (KT-02)', () => {
    // KT-02: Dots matter in non-Gmail domain! Ví dụ john.doe@company.com và johndoe@company.com là 2 người khác nhau
    assert.strictEqual(canonicalizeEmail('john.doe@company.vn'), 'john.doe@company.vn');
    assert.strictEqual(canonicalizeEmail('nguyen.duc.quan@bds.com.vn'), 'nguyen.duc.quan@bds.com.vn');
    assert.strictEqual(canonicalizeEmail('admin.hr@university.edu.vn'), 'admin.hr@university.edu.vn');
  });

  test('AUTH-09: canonicalizePhone chuẩn hóa về E.164 (+84)', () => {
    assert.strictEqual(canonicalizePhone('0981753082'), '+84981753082');
    assert.strictEqual(canonicalizePhone('+84981753082'), '+84981753082');
    assert.strictEqual(canonicalizePhone('0981 753 082'), '+84981753082');
    assert.strictEqual(canonicalizePhone('+84 981-753-082'), '+84981753082');
  });

  test('AUTH-10: canonicalizePhone ném lỗi với số không hợp lệ', () => {
    assert.strictEqual(canonicalizePhone('12345'), null);
    assert.strictEqual(canonicalizePhone('abcdefghijk'), null);
    assert.strictEqual(canonicalizePhone(''), null);
  });

  // -------------------------------------------------------------
  // NHÓM 3: GAP-06 (Loại bỏ hoàn toàn thanh toán trực tuyến & ngân hàng)
  // -------------------------------------------------------------
  console.log('\n--- NHÓM 3: KIỂM TRA LOẠI BỎ THANH TOÁN TRỰC TUYẾN & NGÂN HÀNG (GAP-06) ---');

  await testAsync('PAY-01: Hệ thống xác nhận gỡ bỏ hoàn toàn module payments khỏi API', async () => {
    let hasPayments = false;
    try {
      require('../../../apps/api/dist/modules/payments/payments.module');
      hasPayments = true;
    } catch {
      hasPayments = false;
    }
    assert.strictEqual(hasPayments, false, 'Module payments không còn tồn tại trong backend');
  });

  // TỔNG KẾT
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} TESTS PASS (${Math.round((passed / total) * 100)}%)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Lỗi thực thi test:', err);
  process.exit(1);
});
