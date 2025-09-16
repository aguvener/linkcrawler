import React, { useEffect, useRef } from 'react';

type UpdateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void; // mark current version seen
  html: string; // pre-rendered HTML content from controller
};

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, onAcknowledge, html }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const focusDirection = useRef<'forward' | 'backward'>('forward');

  const getFocusableElements = () => {
    const container = dialogRef.current;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      el =>
        !el.hasAttribute('disabled') &&
        !el.getAttribute('aria-hidden') &&
        !el.hasAttribute('data-focus-guard')
    );
  };

  const focusFirstFocusable = () => {
    const focusables = getFocusableElements();
    focusables[0]?.focus();
  };

  const focusLastFocusable = () => {
    const focusables = getFocusableElements();
    focusables[focusables.length - 1]?.focus();
  };

  useEffect(() => {
    if (isOpen) {
      lastFocused.current = document.activeElement as HTMLElement;
      // focus the modal container
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 0);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        // rudimentary focus trap: cycle within modal controls
        if (e.key === 'Tab') {
          focusDirection.current = e.shiftKey ? 'backward' : 'forward';
          const focusables = getFocusableElements();
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        }
      };
      const onFocusIn = (event: FocusEvent) => {
        const container = dialogRef.current;
        if (!container) return;
        const target = event.target as HTMLElement | null;
        if (!target || container.contains(target)) return;
        const focusables = getFocusableElements();
        if (focusables.length === 0) return;
        if (focusDirection.current === 'backward') {
          focusables[focusables.length - 1].focus();
        } else {
          focusables[0].focus();
        }
      };

      document.addEventListener('keydown', onKey);
      document.addEventListener('focusin', onFocusIn);
      return () => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('focusin', onFocusIn);
      };
    } else {
      // restore focus
      lastFocused.current?.focus();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="update-modal w-[min(92vw,720px)] max-h-[80vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 outline-none"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <span
          tabIndex={0}
          aria-hidden="true"
          data-focus-guard
          className="sr-only"
          onFocus={focusLastFocusable}
        />
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 id="update-modal-title" className="text-xl font-bold text-white">What’s New</h2>
          <button
            type="button"
            className="rounded-full p-2 text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </header>
        <main className="update-modal-body max-w-none overflow-y-auto p-4">
          <div
            className="update-modal-html text-slate-200"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
        <footer className="flex items-center justify-end gap-2 border-t border-slate-800 p-4">
          <button
            type="button"
            className="rounded-xl border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => {
              onAcknowledge();
              onClose();
            }}
          >
            Got it
          </button>
        </footer>
        <span
          tabIndex={0}
          aria-hidden="true"
          data-focus-guard
          className="sr-only"
          onFocus={focusFirstFocusable}
        />
      </div>
    </div>
  );
};
