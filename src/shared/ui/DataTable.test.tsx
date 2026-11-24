import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  afterEach(() => {
    cleanup();
  });
  const columns = [{ id: 'name', label: 'Name', render: (row: { id: string; name: string }) => row.name }];
  const rows = [{ id: 'one', name: 'North bridge' }];

  it('filters visible rows from the search input', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchable
        searchPredicate={(row, query) => row.name.toLowerCase().includes(query)}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search…' }), { target: { value: 'south' } });

    expect(screen.getByText('No records found')).not.toBeNull();
    expect(screen.queryByText('North bridge')).toBeNull();
  });

  it('opens a clickable row using the keyboard', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onRowClick} />);

    fireEvent.keyDown(screen.getByRole('row', { name: 'North bridge' }), { key: 'Enter' });

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('clears the search query and supports custom emptyContent with range summary', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchable
        searchPredicate={(row, query) => row.name.toLowerCase().includes(query)}
        emptyContent={<button type="button">Reset table filters</button>}
      />,
    );

    expect(screen.getByText('Showing 1–1 of 1')).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search…' }), { target: { value: 'missing' } });

    expect(screen.getByRole('button', { name: 'Reset table filters' })).not.toBeNull();
    expect(screen.getByText('Showing 0 of 0')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByText('North bridge')).not.toBeNull();
    expect(screen.getByText('Showing 1–1 of 1')).not.toBeNull();
  });
});
