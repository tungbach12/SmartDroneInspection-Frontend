import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from './LandingPage';
import RoleLandingPage from './RoleLandingPage';

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

    const roleNav = screen.getByRole('navigation', { name: 'Landing pages by role' });
    expect(within(roleNav).getByRole('link', { name: 'Customer', current: 'page' }).getAttribute('href')).toBe('/customer');
    expect(within(roleNav).getByRole('link', { name: 'Inspector' }).getAttribute('href')).toBe('/inspector');
    expect(within(roleNav).getByRole('link', { name: 'Manager / Admin' }).getAttribute('href')).toBe('/staff');
  });

  it('links the Inspector landing to its dedicated sign-in and application', () => {
    render(<RoleLandingPage audience="inspector" />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/field to the report/);
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/inspector/login');
    for (const action of screen.getAllByRole('link', { name: 'Apply as Inspector' })) {
      expect(action.getAttribute('href')).toBe('/inspector/register');
    }
  });

  it('introduces both staff workspaces and uses the existing staff sign-in flow', () => {
    render(<RoleLandingPage audience="staff" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Manager' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Admin' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Staff sign in' }).getAttribute('href')).toBe('/login');
    expect(screen.queryByRole('link', { name: /sign up|apply as inspector/i })).toBeNull();
  });
});
