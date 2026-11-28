export const LOGIN_PAGES = {
  customer: { path: '/customer/login', title: 'Customer sign-in' },
  inspector: { path: '/inspector/login', title: 'Inspector sign-in' },
  staff: { path: '/staff/login', title: 'Manager / Admin sign-in' },
} as const;

export type LoginAudience = keyof typeof LOGIN_PAGES;

export const LOGIN_AUDIENCES: readonly LoginAudience[] = ['customer', 'inspector', 'staff'];
