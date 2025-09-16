import React, { useEffect, useRef } from 'react';

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      lastFocused.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 0);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    } else {
      lastFocused.current?.focus();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-[min(92vw,640px)] max-h-[80vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 outline-none"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 id="help-modal-title" className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            type="button"
            className="rounded-full p-2 text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </header>
        <main className="p-4 text-slate-200">
          <ul className="space-y-2">
            <li><b>/</b> — Focus search</li>
            <li><b>b</b> — Open Batch Open modal</li>
            <li><b>?</b> — Toggle this help</li>
            <li><b>Esc</b> — Close modals/tooltips</li>
          </ul>
          <p className="mt-4 text-sm text-slate-400">Shortcuts are ignored while typing in inputs.</p>
        </main>
      </div>
    </div>
  );
};

