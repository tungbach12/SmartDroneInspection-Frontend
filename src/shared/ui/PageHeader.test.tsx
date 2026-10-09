import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('exposes the page title as the main heading and renders its actions', () => {
    render(
      <PageHeader
        title="Inspection reports"
        subtitle="Review and release completed inspections"
        actions={<button type="button">Create report</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Inspection reports' })).not.toBeNull();
    expect(screen.getByText('Review and release completed inspections')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Create report' })).not.toBeNull();
  });
});
