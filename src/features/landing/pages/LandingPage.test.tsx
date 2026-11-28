import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from './LandingPage';

describe('landing page', () => {
  afterEach(cleanup);

  it('explains the drone and AI offer and presents illustrative AI review', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /clearer asset inspections\s*with drones and AI\./i,
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /one platform for the assets you’re responsible for/i,
      }).textContent,
    ).toMatch(/one platform for the assets/i);

    const image = screen.getByRole('img', {
      name: /illustrative ai-assisted inspection/i,
    });
    expect(image.getAttribute('src')).toBe('/images/landing/ai-defect-review.jpg');

    const aboutSection = document.querySelector('#about');
    expect(aboutSection).not.toBeNull();
    expect(
      within(aboutSection as HTMLElement).getByText(/illustrative ai confidence — not a risk score/i).textContent,
    ).toMatch(/not a risk score/i);
    expect(screen.getByRole('link', { name: /sign up/i }).getAttribute('href')).toBe('/register');
    expect(screen.getAllByRole('link', { name: /get a consultation/i })).toHaveLength(2);
    expect(
      screen.getAllByRole('link', { name: /get a consultation/i }).every(
        (link) => link.getAttribute('href') === '/register',
      ),
    ).toBe(true);

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Landing pages by role' })).toBeNull();
  });

  it.each([
    { audience: 'customer', signIn: '/customer/login', signUp: '/register' },
    { audience: 'inspector', signIn: '/inspector/login', signUp: '/inspector/register' },
    { audience: 'staff', signIn: '/staff/login', signUp: '/register' },
  ] as const)('keeps the original design and auth links for $audience', ({ audience, signIn, signUp }) => {
    render(<LandingPage audience={audience} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/clearer asset inspections/i);
    expect(screen.getByRole('link', { name: 'SDI home' }).getAttribute('href')).toBe(`/${audience}`);
    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe(signUp);
    for (const link of screen.getAllByRole('link', { name: 'Sign in' })) {
      expect(link.getAttribute('href')).toBe(signIn);
    }
  });
});
