import React from 'react';
import { LinkItemData } from '../types';
import { LinkItem } from './LinkItem';

interface LinkListProps {
    links: LinkItemData[];
    openedLinks: { [url: string]: number };
    onDelete: (id: string, url: string) => void;
    onOpen: (url: string) => void;
    actions: {
        timeoutUser: (username: string, minutes: number) => void;
        timeoutLink: (url: string, minutes: number) => void;
        blacklistUser: (username: string) => void;
        blacklistLink: (url: string) => void;
    };
}

export const LinkList: React.FC<LinkListProps> = ({ links, openedLinks, onDelete, onOpen, actions }) => {
    if (links.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ghost mb-4"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 21l3-3V10a8 8 0 0 0-8-8z"/></svg>
                <p className="text-xl font-medium">No links to display.</p>
                <p>Waiting for new messages...</p>
            </div>
        )
    }

    return (
        <div className="p-2 sm:p-4 space-y-3">
            {links.map(link => (
                <LinkItem
                    key={link.id}
                    link={link}
                    isOpened={!!(link.url && openedLinks[link.url])}
                    onDelete={onDelete}
                    onOpen={onOpen}
                    actions={actions}
                />
            ))}
        </div>
    );
};
