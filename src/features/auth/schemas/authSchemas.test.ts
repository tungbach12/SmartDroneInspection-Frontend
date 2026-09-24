import { describe, expect, it } from 'vitest';
import {
  clientRegistrationSchema,
  loginSchema,
  passwordChangeSchema,
  passwordSetupSchema,
} from './authSchemas';

describe('authentication form validation', () => {
  it('requires a valid email and a non-empty sign-in password', () => {
    expect(loginSchema.safeParse({ email: 'client@example.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'client@example.com', password: '' }).success).toBe(false);
  });

  it('validates Client organization registration and matching passwords', () => {
    const valid = {
      fullName: 'Client User',
      organizationName: 'Example Organization',
      organizationCode: 'example_1',
      email: 'client@example.com',
      password: 'a much longer secure password',
      confirmPassword: 'a much longer secure password',
    };

    expect(clientRegistrationSchema.safeParse(valid).success).toBe(true);
    expect(
      clientRegistrationSchema.safeParse({
        ...valid,
        organizationCode: 'x!',
      }).success,
    ).toBe(false);
    expect(
      clientRegistrationSchema.safeParse({
        ...valid,
        confirmPassword: 'different password',
      }).success,
    ).toBe(false);
  });

  it('requires a long matching password for first-time setup and password changes', () => {
    expect(
      passwordSetupSchema.safeParse({
        currentPassword: 'temporary',
        password: 'a much longer secure password',
        confirmPassword: 'a much longer secure password',
      }).success,
    ).toBe(true);
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: 'current password',
        newPassword: 'short',
        confirmPassword: 'short',
      }).success,
    ).toBe(false);
  });
});
