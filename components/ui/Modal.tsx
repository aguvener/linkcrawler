import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in-down"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        title="Close Modal"
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};
