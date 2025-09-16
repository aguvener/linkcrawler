import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    labelledById?: string;
    describedById?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, labelledById, describedById }) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const headerId = labelledById || 'modal-title';
    const descId = describedById || 'modal-desc';

    useEffect(() => {
        if (!isOpen) return;

        // Prevent body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Focus trap: focus first focusable (close button)
        closeBtnRef.current?.focus();

        // ESC to close
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
            if (e.key === 'Tab' && dialogRef.current) {
                const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
                if (list.length === 0) return;
                const first = list[0];
                const last = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={headerId}
                aria-describedby={descId}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in-down"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 id={headerId} className="text-xl font-bold text-white">{title}</h2>
                    <button
                        ref={closeBtnRef}
                        onClick={onClose}
                        title="Close Modal"
                        aria-label="Close Modal"
                        className="p-1 rounded-full text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline focus-visible:outline-offset-2"
                        style={{ outlineColor: 'var(--color-primary)' }}
                    >
                        <X size={24} />
                    </button>
                </header>
                <main id={descId} className="overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};
