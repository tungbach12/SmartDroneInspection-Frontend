import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DarkHero } from './DarkHero';

describe('landing hero', () => {
  it('directs organization onboarding and operations sign-in to supported local routes', () => {
    render(<DarkHero />);

    expect(screen.getByRole('link', { name: /start free inspection/i }).getAttribute('href')).toBe('/register');
    expect(screen.getByRole('link', { name: /sign in for field operations/i }).getAttribute('href')).toBe('/login');
  });
});
