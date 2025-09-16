import React from 'react';
import { Settings, Layers } from 'lucide-react';

interface FooterProps {
    onBatchOpen: () => void;
    onSettings: () => void;
    openLinkCount: number;
    user: string | null;
}

export const Footer: React.FC<FooterProps> = ({ onBatchOpen, onSettings, openLinkCount, user }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-lg border-t border-slate-800 p-2 z-20">
            <div className="container mx-auto flex justify-between items-center">
                <button
                    onClick={onBatchOpen}
                    disabled={openLinkCount === 0}
                    className="relative flex items-center space-x-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-3xl hover:bg-emerald-500 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                >
                    <Layers size={18} />
                    <span className="hidden sm:inline">Batch Open</span>
                    {openLinkCount > 0 && (
                         <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{openLinkCount}</span>
                    )}
                </button>

                <div className="text-sm text-slate-400 hidden sm:block">
                    Made with <span className="text-red-500">♥️</span> for <a href={`https://kick.com/${user}`} target="_blank" rel="noopener noreferrer" className="text-kick-green font-semibold hover:underline">{user}</a>
                </div>

                <button
                    onClick={onSettings}
                    className="flex items-center space-x-2 bg-slate-700 text-white font-bold py-2 px-4 rounded-3xl hover:bg-slate-600 transition-all duration-200 shadow-lg shadow-slate-700/20"
                >
                    <Settings size={18} />
                    <span className="hidden sm:inline">Settings</span>
                </button>
            </div>
        </footer>
    );
};
