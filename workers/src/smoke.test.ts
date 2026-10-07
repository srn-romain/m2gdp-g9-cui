import { describe, expect, it } from 'vitest';
import { statusFor } from './errors';

describe('enveloppes API', () => {
  it('codes stables -> statuts HTTP', () => {
    expect(statusFor('TABLE_FULL')).toBe(409);
    expect(statusFor('HOST_CANNOT_LEAVE')).toBe(409);
    expect(statusFor('VALIDATION_ERROR')).toBe(422);
    expect(statusFor('UNAUTHENTICATED')).toBe(401);
  });
});
