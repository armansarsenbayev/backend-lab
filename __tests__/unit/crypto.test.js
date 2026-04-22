// File: __tests__/unit/crypto.test.js
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Token Hashing (Unit)', () => {
  
  test('should consistently hash the same token', () => {
    const token = 'test-token-123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  test('should produce different hashes for different tokens', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  test('should never return the original token', () => {
    const token = 'secret-token';
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).not.toBe(token);
  });
});