import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title, message, and action buttons when open', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Confirm Deletion"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        severity="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    expect(screen.getByText('Confirm Deletion')).not.toBeNull();
    expect(screen.getByText('Are you sure you want to delete this item?')).not.toBeNull();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(deleteBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();

    fireEvent.click(deleteBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('renders children elements correctly', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Custom Dialog"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <div data-testid="custom-child">Custom children content</div>
      </ConfirmDialog>,
    );

    expect(screen.getByTestId('custom-child')).not.toBeNull();
  });
});
