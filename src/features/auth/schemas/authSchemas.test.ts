import { describe, expect, it } from 'vitest';
import {
  organizationRegistrationSchema,
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

  it('validates account registration and matching passwords', () => {
    const valid = {
      fullName: 'Client User',
      email: 'client@example.com',
      password: 'A much longer secure password 1!',
      confirmPassword: 'A much longer secure password 1!',
    };

    expect(organizationRegistrationSchema.safeParse(valid).success).toBe(true);

    expect(
      organizationRegistrationSchema.safeParse({
        ...valid,
        fullName: '',
      }).success,
    ).toBe(false);
    expect(
      organizationRegistrationSchema.safeParse({
        ...valid,
        confirmPassword: 'different password',
      }).success,
    ).toBe(false);
  });

  it('requires a long matching password for first-time setup and password changes', () => {
    expect(
      passwordSetupSchema.safeParse({
        currentPassword: 'temporary',
        password: 'A much longer secure password 1!',
        confirmPassword: 'A much longer secure password 1!',
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
