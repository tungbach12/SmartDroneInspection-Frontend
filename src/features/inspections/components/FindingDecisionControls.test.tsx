import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FindingDecisionControls } from './FindingDecisionControls';

describe('FindingDecisionControls', () => {
  afterEach(() => cleanup());

  it('requires a non-blank rationale before enabling reviewer decisions', () => {
    const onDecide = vi.fn();
    render(
      <FindingDecisionControls
        findingId="finding-1"
        defectLabel="Surface crack"
        isPending={false}
        error={null}
        onDecide={onDecide}
      />,
    );

    const rationale = screen.getByRole('textbox', { name: 'Reviewer rationale' });
    expect(rationale.getAttribute('required')).toBe('');
    expect(rationale.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Required. Enter a rationale before recording a reviewer decision.')).toBeTruthy();

    for (const name of ['Confirm finding', 'Confirm as modified', 'Reject finding']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }

    fireEvent.change(rationale, { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Confirm finding' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(rationale, { target: { value: '  Crack is confirmed.  ' } });
    const confirm = screen.getByRole('button', { name: 'Confirm finding' });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    expect(rationale.getAttribute('aria-invalid')).toBe('false');
    fireEvent.click(confirm);

    expect(onDecide).toHaveBeenCalledWith('finding-1', 'CONFIRMED', 'Crack is confirmed.');
  });

  it('keeps decision buttons disabled while a decision is pending', () => {
    render(
      <FindingDecisionControls
        findingId="finding-1"
        defectLabel="Surface crack"
        isPending
        error={null}
        onDecide={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Reviewer rationale' }), {
      target: { value: 'Crack is confirmed.' },
    });

    expect((screen.getByRole('button', { name: 'Confirm finding' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
