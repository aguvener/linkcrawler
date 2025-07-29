import React, { useState } from 'react';
import { LinkItemData } from '../types';
import { Clock, User, MessageSquare, ExternalLink, Trash2, ShieldBan, Link2Off, Timer, UserX } from 'lucide-react';

interface LinkItemProps {
    link: LinkItemData;
    isOpened: boolean;
    onDelete: (id: string, url: string) => void;
    onOpen: (url: string) => void;
    actions: {
        timeoutUser: (username: string, minutes: number) => void;
        timeoutLink: (url: string, minutes: number) => void;
        blacklistUser: (username: string) => void;
        blacklistLink: (url: string) => void;
    };
}

export const LinkItem: React.FC<LinkItemProps> = ({ link, isOpened, onDelete, onOpen, actions }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const time = new Date(link.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const domain = link.url ? new URL(link.url).hostname : '';
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';

    const baseClasses = "relative flex flex-col sm:flex-row items-start px-4 py-2 rounded-2xl border transition-all duration-300 group";
    const colorClasses = link.urgent 
        ? 'bg-red-900/20 border-red-500/50 hover:bg-red-900/30 hover:shadow-red-500/20' 
        : link.isHistory 
        ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80'
        : 'bg-slate-800 border-slate-700 hover:bg-slate-700/50 hover:shadow-cyan-500/10';
    
    const opacityClass = isOpened ? 'opacity-50' : 'opacity-100';

    const handleAction = (actionFn: () => void) => {
        setIsDeleting(true);
        setTimeout(() => actionFn(), 300); // Wait for animation
    };
    
    const performDelete = () => handleAction(() => onDelete(link.id, link.url));
    const performOpen = (_e: React.MouseEvent<HTMLButtonElement>) => {
        if (!link.url) return;
        window.open(link.url, '_blank', 'noopener,noreferrer');
        handleAction(() => {
            onOpen(link.url!);
            onDelete(link.id, link.url);
        });
    };
    
    const handleModeration = (type: 'timeoutUser' | 'timeoutLink' | 'blacklistUser' | 'blacklistLink') => {
        const minutesPrompt = (title: string) => {
            const minutesStr = prompt(title, '10');
            const minutes = parseInt(minutesStr || '0', 10);
            return (minutes && minutes > 0) ? minutes : null;
        }

        switch(type) {
            case 'timeoutUser': {
                const minutes = minutesPrompt(`Timeout ${link.sender} for how many minutes?`);
                if(minutes) {
                    actions.timeoutUser(link.sender, minutes);
                    performDelete();
                }
                break;
            }
            case 'timeoutLink': {
                 if(!link.url) return;
                 const minutes = minutesPrompt(`Timeout this link for how many minutes?`);
                 if(minutes) {
                    actions.timeoutLink(link.url, minutes);
                    performDelete();
                 }
                 break;
            }
            case 'blacklistUser': {
                if(window.confirm(`Are you sure you want to blacklist ${link.sender}?`)) {
                    actions.blacklistUser(link.sender);
                    performDelete();
                }
                break;
            }
            case 'blacklistLink': {
                if(!link.url) return;
                if(window.confirm(`Are you sure you want to blacklist this link?`)) {
                    actions.blacklistLink(link.url);
                    performDelete();
                }
                break;
            }
        }
    };

    return (
        <div className={`items-center justify-center flex-shrink-0 ${baseClasses} ${colorClasses} ${opacityClass} ${isDeleting ? 'animate-slide-out-left' : 'animate-slide-in-down'}`}>
            {link.count > 1 && (
                <div className="absolute -top-2 -left-2 w-7 h-7 bg-cyan-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-slate-900 z-10">
                    {link.count}
                </div>
            )}
            {link.urgent && (
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900 z-10">
                    URGENT
                </div>
            )}
            
            <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 flex items-center justify-center">
                    {faviconUrl ? <img src={faviconUrl} alt="favicon" className="w-4 h-4" onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }} /> : null}
                    <Link2Off size={16} className={`text-slate-400 ${faviconUrl ? 'hidden' : ''}`}/>
                </div>
                <div className="flex items-center justify-center text-sm text-slate-400">
                    <Clock size={12} className="mr-1"/> {time}
                </div>
            </div>

            <div className={`flex-grow min-w-0 items-center h-full ml-2 ${!link.message ? 'flex items-center' : ''}`}>

                {link.message && (
                    <div className="flex items-start items-center text-slate-300 text-sm">
                        <MessageSquare size={14} className="flex-shrink-0 text-slate-500 mr-1.5"/>
                        <p className="italic">{link.message}</p>
                    </div>
                )}

                {link.url && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                            <User size={14} className="mr-1.5"/> 
                            <span className="font-semibold text-slate-300 flex items-center justify-center">{link.sender}:</span>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" 
                           onClick={() => onOpen(link.url)}
                           className="text-cyan-400 font-medium break-all hover:underline hover:text-cyan-300 transition-colors">
                            {link.displayText || link.url}
                        </a>
                    </div>
                )}

            </div>

            <div className="grid grid-cols-3 gap-0 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 self-center">
                <button type="button" title="Timeout User" onClick={() => handleModeration('timeoutUser')} className="p-2 rounded-full hover:bg-yellow-500/20 text-yellow-500"><UserX size={16} /></button>
                <button type="button" title="Blacklist User" onClick={() => handleModeration('blacklistUser')} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><ShieldBan size={16} /></button>
                <button type="button" title="Open & Remove" onClick={performOpen} onAuxClick={performOpen} disabled={!link.url} className="p-2 rounded-full hover:bg-green-500/20 text-green-500 disabled:opacity-30 disabled:cursor-not-allowed"><ExternalLink size={16} /></button>
                <button type="button" title="Timeout Link" onClick={() => handleModeration('timeoutLink')} disabled={!link.url} className="p-2 rounded-full hover:bg-yellow-500/20 text-yellow-500 disabled:opacity-30 disabled:cursor-not-allowed"><Timer size={16} /></button>
                <button type="button" title="Blacklist Link" onClick={() => handleModeration('blacklistLink')} disabled={!link.url} className="p-2 rounded-full hover:bg-red-500/20 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"><Link2Off size={16} /></button>
                <button type="button" title="Remove" onClick={performDelete} className="p-2 rounded-full hover:bg-red-500/20 text-red-500"><Trash2 size={16} /></button>
            </div>
        </div>
    );
};
