import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(320, 'Email must be 320 characters or fewer.');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const clientRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Enter your full name.')
      .max(200, 'Name must be 200 characters or fewer.'),
    organizationName: z
      .string()
      .trim()
      .min(1, 'Enter your organization name.')
      .max(200, 'Organization name must be 200 characters or fewer.'),
    organizationCode: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/,
        'Use 3–64 letters, numbers, hyphens, or underscores; start with a letter or number.',
      ),
    email: emailField,
    password: z
      .string()
      .min(15, 'Use at least 15 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const passwordSetupSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter the temporary password.'),
    password: z
      .string()
      .min(15, 'Use at least 15 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(15, 'Use at least 15 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ClientRegistrationFormValues = z.infer<
  typeof clientRegistrationSchema
>;
export type PasswordSetupFormValues = z.infer<typeof passwordSetupSchema>;
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
