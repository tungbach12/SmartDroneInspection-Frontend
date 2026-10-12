import type { ReactElement } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renders a component that navigates.
 *
 * <p>Pages reached through the router call useNavigate, which throws outside a Router. Wrapping here
 * keeps the route context out of every individual test while still letting the page behave as it
 * does in the app.
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: RenderOptions & { route?: string },
): RenderResult {
  const { route = '/operations/inspections', ...rest } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>,
    ...rest,
  });
}