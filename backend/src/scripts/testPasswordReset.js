import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const BASE_URL = 'http://localhost:5000/api';

async function api(endpoint, options = {}) {
  const { headers, ...restOptions } = options;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runPasswordResetTests() {
  console.log('🧪 Starting HOMEFIX Secure Forgot Password & Reset Password Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Dedicated test customer to preserve seed account passwords
  const testEmail = `pwd_reset_test_${Date.now()}@homefix.com`;
  const initialPassword = 'InitialPass@123';
  const newPassword = 'NewSecretPass@2026';

  try {
    // 0. Setup a dedicated test customer
    console.log('--- 0. Setup Dedicated Test Account ---');
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Reset Test User',
        email: testEmail,
        password: initialPassword,
        phone: '9876543299',
        city: 'Bangalore',
        pincode: '560034',
      }),
    });
    assert(regRes.ok && regRes.data.user, 'Test account registered successfully');
    const testUserId = regRes.data.user.id;

    // 1. Forgot password request with valid email
    console.log('\n--- 1. Forgot Password Request (Valid Email) ---');
    const forgotRes = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    });
    assert(forgotRes.ok, `HTTP 200 OK returned on forgot-password (got: ${forgotRes.status})`);
    assert(
      forgotRes.data.message === 'If an account with that email exists, password reset instructions have been sent.',
      'Returns generic success message to prevent user enumeration'
    );
    assert(forgotRes.data._dev != null, 'Development metadata provided in non-production mode');
    assert(typeof forgotRes.data._dev?.resetToken === 'string', 'Raw reset token provided in _dev metadata');
    assert(typeof forgotRes.data._dev?.resetUrl === 'string', 'Reset URL provided in _dev metadata');

    const rawToken = forgotRes.data._dev?.resetToken;

    // 2. Token generation and database security verification
    console.log('\n--- 2. Token Storage & Cryptographic Hash Verification ---');
    const [userRows] = await pool.query(
      'SELECT password, reset_password_token, reset_password_expires FROM users WHERE id = ?',
      [testUserId]
    );
    const userInDb = userRows[0];
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    assert(userInDb.reset_password_token !== null, 'reset_password_token column is populated');
    assert(
      userInDb.reset_password_token === expectedHash,
      'MySQL stores the SHA-256 cryptographic hash of the token'
    );
    assert(
      userInDb.reset_password_token !== rawToken,
      'MySQL NEVER stores the raw plaintext token'
    );
    assert(
      userInDb.reset_password_expires !== null && new Date(userInDb.reset_password_expires) > new Date(),
      'reset_password_expires is set in the future'
    );

    // 3. Unknown email request
    console.log('\n--- 3. Unknown Email Handling ---');
    const unknownRes = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent.random.user.99999@homefix.com' }),
    });
    assert(unknownRes.ok, `HTTP 200 OK returned for unknown email (got: ${unknownRes.status})`);
    assert(
      unknownRes.data.message === 'If an account with that email exists, password reset instructions have been sent.',
      'Identical generic response returned for unknown email (no email enumeration)'
    );
    assert(unknownRes.data._dev === undefined, 'No _dev token returned for unknown email');

    // 4. Invalid token verification
    console.log('\n--- 4. Invalid Token Tests ---');
    const invalidVerify = await api('/auth/verify-reset-token/completely_invalid_garbage_token');
    assert(invalidVerify.status === 400, `HTTP 400 on invalid token verification (got: ${invalidVerify.status})`);

    const invalidReset = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'completely_invalid_garbage_token',
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });
    assert(invalidReset.status === 400, `HTTP 400 on reset with invalid token (got: ${invalidReset.status})`);

    // 5. Expired token handling
    console.log('\n--- 5. Expired Token Tests ---');
    // Simulate expired token in database
    await pool.query(
      'UPDATE users SET reset_password_expires = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
      [testUserId]
    );

    const expiredVerify = await api(`/auth/verify-reset-token/${rawToken}`);
    assert(expiredVerify.status === 400, `HTTP 400 on expired token verification (got: ${expiredVerify.status})`);

    const expiredReset = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });
    assert(expiredReset.status === 400, `HTTP 400 on reset with expired token (got: ${expiredReset.status})`);

    // 6. Password validation tests
    console.log('\n--- 6. Password Input Validation Tests ---');
    // Restore valid expiration
    await pool.query(
      'UPDATE users SET reset_password_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
      [testUserId]
    );

    const shortPassRes = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: '123',
        confirmPassword: '123',
      }),
    });
    assert(shortPassRes.status === 400, `HTTP 400 when password is < 6 characters (got: ${shortPassRes.status})`);

    const mismatchRes = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: 'ValidPassword123',
        confirmPassword: 'DifferentPassword456',
      }),
    });
    assert(mismatchRes.status === 400, `HTTP 400 when passwords do not match (got: ${mismatchRes.status})`);

    // 7. Successful password reset
    console.log('\n--- 7. Successful Password Reset ---');
    const validVerify = await api(`/auth/verify-reset-token/${rawToken}`);
    assert(validVerify.ok, `HTTP 200 OK on valid token verification (got: ${validVerify.status})`);

    const resetSuccess = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });
    assert(resetSuccess.ok, `HTTP 200 OK on successful password reset (got: ${resetSuccess.status})`);

    // 8. Token invalidation / Single-use verification
    console.log('\n--- 8. Token Invalidation & Single-Use Verification ---');
    const reuseAttempt = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: 'AnotherPassword@999',
        confirmPassword: 'AnotherPassword@999',
      }),
    });
    assert(
      reuseAttempt.status === 400,
      `HTTP 400 when attempting to reuse the consumed reset token (got: ${reuseAttempt.status})`
    );

    const [userAfterReset] = await pool.query(
      'SELECT password, reset_password_token, reset_password_expires FROM users WHERE id = ?',
      [testUserId]
    );
    assert(userAfterReset[0].reset_password_token === null, 'reset_password_token column is cleared (NULL)');
    assert(userAfterReset[0].reset_password_expires === null, 'reset_password_expires column is cleared (NULL)');

    // 9. Bcrypt password verification in database
    console.log('\n--- 9. Database Bcrypt Hashing Verification ---');
    const newDbHash = userAfterReset[0].password;
    assert(
      newDbHash.startsWith('$2a$') || newDbHash.startsWith('$2b$'),
      'New password is stored as a valid bcrypt hash'
    );
    assert(
      newDbHash !== newPassword,
      'Raw plaintext password is never stored in the database'
    );
    const matchesBcrypt = await bcrypt.compare(newPassword, newDbHash);
    assert(matchesBcrypt, 'Stored hash successfully matches the new password via bcrypt.compare()');

    // 10. Login with new credentials vs old credentials
    console.log('\n--- 10. Login Verification with Updated Password ---');
    const oldLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });
    assert(oldLogin.status === 401, `Old password rejected with HTTP 401 (got: ${oldLogin.status})`);

    const newLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    });
    assert(newLogin.ok, `New password successfully authenticates user with HTTP 200 (got: ${newLogin.status})`);
    assert(typeof newLogin.data.token === 'string', 'Login returns valid JWT token');

    // 11. Rate limiting protection
    console.log('\n--- 11. Rate-Limiting Abuse Protection ---');
    // First request
    const firstReq = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    });
    assert(firstReq.ok, 'First reset request accepted');
    const token1 = firstReq.data._dev?.resetToken;

    // Rapid second request (< 60s)
    const secondReq = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    });
    assert(secondReq.ok, 'Rapid second reset request returns generic HTTP 200');

    // Check database token did not change (rate limit preserved first token)
    const [rateLimitUser] = await pool.query(
      'SELECT reset_password_token FROM users WHERE id = ?',
      [testUserId]
    );
    const expectedFirstHash = crypto.createHash('sha256').update(token1).digest('hex');
    assert(
      rateLimitUser[0].reset_password_token === expectedFirstHash,
      'Token was not overwritten within 60 second rate-limit window'
    );

    // 12. Technician & Admin Forgot Password Test
    console.log('\n--- 12. Multi-Role Verification (Technician & Admin) ---');
    const techForgot = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'tech.electric@homefix.com' }),
    });
    assert(techForgot.ok, 'Technician account can request password reset');

    const adminForgot = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@homefix.com' }),
    });
    assert(adminForgot.ok, 'Admin account can request password reset');

    // Clean up test customer account
    console.log('\n--- 13. Test Cleanup ---');
    await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
    console.log('  ✅ PASS: Temporary test user cleaned up');
    passed++;

  } catch (err) {
    console.error('Unexpected error in test execution:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`Password Reset Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPasswordResetTests();
