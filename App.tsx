
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Favicon from 'react-favicon';
import { LinkItemData, FilterType, Settings } from './types';
import { useKickChat } from './hooks/useKickChat';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { useTestMode } from './hooks/useTestMode';
import { CONNECTION_CONFIG, DEFAULT_BEEP_THRESHOLD, DEFAULT_TRUSTED_USERS, LINK_HISTORY_HOURS, MAX_DISPLAY_LINKS, PROGRESS_GOAL, STORAGE_KEYS, STATUS_MESSAGES } from './constants';
import { getUserInfo } from './services/kickService';
import * as audioService from './services/audioService';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LinkList } from './components/LinkList';
import { Spinner } from './components/ui/Spinner';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { SettingsModal } from './components/modals/SettingsModal';
import { BatchOpenModal } from './components/modals/BatchOpenModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { HelpModal } from './components/modals/HelpModal';
import { useUpdateNotifications } from './hooks/useUpdateNotifications';


const App: React.FC = () => {
    const [user, setUser] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing...');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const [linkMap, setLinkMap] = useState<Map<string, LinkItemData>>(new Map());
    const [totalMessages, setTotalMessages] = useLocalStorage<number>(STORAGE_KEYS.TOTAL_MESSAGES, 0);

    const [blacklist, setBlacklist] = useLocalStorage<string[]>(STORAGE_KEYS.BLACKLIST, []);
    const [linkBlacklist, setLinkBlacklist] = useLocalStorage<string[]>(STORAGE_KEYS.LINK_BLACKLIST, []);
    const [trustedUsers, setTrustedUsers] = useLocalStorage<string[]>(STORAGE_KEYS.TRUSTED, DEFAULT_TRUSTED_USERS);
    const [openedLinks, setOpenedLinks] = useLocalStorage<{ [url: string]: number }>(STORAGE_KEYS.OPENED_LINKS, {});
    const [history, setHistory] = useLocalStorage<LinkItemData[]>(STORAGE_KEYS.HISTORY, []);
    const [testMode, setTestMode] = useLocalStorage<boolean>(STORAGE_KEYS.TEST_MODE, false);

    const [linkTimeouts, setLinkTimeouts] = useState<Map<string, number>>(new Map());
    const [userTimeouts, setUserTimeouts] = useState<Map<string, number>>(new Map());
    const [senderCounts, setSenderCounts] = useLocalStorage<Record<string, number>>(STORAGE_KEYS.SENDER_COUNTS, {});
    const [suggestionThreshold, setSuggestionThreshold] = useLocalStorage<number>(STORAGE_KEYS.SUGGESTION_THRESHOLD, 3);

    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>(FilterType.ALL);
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isBatchOpenModalOpen, setIsBatchOpenModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Update notifications integration
    // Version is injected at build via Vite define
    const APP_VERSION: string = (import.meta as any).env?.VITE_APP_VERSION || '1.3.0';
    const { isOpen: isUpdateOpen, html: updateHtml, close: closeUpdate, acknowledge: acknowledgeUpdate } =
        useUpdateNotifications({
            appVersion: APP_VERSION,
            changelogUrl: '/CHANGELOG.md',
            checkOnIntervalMs: 0, // no polling
            minorMajorOnly: true, // show only for minor/major by default
            allowPrereleaseIfFromPrerelease: true, // prereleases eligible if last seen is prerelease
        });
    
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const addLink = useCallback((newLinkData: LinkItemData) => {
        setLinkMap(prevMap => {
            const newMap = new Map(prevMap);
            const sanitizedUrl = newLinkData.url.toLowerCase().trim();
            if(newMap.has(sanitizedUrl)){
                const existing = newMap.get(sanitizedUrl)!;
                existing.count += 1;
                existing.isDuplicate = true;
                existing.timestamp = newLinkData.timestamp; // update timestamp
                newMap.delete(sanitizedUrl); // re-insert to bring to top
                newMap.set(sanitizedUrl, existing);
            } else {
                newMap.set(sanitizedUrl, newLinkData);
            }

            // Prune old links
             if (newMap.size > MAX_DISPLAY_LINKS) {
                const oldestKey = Array.from(newMap.keys())[0];
                newMap.delete(oldestKey);
            }
            return newMap;
         });
    }, []);

    useTestMode(testMode, addLink);

    const handleNewMessage = useCallback((msgData: any) => {
        setTotalMessages(prev => prev + 1);

        const { content, sender, created_at } = msgData;
        const senderUsername = sender.username;
        const lowerCaseSender = senderUsername.toLowerCase();
        
        const isMod = sender.identity.badges.some((b: any) => b.type === 'moderator' || b.type === 'broadcaster');
        if(isMod && !trustedUsers.includes(lowerCaseSender)) {
            setTrustedUsers(prev => [...prev, lowerCaseSender]);
        }

        if (blacklist.includes(lowerCaseSender) || userTimeouts.has(lowerCaseSender)) return;

        // Command handling
        if (content.startsWith('!blacklist ') && (isMod || trustedUsers.includes(lowerCaseSender))) {
            const userToBlacklist = content.split(' ')[1]?.toLowerCase();
            if (userToBlacklist && !DEFAULT_TRUSTED_USERS.includes(userToBlacklist)) {
                setBlacklist(prev => [...new Set([...prev, userToBlacklist])]);
                showToast(`User "${userToBlacklist}" has been blacklisted.`, 'success');
            }
            return;
        }

        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        const urlsFound = content.match(urlRegex);
        const messageWithoutLinks = content.replace(urlRegex, '').trim();
        const urgent = (isMod || trustedUsers.includes(lowerCaseSender)) && (content.toUpperCase().includes('!ACIL') || content.toUpperCase().includes('!ACİL'));

        const processLink = (url: string, isUrgent: boolean) => {
             let properUrl = url;
             if (!/^(https?|ftp|file):\/\//i.test(url)) {
                properUrl = 'http://' + url;
             }
             const sanitizedUrl = properUrl.toLowerCase().trim();

             if(linkBlacklist.includes(sanitizedUrl) || linkTimeouts.has(sanitizedUrl)) return;

             const newLinkData: LinkItemData = {
                id: msgData.id + sanitizedUrl,
                url: properUrl,
                displayText: url,
                sender: senderUsername,
                timestamp: new Date(created_at).getTime(),
                message: messageWithoutLinks,
                count: 1,
                isDuplicate: false,
                urgent: isUrgent,
                isHistory: false
             };

             addLink(newLinkData);

             // Track sender link frequency for suggestions (persisted)
             setSenderCounts(prev => ({ ...prev, [lowerCaseSender]: (prev[lowerCaseSender] || 0) + 1 }));

             if(isUrgent) {
                audioService.speakText(`${senderUsername} sent an urgent link!`);
                showToast(`Urgent link from ${senderUsername}!`, 'info');
             }
        };

        if (urlsFound) {
            urlsFound.forEach((url: string) => processLink(url, urgent));
        } else if (urgent) {
            const urgentMessage: LinkItemData = {
                id: msgData.id,
                url: '',
                displayText: '',
                sender: senderUsername,
                timestamp: new Date(created_at).getTime(),
                message: content,
                count: 1,
                isDuplicate: false,
                urgent: true,
                isHistory: false
            };
            setLinkMap(prevMap => {
                const newMap = new Map(prevMap);
                newMap.set(urgentMessage.id, urgentMessage);
                return newMap;
            });
            audioService.speakText(`${senderUsername} says: ${content}`);
            showToast(`Urgent message from ${senderUsername}!`, 'info');
        }

    }, [blacklist, linkBlacklist, trustedUsers, linkTimeouts, userTimeouts, setTotalMessages, showToast, setBlacklist, setTrustedUsers, addLink]);

    const handleClearChat = useCallback(() => {
        setLinkMap(new Map());
        showToast('Chat has been cleared!', 'info');
    }, [showToast]);

    const { isConnected, isConnecting, error, retryCount, connect, reconnect } = useKickChat(user, handleNewMessage, handleClearChat, setStatus);
    const [chatroomId, setChatroomId] = useState<number | null>(null);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const DEFAULT_USER = (import.meta as any).env?.VITE_DEFAULT_USER || 'BurakSakinOl';
        const userParam = params.get('user') || DEFAULT_USER;
        
        // Only run this effect once on mount
        if (user) return;
        
        const initAudio = () => {
            audioService.initializeAudio();
            window.removeEventListener('pointerdown', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('pointerdown', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        setStatus(STATUS_MESSAGES.FETCHING_USER(userParam));
        getUserInfo(userParam).then(info => {
            console.log('User info received:', info);
            
            // Validate that we have valid user info and chatroom data
            if (!info) {
                setStatus(STATUS_MESSAGES.USER_NOT_FOUND(userParam));
                return;
            }
            
            // Check if chatroom exists and has valid ID
            if (!info.chatroom || !info.chatroom.id || typeof info.chatroom.id !== 'number') {
                console.error('Invalid chatroom data:', info.chatroom);
                setStatus(STATUS_MESSAGES.INVALID_CHATROOM(userParam));
                return;
            }
            
            // Valid user and chatroom found - proceed with connection
            console.log(`Connecting to chatroom ${info.chatroom.id} for user ${userParam}`);
            setUser(userParam);
            setChatroomId(info.chatroom.id);
            setStatus(STATUS_MESSAGES.CONNECTING(userParam));
            connect(info.chatroom.id);
        }).catch((error) => {
            console.error('Failed to fetch user info:', error);
            
            // Handle specific HTTP error codes
            if (error.message.includes('404') || error.message.includes('status: 404')) {
                setStatus(STATUS_MESSAGES.USER_NOT_FOUND(userParam));
            } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                setStatus(STATUS_MESSAGES.API_ERROR);
            } else if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                // Network connectivity issues
                setStatus(STATUS_MESSAGES.API_ERROR);
            } else {
                // Generic error fallback
                setStatus(STATUS_MESSAGES.API_ERROR);
            }
        });

        const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        return () => {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
        }
    }, []); // Remove connect from dependencies to prevent infinite loop

    useEffect(() => {
        // Load history into linkMap on startup
        const now = Date.now();
        const historyExpiry = now - (LINK_HISTORY_HOURS * 60 * 60 * 1000);
        const validHistory = history.filter(item => item.timestamp > historyExpiry);
        
        setLinkMap(prevMap => {
            const newMap = new Map(prevMap);
            validHistory.forEach(item => {
                const key = item.url ? item.url.toLowerCase().trim() : item.id;
                if (!newMap.has(key)) {
                    newMap.set(key, { ...item, isHistory: true });
                }
            });
            return newMap;
        });
        if(validHistory.length !== history.length) {
            setHistory(validHistory);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    useEffect(() => {
        // Persist non-history items from linkMap to history
        const currentLinks = Array.from(linkMap.values()).filter(link => !link.isHistory);
        const newHistory = [...history, ...currentLinks];
        const now = Date.now();
        const historyExpiry = now - (LINK_HISTORY_HOURS * 60 * 60 * 1000);
        const validHistory = newHistory.filter(item => item.timestamp > historyExpiry);
        const uniqueHistory = Array.from(new Map(validHistory.map(item => [item.id, item])).values());
        
        const saveHistoryDebounced = setTimeout(() => {
             setHistory(uniqueHistory);
        }, 2000);

        return () => clearTimeout(saveHistoryDebounced);

    }, [linkMap, history, setHistory]);

    const handleBatchOpen = (count: number, fromTop: boolean, openAll: boolean) => {
        const unreadLinks = filteredLinks.filter(link => link.url && !openedLinks[link.url]);

        if (unreadLinks.length === 0) {
            showToast('No new links to open.', 'info');
            return;
        }

        const linksToProcess = openAll 
            ? unreadLinks 
            : fromTop
                ? unreadLinks.slice(0, count)
                : unreadLinks.slice(-count);

        if (linksToProcess.length === 0) {
            showToast('No links to open with current settings.', 'info');
            return;
        }

        if (window.confirm(`This will open ${linksToProcess.length} new tabs and remove them from the list. Continue?`)) {
            const newOpenedLinks = { ...openedLinks };
            let openedCount = 0;

            linksToProcess.forEach((link, index) => {
                setTimeout(() => {
                    const newTab = window.open(link.url, '_blank', 'noopener,noreferrer');
                    if (newTab) {
                        newOpenedLinks[link.url] = Date.now();
                        openedCount++;
                    } else {
                        // Pop-up might be blocked, but we don't want to show a toast.
                    }

                    if (index === linksToProcess.length - 1) {
                        setOpenedLinks(newOpenedLinks);
                        setLinkMap(prev => {
                            const newMap = new Map(prev);
                            linksToProcess.forEach(l => {
                                const key = l.url ? l.url.toLowerCase().trim() : l.id;
                                newMap.delete(key);
                            });
                            return newMap;
                        });
                        showToast(`${openedCount} links opened and cleared.`, 'success');
                    }
                }, index * 200); // 200ms delay between each open
            });
        }
    };
    
    const handleDeleteLink = (id: string, url: string) => {
        setLinkMap(prev => {
            const newMap = new Map(prev);
            const key = url ? url.toLowerCase().trim() : id;
            newMap.delete(key);
            return newMap;
        });
    };

    const handleMarkAsOpened = (url: string) => {
        if (!url) return;
        setOpenedLinks(prev => ({...prev, [url]: Date.now()}));
    };

    const sortedLinks = useMemo(() => {
        return Array.from(linkMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    }, [linkMap]);

    const filteredLinks = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        return sortedLinks.filter(link => {
            const matchesQuery = query ? (
                link.displayText.toLowerCase().includes(query) ||
                link.sender.toLowerCase().includes(query) ||
                link.message.toLowerCase().includes(query)
            ) : true;

            if (!matchesQuery) return false;

            switch (filter) {
                case FilterType.URGENT:
                    return link.urgent && !link.isHistory;
                case FilterType.DUPLICATES:
                    return link.isDuplicate && !link.isHistory;
                case FilterType.HISTORY:
                    return link.isHistory;
                case FilterType.ALL:
                default:
                    return !link.isHistory;
            }
        });
    }, [sortedLinks, debouncedSearchQuery, filter]);

    const exportSettings = () => {
        const settings: Settings = {
            [STORAGE_KEYS.BLACKLIST]: blacklist,
            [STORAGE_KEYS.TRUSTED]: trustedUsers,
            [STORAGE_KEYS.LINK_BLACKLIST]: linkBlacklist,
            [STORAGE_KEYS.OPENED_LINKS]: openedLinks,
            [STORAGE_KEYS.HISTORY]: history,
            [STORAGE_KEYS.BEEP_THRESHOLD]: localStorage.getItem(STORAGE_KEYS.BEEP_THRESHOLD) || DEFAULT_BEEP_THRESHOLD,
        };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kick_crawler_settings_${user}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Settings exported!', 'success');
    };

    const importSettings = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if(typeof text !== 'string') throw new Error('Invalid file content');
                const settings: Settings = JSON.parse(text);

                if (settings[STORAGE_KEYS.BLACKLIST]) setBlacklist(settings[STORAGE_KEYS.BLACKLIST]);
                if (settings[STORAGE_KEYS.TRUSTED]) setTrustedUsers(settings[STORAGE_KEYS.TRUSTED]);
                if (settings[STORAGE_KEYS.LINK_BLACKLIST]) setLinkBlacklist(settings[STORAGE_KEYS.LINK_BLACKLIST]);
                if (settings[STORAGE_KEYS.OPENED_LINKS]) setOpenedLinks(settings[STORAGE_KEYS.OPENED_LINKS]);
                if (settings[STORAGE_KEYS.HISTORY]) setHistory(settings[STORAGE_KEYS.HISTORY]);
                // Other settings can be handled similarly
                
                showToast('Settings imported successfully!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                showToast('Failed to import settings. Invalid file.', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    // (CSV export removed per request)

    // Keyboard shortcuts: '/', 'b', '?'
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
            if (typing) return;
            if (e.key === '/') {
                e.preventDefault();
                const el = document.getElementById('app-search-input') as HTMLInputElement | null;
                el?.focus();
            } else if (e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setIsBatchOpenModalOpen(true);
            } else if (e.key === '?') {
                e.preventDefault();
                setIsHelpOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const mainContent = useMemo(() => {
        if (!user || !isConnected) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    {isConnecting ? (
                        <>
                            <Spinner />
                            <p className="mt-4 text-lg animate-pulse">{status}</p>
                            <p className="mt-2 text-sm text-slate-500">
                                {error ? `Error: ${error}` : 'Establishing connection...'}
                            </p>
                        </>
                    ) : (
                        <>
                            <Spinner />
                            <p className="mt-4 text-lg animate-pulse">{status}</p>
                            {error && (
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-red-400 mb-3">
                                        {error}
                                    </p>
                                    {chatroomId && (
                                        <button
                                            onClick={() => reconnect(chatroomId)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm transition-colors"
                                        >
                                            Retry Connection
                                        </button>
                                    )}
                                </div>
                            )}
                            {retryCount > 0 && (
                                <p className="mt-2 text-xs text-slate-500">
                                    Retry attempt: {retryCount}/{CONNECTION_CONFIG.MAX_RETRIES}
                                </p>
                            )}
                        </>
                    )}
                </div>
            );
        }
        return (
            <LinkList
                links={filteredLinks}
                openedLinks={openedLinks}
                onDelete={handleDeleteLink}
                onOpen={handleMarkAsOpened}
                actions={{
                    timeoutUser: (username, minutes) => {
                        const expiry = Date.now() + minutes * 60 * 1000;
                        setUserTimeouts(prev => new Map(prev).set(username.toLowerCase(), expiry));
                        showToast(`User ${username} timed out for ${minutes} min.`, 'success');
                    },
                    timeoutLink: (url, minutes) => {
                        const expiry = Date.now() + minutes * 60 * 1000;
                        setLinkTimeouts(prev => new Map(prev).set(url.toLowerCase(), expiry));
                        showToast(`Link timed out for ${minutes} min.`, 'success');
                    },
                    blacklistUser: (username) => {
                        if (!DEFAULT_TRUSTED_USERS.includes(username.toLowerCase())) {
                            setBlacklist(prev => [...new Set([...prev, username.toLowerCase()])]);
                             showToast(`User ${username} blacklisted.`, 'success');
                        } else {
                             showToast(`Cannot blacklist a default trusted user.`, 'error');
                        }
                    },
                    blacklistLink: (url) => {
                        setLinkBlacklist(prev => [...new Set([...prev, url.toLowerCase()])]);
                        showToast(`Link blacklisted.`, 'success');
                    }
                }}
            />
        );
    }, [user, isConnected, isConnecting, error, status, filteredLinks, openedLinks, showToast, handleDeleteLink, handleMarkAsOpened, setBlacklist, setLinkBlacklist, setLinkTimeouts, setUserTimeouts]);

    // Suggested trusted users based on frequent link senders
    const suggestedTrusted = useMemo(() => {
        const entries = Object.entries(senderCounts);
        const filtered = entries
          .filter(([u, c]) => c >= suggestionThreshold && !trustedUsers.includes(u) && !blacklist.includes(u))
          .map(([username, count]) => ({ username, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        return filtered;
    }, [senderCounts, trustedUsers, blacklist, suggestionThreshold]);

    const addTrustedMany = useCallback((users: string[]) => {
        const cleaned = users.map(u => u.trim().toLowerCase()).filter(Boolean);
        const before = new Set(trustedUsers);
        const merged = new Set([...trustedUsers, ...cleaned]);
        const added = [...merged].filter(u => !before.has(u));
        setTrustedUsers([...merged]);
        if (added.length) showToast(`Added ${added.length} trusted user(s).`, 'success');
    }, [trustedUsers, setTrustedUsers, showToast]);


    return (
        <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
            <Favicon url="/favicon.ico" alertCount={filteredLinks.filter(link => link.url && !openedLinks[link.url]).length} iconSize={128} />
            {/* Full-bleed sticky header */}
                    <Header
                        progress={totalMessages}
                        goal={PROGRESS_GOAL}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filter={filter}
                        setFilter={setFilter}
                        user={user}
                        isConnected={isConnected}
                    />
            {/* Main content flows naturally - no forced height */}
            <main className="pt-20 pb-4">
                <div className="container">
                    {mainContent}
                </div>
            </main>
            {/* Footer flows after content - no gap */}
                    <Footer
                        onBatchOpen={() => setIsBatchOpenModalOpen(true)}
                        onSettings={() => setIsSettingsModalOpen(true)}
                        openLinkCount={filteredLinks.filter(link => link.url && !openedLinks[link.url]).length}
                        user={user}
                    />
            <BatchOpenModal
                isOpen={isBatchOpenModalOpen}
                onClose={() => setIsBatchOpenModalOpen(false)}
                onConfirm={handleBatchOpen}
                totalLinks={filteredLinks.filter(link => link.url && !openedLinks[link.url]).length}
            />
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                blacklist={blacklist}
                setBlacklist={setBlacklist}
                linkBlacklist={linkBlacklist}
                setLinkBlacklist={setLinkBlacklist}
                trustedUsers={trustedUsers}
                setTrustedUsers={setTrustedUsers}
                linkTimeouts={linkTimeouts}
                setLinkTimeouts={setLinkTimeouts}
                userTimeouts={userTimeouts}
                setUserTimeouts={setUserTimeouts}
                onExport={exportSettings}
                onImport={importSettings}
                showToast={showToast}
                testMode={testMode}
                setTestMode={setTestMode}
                suggestedTrusted={suggestedTrusted}
                onAddTrustedMany={addTrustedMany}
                suggestionThreshold={suggestionThreshold}
                setSuggestionThreshold={setSuggestionThreshold}
                onClearSenderActivity={() => setSenderCounts({})}
            />
            {/* Update Notification Modal */}
            <UpdateModal
                isOpen={isUpdateOpen}
                onClose={closeUpdate}
                onAcknowledge={acknowledgeUpdate}
                html={updateHtml}
            />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <ToastContainer toasts={toasts} />
        </div>
    );
};

export default App;
