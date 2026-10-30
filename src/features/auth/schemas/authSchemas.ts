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

export const firstAssetSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Asset code is required.')
    .max(64, 'Asset code must be 64 characters or fewer.'),
  name: z
    .string()
    .trim()
    .min(1, 'Asset name is required.')
    .max(200, 'Asset name must be 200 characters or fewer.'),
  categoryId: z.string().min(1, 'Asset category is required.'),
  locationText: z
    .string()
    .trim()
    .min(1, 'Location description is required.')
    .max(500, 'Location must be 500 characters or fewer.'),
  latitude: z.number().min(-90, 'Latitude must be >= -90.').max(90, 'Latitude must be <= 90.'),
  longitude: z.number().min(-180, 'Longitude must be >= -180.').max(180, 'Longitude must be <= 180.'),
});

export const organizationRegistrationSchema = z
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
    firstAsset: firstAssetSchema,
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
export type FirstAssetFormValues = z.infer<typeof firstAssetSchema>;
export type OrganizationRegistrationFormValues = z.infer<
  typeof organizationRegistrationSchema
>;
export type PasswordSetupFormValues = z.infer<typeof passwordSetupSchema>;
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
