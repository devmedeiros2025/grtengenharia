import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import { signJwt, verifyJwt } from '../middleware/auth.js';

describe('Auth Middleware (JWT)', () => {
  after(() => {
    teardownTestDb(testDbPath);
  });

  it('should sign and verify a valid JWT', async () => {
    const payload = { sub: '1', name: 'Teste', role: 'comercial' };
    const token = await signJwt(payload);
    assert.ok(token, 'Token should be generated');
    assert.equal(token.split('.').length, 3, 'JWT should have 3 parts');

    const decoded = await verifyJwt(token);
    assert.ok(decoded, 'Token should verify');
    assert.equal(decoded.sub, '1');
    assert.equal(decoded.name, 'Teste');
    assert.equal(decoded.role, 'comercial');
  });

  it('should have iat and exp claims', async () => {
    const token = await signJwt({ sub: '1', name: 'Test' });
    const decoded = await verifyJwt(token);
    assert.ok(decoded.iat, 'Should have issued at');
    assert.ok(decoded.exp, 'Should have expiration');
    assert.ok(decoded.exp > decoded.iat, 'Exp should be after iat');
  });

  it('should reject tampered token', async () => {
    const token = await signJwt({ sub: '1', name: 'Test' });
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;
    const decoded = await verifyJwt(tampered);
    assert.equal(decoded, null, 'Tampered token should be rejected');
  });

  it('should reject expired token', async () => {
    // Create token with 0s expiry by directly manipulating
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret');
    const token = await new SignJWT({ sub: '1', name: 'Expired' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime('-1h')
      .sign(secret);

    const decoded = await verifyJwt(token);
    assert.equal(decoded, null, 'Expired token should be rejected');
  });

  it('should reject malformed token', async () => {
    const decoded = await verifyJwt('not-a-jwt');
    assert.equal(decoded, null);
  });

  it('should reject empty token', async () => {
    const decoded = await verifyJwt('');
    assert.equal(decoded, null);
  });

  it('should carry custom payload fields', async () => {
    const payload = { sub: '42', name: 'Admin', email: 'admin@teste.com', role: 'ceo', cargo: 'Diretor' };
    const token = await signJwt(payload);
    const decoded = await verifyJwt(token);
    assert.equal(decoded.email, 'admin@teste.com');
    assert.equal(decoded.cargo, 'Diretor');
  });
});
