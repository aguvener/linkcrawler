import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Upload, Download, Trash2, Shield, Link2Off, Clock, TestTube2 } from 'lucide-react';

interface ListManagementProps<T> {
    title: string;
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onAddItem?: (item: string) => boolean;
    onRemoveItem: (item: T) => void;
    placeholder?: string;
}

const ListManagement = <T extends string | { key: string; value: React.ReactNode }>({ title, items, renderItem, onAddItem, onRemoveItem, placeholder }: ListManagementProps<T>) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim() && onAddItem) {
            if(onAddItem(newItem.trim())){
                setNewItem('');
            }
        }
    };
    
    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
            {onAddItem && (
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder={placeholder || "Enter item..."}
                        className="flex-grow bg-slate-800 border border-slate-700 rounded-2xl py-1.5 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <Button onClick={handleAdd}>Add</Button>
                </div>
            )}
            <div className="max-h-48 overflow-y-auto bg-slate-950/50 p-2 rounded-2xl space-y-1">
                {items.length > 0 ? items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-800 p-2 rounded-2xl">
                        <span className="text-slate-300 break-all">{renderItem(item)}</span>
                        <button onClick={() => onRemoveItem(item)} className="p-1 text-red-500 hover:text-red-400" title="Remove item"><Trash2 size={16} /></button>
                    </div>
                )) : <p className="text-slate-500 text-center p-4">List is empty.</p>}
            </div>
        </div>
    );
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    blacklist: string[];
    setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
    linkBlacklist: string[];
    setLinkBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
    trustedUsers: string[];
    setTrustedUsers: React.Dispatch<React.SetStateAction<string[]>>;
    linkTimeouts: Map<string, number>;
    setLinkTimeouts: React.Dispatch<React.SetStateAction<Map<string, number>>>;
    userTimeouts: Map<string, number>;
    setUserTimeouts: React.Dispatch<React.SetStateAction<Map<string, number>>>;
    onExport: () => void;
    onImport: (file: File) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    testMode: boolean;
    setTestMode: React.Dispatch<React.SetStateAction<boolean>>;
    suggestedTrusted: { username: string; count: number }[];
    onAddTrustedMany: (users: string[]) => void;
    suggestionThreshold: number;
    setSuggestionThreshold: React.Dispatch<React.SetStateAction<number>>;
    onClearSenderActivity: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
    const { isOpen, onClose, showToast, testMode, setTestMode } = props;
    const [activeTab, setActiveTab] = useState('general');
    
    const importInputRef = React.useRef<HTMLInputElement>(null);

    const handleImportClick = () => importInputRef.current?.click();
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            props.onImport(file);
        }
    };
    
    const renderTimeouts = (timeouts: Map<string, number>, onRemove: (key: string) => void) => {
        const now = Date.now();
        const items = Array.from(timeouts.entries())
            .filter(([, expiry]) => expiry > now)
            .map(([key, expiry]) => ({
                key,
                value: <>{key} <span className="text-xs text-slate-400">(expires {new Date(expiry).toLocaleTimeString()})</span></>
            }));
        return <ListManagement
            title=""
            items={items}
            renderItem={item => item.value}
            onRemoveItem={item => onRemove(item.key)}
        />
    };
    
    const tabs = [
        { id: 'general', label: 'General', icon: Shield },
        { id: 'links', label: 'Links', icon: Link2Off },
        { id: 'timeouts', label: 'Timeouts', icon: Clock },
        { id: 'advanced', label: 'Advanced', icon: TestTube2 },
    ];
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
                <div className="flex flex-row md:flex-col border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-6">
                   {tabs.map(tab => (
                       <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id)}
                           className={`flex items-center gap-3 w-full text-left p-2 rounded-2xl text-sm transition-colors ${activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
                       >
                           <tab.icon size={18} />
                           <span>{tab.label}</span>
                       </button>
                   ))}
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {activeTab === 'general' && (
                         <div className="space-y-6">
                             <ListManagement
                                 title="Blacklisted Users"
                                 items={props.blacklist}
                                 renderItem={item => item}
                                 onAddItem={(item) => { props.setBlacklist(p => [...new Set([...p, item.toLowerCase()])]); return true; }}
                                 onRemoveItem={(item) => props.setBlacklist(p => p.filter(i => i !== item))}
                                 placeholder="Enter username to blacklist..."
                             />
                             <ListManagement
                                 title="Trusted Users"
                                 items={props.trustedUsers}
                                 renderItem={item => item}
                                 onAddItem={(item) => { props.setTrustedUsers(p => [...new Set([...p, item.toLowerCase()])]); return true; }}
                                 onRemoveItem={(item) => props.setTrustedUsers(p => p.filter(i => i !== item))}
                                 placeholder="Enter username to trust..."
                             />

                             {/* Bulk import + suggestions */}
                             <div className="grid md:grid-cols-2 gap-4">
                               <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-800">
                                 <h4 className="text-slate-200 font-semibold mb-2">Bulk Import Trusted Users</h4>
                                 <p className="text-slate-400 text-sm mb-2">Paste a list of usernames separated by commas, spaces, or new lines.</p>
                                 <textarea
                                   id="bulk-trusted"
                                   className="w-full h-28 bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                   placeholder="user1, user2 user3\nuser4"
                                 />
                                 <div className="mt-2 flex gap-2">
                                   <Button onClick={() => {
                                     const ta = document.getElementById('bulk-trusted') as HTMLTextAreaElement | null;
                                     const raw = ta?.value || '';
                                     const parts = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
                                     if (parts.length === 0) return;
                                     props.onAddTrustedMany(parts);
                                     if (ta) ta.value = '';
                                   }}>Add Users</Button>
                                   <Button onClick={props.onClearSenderActivity}>Clear Sender Activity</Button>
                                 </div>
                               </div>
                               <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-800">
                                 <h4 className="text-slate-200 font-semibold mb-2">Suggestions from Frequent Contributors</h4>
                                 <div className="flex items-center justify-between mb-2">
                                   <label htmlFor="suggestion-threshold" className="text-slate-300 text-sm">Threshold</label>
                                   <input
                                     id="suggestion-threshold"
                                     type="number"
                                     min={1}
                                     step={1}
                                     value={props.suggestionThreshold}
                                     onChange={(e) => {
                                       const n = Math.max(1, parseInt(e.target.value || '1', 10));
                                       props.setSuggestionThreshold(n);
                                     }}
                                     className="w-20 bg-slate-800 border border-slate-700 rounded-md py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                   />
                                 </div>
                                 {props.suggestedTrusted.length === 0 ? (
                                   <p className="text-slate-500 text-sm">No suggestions yet. They will appear as the app observes chat activity.</p>
                                 ) : (
                                   <div>
                                     <div className="flex justify-end mb-2">
                                       <Button onClick={() => props.onAddTrustedMany(props.suggestedTrusted.map(s => s.username))}>Add All</Button>
                                     </div>
                                     <ul className="space-y-1">
                                       {props.suggestedTrusted.map(s => (
                                         <li key={s.username} className="flex items-center justify-between bg-slate-800 rounded-xl px-2 py-1">
                                           <span className="text-slate-200">{s.username}</span>
                                           <div className="flex items-center gap-2 text-sm">
                                             <span className="text-slate-400">{s.count} link(s)</span>
                                             <Button onClick={() => props.onAddTrustedMany([s.username])}>Add</Button>
                                           </div>
                                         </li>
                                       ))}
                                     </ul>
                                   </div>
                                 )}
                               </div>
                             </div>
                         </div>
                    )}
                    
                     {activeTab === 'links' && (
                         <div className="space-y-6">
                             <ListManagement
                                 title="Blacklisted Links"
                                 items={props.linkBlacklist}
                                 renderItem={item => item}
                                 onAddItem={(item) => { props.setLinkBlacklist(p => [...new Set([...p, item.toLowerCase()])]); return true; }}
                                 onRemoveItem={(item) => props.setLinkBlacklist(p => p.filter(i => i !== item))}
                                 placeholder="Enter full link to blacklist..."
                             />
                         </div>
                    )}

                    {activeTab === 'timeouts' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Active User Timeouts</h3>
                                {renderTimeouts(props.userTimeouts, key => props.setUserTimeouts(p => { const n = new Map(p); n.delete(key); return n; }))}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Active Link Timeouts</h3>
                                {renderTimeouts(props.linkTimeouts, key => props.setLinkTimeouts(p => { const n = new Map(p); n.delete(key); return n; }))}
                            </div>
                        </div>
                    )}
                    
                     {activeTab === 'advanced' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-200">Test Mode</h3>
                            <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-2xl">
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-slate-200">Enable Test Mode</h4>
                                    <p className="text-sm text-slate-400">Receive random links every 5-10 seconds for testing purposes.</p>
                                </div>
                                <label htmlFor="test-mode-toggle" className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            id="test-mode-toggle"
                                            className="sr-only"
                                            checked={testMode}
                                            onChange={(e) => setTestMode(e.target.checked)}
                                        />
                                        <div className="block bg-slate-700 w-14 h-8 rounded-full"></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${testMode ? 'transform translate-x-6 bg-cyan-400' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-200 pt-4">Data Management</h3>
                            <div className="flex gap-4">
                               <Button onClick={props.onExport} variant="secondary" icon={Download}>Export Settings</Button>
                               <Button onClick={handleImportClick} variant="secondary" icon={Upload}>Import Settings</Button>
                               <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" title="Import Settings" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-200 pt-4">Danger Zone</h3>
                             <Button onClick={() => {
                                 if(window.confirm("Are you sure you want to reset ALL settings to default? This cannot be undone.")){
                                     try {
                                         // Clear only this app's keys to avoid nuking unrelated localStorage
                                         const PREFIX = 'kickLinkCrawler';
                                         const keys: string[] = [];
                                         for (let i = 0; i < localStorage.length; i++) {
                                             const k = localStorage.key(i);
                                             if (k && k.startsWith(PREFIX)) keys.push(k);
                                         }
                                         keys.forEach(k => localStorage.removeItem(k));
                                     } catch {
                                         // Fallback if enumeration fails
                                         localStorage.clear();
                                     }
                                     showToast("All settings have been reset.", "success");
                                     setTimeout(() => window.location.reload(), 1000);
                                 }
                             }} variant="danger" icon={Trash2}>Reset All Settings</Button>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};

const Button: React.FC<{
    onClick?: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: React.ElementType;
}> = ({ onClick, children, variant = 'primary', icon: Icon }) => {
    const base = "flex items-center gap-2 py-2 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/20",
        secondary: "bg-slate-700 text-white hover:bg-slate-600 shadow-slate-700/20",
        danger: "bg-red-600 text-white hover:bg-red-500 shadow-red-600/20",
    };
    return (
        <button onClick={onClick} className={`${base} ${variants[variant]}`}>
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
}
