import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateModal } from '../src/components/modals/UpdateModal';

describe('UpdateModal accessibility', () => {
  it('focus traps between first and last focusable and closes on Escape', async () => {
    const onClose = vi.fn();
    const onAck = vi.fn();

    const user = userEvent.setup();
    const { rerender } = render(
      <div>
        <button aria-label="before">Before</button>
        <UpdateModal isOpen onClose={onClose} onAcknowledge={onAck} html="<p>Hello</p>" />
      </div>
    );

    // Modal appears
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Find Close and Got it buttons
    const buttons = screen.getAllByRole('button');
    // Focus first
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    // Shift+Tab should wrap to last
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    // Escape closes
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();

    // Close modal
    rerender(
      <div>
        <button aria-label="before">Before</button>
        <UpdateModal isOpen={false} onClose={onClose} onAcknowledge={onAck} html="<p>Hello</p>" />
      </div>
    );
  });
});

