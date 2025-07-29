import React from 'react';
import { FilterType } from '../../types';
import { Search, SlidersHorizontal, User } from 'lucide-react';

interface HeaderProps {
    progress: number;
    goal: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    user: string | null;
    isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({searchQuery, setSearchQuery, filter, setFilter, user, isConnected }) => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-sm shadow-lg shadow-black/20 p-3 z-20">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <img src="https://kick.com/favicon.ico" alt="Kick Logo" className="w-6 h-6 rounded-md"/>
                    <h1 className="text-xl font-bold text-white hidden sm:block">
                        Kick Link Crawler
                    </h1>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                    <User size={16} />
                    <span className="font-medium">{user || '...'}</span>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
                <div className="relative col-span-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search links, senders, messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="relative col-span-1">
                    <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <select
                        value={filter}
                        title="Filter Links"
                        onChange={(e) => setFilter(e.target.value as FilterType)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2 pl-10 pr-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value={FilterType.ALL}>All New Links</option>
                        <option value={FilterType.URGENT}>Urgent</option>
                        <option value={FilterType.DUPLICATES}>Duplicates</option>
                        <option value={FilterType.HISTORY}>History</option>
                    </select>
                </div>
            </div>
        </header>
    );
};
