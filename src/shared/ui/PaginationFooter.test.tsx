import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaginationFooter } from './PaginationFooter';
import { paginateItems } from './pagination';

describe('paginateItems', () => {
  it('slices items for the requested 1-based page and clamps out-of-range pages', () => {
    const items = Array.from({ length: 23 }, (_, index) => index + 1);

    const page1 = paginateItems(items, 1, 10);
    expect(page1.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page1.totalPages).toBe(3);

    const page3 = paginateItems(items, 3, 10);
    expect(page3.items).toEqual([21, 22, 23]);

    const clamped = paginateItems(items, 99, 10);
    expect(clamped.page).toBe(3);
    expect(clamped.items).toEqual([21, 22, 23]);
  });

  it('handles empty collections safely', () => {
    const empty = paginateItems([], 2, 10);
    expect(empty.items).toEqual([]);
    expect(empty.page).toBe(1);
    expect(empty.totalPages).toBe(1);
    expect(empty.totalCount).toBe(0);
  });
});

describe('PaginationFooter', () => {
  afterEach(() => cleanup());

  it('renders the range summary and emits page changes', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationFooter
        page={1}
        pageSize={10}
        totalCount={24}
        onPageChange={onPageChange}
        ariaLabel="Items pagination"
      />,
    );

    expect(screen.getByText('Showing 1–10 of 24')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders zero range summary when empty', () => {
    render(
      <PaginationFooter
        page={1}
        pageSize={10}
        totalCount={0}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Showing 0 of 0')).toBeTruthy();
  });
});
