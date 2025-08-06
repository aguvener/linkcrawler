import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterType } from '../../types';
import { Search, SlidersHorizontal, User, Github, Pencil, Check, X } from 'lucide-react';

interface HeaderProps {
    progress: number;
    goal: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    user: string | null;
    isConnected: boolean;

    /**
     * Persist a username change. Parent must update the user prop on success.
     * If not provided, Header will fall back to Kick API getUserInfo to validate the username exists,
     * then optimistically update the local display name to avoid user confusion.
     */
    onSaveUsername?: (newUsername: string) => Promise<void>;
}

const validateUsername = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return 'Username cannot be empty.';
    if (value.length < 3 || value.length > 30) return 'Username must be 3–30 characters.';
    if (!/^[A-Za-z0-9_]+$/.test(value)) return 'Use letters, numbers, or underscores only.';
    return null;
};

export const Header: React.FC<HeaderProps> = ({searchQuery, setSearchQuery, filter, setFilter, user, isConnected, onSaveUsername }) => {
    // Inline edit state
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // Local optimistic username to cover the case where parent hasn't yet updated prop
    const [optimisticUser, setOptimisticUser] = useState<string | null>(null);

    // Refs for focus management
    const inputRef = useRef<HTMLInputElement | null>(null);
    const editBtnRef = useRef<HTMLButtonElement | null>(null);

    // Keep draft in sync when entering edit mode
    const originalProp = user ?? '';
    const effectiveUser = optimisticUser ?? originalProp;
    const original = effectiveUser;
    const trimmedDraft = useMemo(() => draft.trim(), [draft]);
    const hasChanges = useMemo(() => trimmedDraft !== original.trim() && trimmedDraft.length > 0, [trimmedDraft, original]);

    useEffect(() => {
        if (isEditing) {
            setDraft(original);
            // focus after a tick to ensure element is mounted
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    const startEdit = useCallback(() => {
        setError(null);
        setIsEditing(true);
    }, []);

    const cancelEdit = useCallback(() => {
        setDraft(original);
        setError(null);
        setIsEditing(false);
        // return focus to the Edit button
        setTimeout(() => editBtnRef.current?.focus(), 0);
    }, [original]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void (async () => { await saveDraft(); })();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit, trimmedDraft, isSaving, onSaveUsername]);

    const saveDraft = useCallback(async () => {
        if (isSaving) return;
        const validation = validateUsername(draft);
        if (validation) {
            setError(validation);
            return;
        }
        if (!hasChanges) return;

        setIsSaving(true);
        setError(null);
        try {
            // API requires "_" -> "-" conversion, but keep UI as typed
            const apiUsername = trimmedDraft.split('_').join('-');

            if (onSaveUsername) {
                // Parent-provided persistence
                await onSaveUsername(apiUsername);
            } else {
                // Validate via Kick API so user gets immediate feedback
                const { getUserInfo } = await import('../../services/kickService');
                await getUserInfo(apiUsername);
                // Optimistically reflect username until parent prop updates
                setOptimisticUser(trimmedDraft);
            }

            setIsEditing(false);
            // Focus back to Edit
            setTimeout(() => editBtnRef.current?.focus(), 0);
        } catch (err) {
            // Revert any optimistic value on error
            setOptimisticUser(null);
            setError(err instanceof Error ? err.message : 'Failed to update username. Please try again.');
            // keep edit mode; refocus input for retry
            setTimeout(() => inputRef.current?.focus(), 0);
        } finally {
            setIsSaving(false);
        }
    }, [draft, hasChanges, isSaving, onSaveUsername, trimmedDraft]);

    return (
        <header className="bg-slate-900/80 backdrop-blur-sm shadow-lg shadow-black/20 p-3 z-20">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <img src="https://kick.com/favicon.ico" alt="Kick Logo" className="w-6 h-6 rounded-md"/>
                        <h1 className="text-xl font-bold text-white hidden sm:block">
                            Kick Link Crawler
                        </h1>
                    </div>
                    <a href="https://github.com/aguvener/linkcrawler" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                        <Github size={24} />
                    </a>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                    <User size={16} />

                    {!isEditing ? (
                        <>
                            <span className="font-medium">{original || '...'}</span>
                            <button
                                ref={editBtnRef}
                                type="button"
                                onClick={startEdit}
                                className="inline-flex items-center p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                aria-label="Edit username"
                                title="Edit username"
                            >
                                <Pencil size={16} />
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <label htmlFor="username-input" className="sr-only">Username</label>
                            <input
                                id="username-input"
                                ref={inputRef}
                                type="text"
                                value={draft}
                                onChange={(e) => {
                                    setDraft(e.target.value);
                                    if (error) setError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                aria-invalid={!!error}
                                aria-describedby={error ? 'username-error' : undefined}
                                className="w-36 sm:w-44 md:w-56 bg-slate-800 border border-slate-700 rounded-md py-1 px-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Enter username"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                inputMode="text"
                                name="username"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => void saveDraft()}
                                disabled={isSaving || !hasChanges || !!validateUsername(draft)}
                                className={`inline-flex items-center p-1 rounded ${isSaving || !hasChanges || !!validateUsername(draft) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                                aria-label={isSaving ? 'Saving...' : 'Save username'}
                                title={isSaving ? 'Saving...' : 'Save'}
                            >
                                {isSaving ? (
                                    // subtle loading: animate pulse on icon
                                    <Check size={16} className="animate-pulse" />
                                ) : (
                                    <Check size={16} />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex items-center p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                aria-label="Cancel editing username"
                                title="Cancel"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
                </div>
            </div>
            <div className="mt-1">
                {isEditing && error && (
                    <p id="username-error" role="alert" className="text-xs text-red-400 mt-1">{error}</p>
                )}
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
