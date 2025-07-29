

const DEFAULT_BEEP_THRESHOLD = 50;   
const MAX_TIMEOUT_MINUTES = 10080; 
const LINK_HISTORY_HOURS = 24; 

const PROGRESS_GOAL = 17000000;

function playBeep(volume = 0.5) {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = volume;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
    oscillator.stop(audioCtx.currentTime + 1);
    audioCtx.close()
}

function speakText(text, lang = 'tr-TR', volume = 0.5) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.volume = volume;

    const voices = window.speechSynthesis.getVoices();

    const turkishVoice = voices.find(v =>
        v.lang.startsWith('tr') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural'))
    );
    
    utter.voice = turkishVoice || voices.find(v => v.lang.startsWith('tr')) || null;
    window.speechSynthesis.speak(utter);
}

function isHttpProtocol(url) {
    try {
        const protocol = new URL(url, window.location.href).protocol;
        return protocol === 'http:' || protocol === 'https:';
    } catch (e) {
        return false;
    }
}

function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

class URLParams {
    static get DEFAULT_USERNAME() {
        if (typeof window !== 'undefined') {
            if (window.DEFAULT_USERNAME) {
                return window.DEFAULT_USERNAME;
            }
            const body = document.body;
            if (body && body.dataset.defaultUser) {
                return body.dataset.defaultUser;
            }
        }
        return 'BurakSakinOl';
    }

    constructor() {
        this.urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    }
    getParam(param) {
        const value = this.urlParams.get(param);
        
        if (param === 'user' && !value) {
            return URLParams.DEFAULT_USERNAME;
        }
        return value;
    }

}


class LinkCrawlerChatroom {
    static MAX_DISPLAY_LINKS = 300;
    static STORAGE_KEYS = {
        BLACKLIST: 'kickLinkCrawlerBlacklist',
        TRUSTED: 'kickLinkCrawlerTrusted',
        LINK_BLACKLIST: 'kickLinkCrawlerLinkBlacklist',
        OPENED_LINKS: 'kickLinkCrawlerOpenedLinks',
        HISTORY: 'kickLinkCrawlerLinkHistory',
        BEEP_THRESHOLD: 'kickLinkCrawlerBeepThreshold',
        TOTAL_MESSAGES: 'kickLinkCrawlerTotalMessages',
        UPDATES_HASH: 'kickLinkCrawlerUpdatesHash'
    };

    static SELECTORS = {
        LINKS_CONTAINER: '#links-container',
        TIMEOUT_ITEMS: '#timeout-items',
        USER_TIMEOUT_ITEMS: '#user-timeout-items',
        LOADING: '#loading',
        OPEN_ALL_BUTTON: '#open-all-btn',
        RESET_COUNTS_BUTTON: '#reset-counts-btn',
        SEARCH_INPUT: '#search-input',
        FILTER_SELECT: '#filter-select',
        EXPORT_BUTTON: '#export-settings-btn',
        IMPORT_BUTTON: '#import-settings-btn',
        BLACKLIST_MODAL: '#blacklist-modal',
        MANAGE_BLACKLIST_BTN: '#manage-blacklist-btn',
        LINK_BLACKLIST_MODAL: '#link-blacklist-modal',
        MANAGE_LINK_BLACKLIST_BTN: '#manage-link-blacklist-btn',
        TRUSTED_MODAL: '#trusted-modal',
        MANAGE_TRUSTED_BTN: '#manage-trusted-btn',
        TIMEOUT_MODAL: '#timeout-modal',
        MANAGE_TIMEOUTS_BTN: '#manage-timeouts-btn',
        CLEAR_TIMEOUTS_BTN: '#clear-timeouts-btn',
        CLEAR_USER_TIMEOUTS_BTN: '#clear-user-timeouts-btn',
        SETTINGS_MODAL: '#settings-modal',
        SETTINGS_BTN: '#settings-btn',
        STATS_MODAL: '#stats-modal',
        STATS_BTN: '#stats-btn',
        UPDATES_MODAL: '#updates-modal',
        UPDATES_CONTENT: '#updates-content',
        STATUS_MESSAGE: '#status-message'
    };

    static EVENTS = {
        CLICK: 'click',
        INPUT: 'input',
        CHANGE: 'change',
        BEFORE_UNLOAD: 'beforeunload',
        POINTER_DOWN: 'pointerdown',
        KEY_DOWN: 'keydown'
    };
    constructor(user) {
        this.user = user;
        this.userInfoCache = {};
        this.seenLinks = new Set();
        this.linkTimeouts = new Map(); 
        this.userTimeouts = new Map(); 
        this.linkMap = new Map();
        this.blacklist = new Set(); 
        this.localStorageKey = LinkCrawlerChatroom.STORAGE_KEYS.BLACKLIST; 

        
        this.trustedUsers = new Set();
        this.trustedKey = LinkCrawlerChatroom.STORAGE_KEYS.TRUSTED;
        this.modUsers = new Set();

        
        this.linkBlacklist = new Set();
        this.linkBlacklistKey = LinkCrawlerChatroom.STORAGE_KEYS.LINK_BLACKLIST;

        
        this.openedLinksKey = LinkCrawlerChatroom.STORAGE_KEYS.OPENED_LINKS;

        
        this.historyKey = LinkCrawlerChatroom.STORAGE_KEYS.HISTORY;
        this.linkHistory = [];
        this.lastBeepCount = 0;   

        
        this.beepThresholdKey = LinkCrawlerChatroom.STORAGE_KEYS.BEEP_THRESHOLD;
        const storedThreshold = parseInt(localStorage.getItem(this.beepThresholdKey), 10);
        this.beepThreshold = Number.isInteger(storedThreshold) && storedThreshold > 0
            ? storedThreshold
            : DEFAULT_BEEP_THRESHOLD;

        
        this.progressGoal = PROGRESS_GOAL;

        this.totalMessagesKey = LinkCrawlerChatroom.STORAGE_KEYS.TOTAL_MESSAGES;
        const storedTotal = parseInt(localStorage.getItem(this.totalMessagesKey), 10);
        this.totalMessages = Number.isInteger(storedTotal) ? storedTotal : 0;

        this.initProgressBar();

        
        this.chat = null;
        this.pingInterval = null;

        this.currentSearchQuery = '';
        this.currentFilter = 'all';
        this.debouncedSaveHistory = debounce(() => this.saveLinkHistory(), 500);
        this.debouncedSaveTotalMessages = debounce(() => {
            try {
                localStorage.setItem(this.totalMessagesKey, this.totalMessages.toString());
            } catch (e) {
                console.error('Failed to save total message count:', e);
            }
        }, 500);
        this.searchLinksDebounced = debounce(q => this.searchLinks(q), 300);
        this.updateProgressBar(this.totalMessages);

        this.loadBlacklist(); 
        this.loadTrustedUsers(); 
        
        const defaultTrusted = ['ses_muhendisi', 'aerloss'];
        defaultTrusted.forEach(u => {
            const lower = u.toLowerCase();
            if (!this.trustedUsers.has(lower)) {
                this.trustedUsers.add(lower);
            }
        });
        this.saveTrustedUsers();
        this.loadLinkBlacklist(); 
        this.loadLinkHistory(); 
        this.setupDeleteButtonListener();

        
        this.currentStatsDateKey = this.getCurrentDateKey();

        
        this.isTestMode = false;
        this.testModeInterval = null;
        this.testModeKey = 'kickLinkCrawlerTestMode';
        this.loadTestMode();
    }

    
    loadBlacklist() {
        try {
            const storedBlacklist = localStorage.getItem(this.localStorageKey);
            if (storedBlacklist) {
                const blacklistArray = JSON.parse(storedBlacklist);
                
                if (Array.isArray(blacklistArray)) {
                     
                    this.blacklist = new Set(blacklistArray.map(name => name.toLowerCase()));
                    if (this.blacklist.delete('ses_muhendisi')) {
                        this.saveBlacklist();
                    }
                    console.log(`Loaded blacklist: ${blacklistArray.length} users.`);
                } else {
                    console.warn("Invalid blacklist data found in localStorage. Starting fresh.");
                    this.blacklist = new Set();
                }
            } else {
                console.log("No blacklist found in localStorage. Starting fresh.");
                this.blacklist = new Set();
            }
        } catch (error) {
            console.error("Error loading blacklist from localStorage:", error);
            this.blacklist = new Set(); 
        }
    }

    saveBlacklist() {
        try {
            const blacklistArray = Array.from(this.blacklist); 
            localStorage.setItem(this.localStorageKey, JSON.stringify(blacklistArray));
            
        } catch (error) {
            console.error("Error saving blacklist to localStorage:", error);
            
        }
    }

    
    loadLinkBlacklist() {
        try {
            const stored = localStorage.getItem(this.linkBlacklistKey);
            if (stored) {
                const arr = JSON.parse(stored);
                if (Array.isArray(arr)) {
                    this.linkBlacklist = new Set(arr.map(u => u.toLowerCase()));
                    console.log(`Loaded link blacklist: ${arr.length} links.`);
                } else {
                    console.warn("Invalid link blacklist data found in localStorage. Starting fresh.");
                    this.linkBlacklist = new Set();
                }
            } else {
                console.log("No link blacklist found in localStorage. Starting fresh.");
                this.linkBlacklist = new Set();
            }
        } catch (error) {
            console.error("Error loading link blacklist from localStorage:", error);
            this.linkBlacklist = new Set();
        }
    }

    saveLinkBlacklist() {
        try {
            const arr = Array.from(this.linkBlacklist);
            localStorage.setItem(this.linkBlacklistKey, JSON.stringify(arr));
        } catch (error) {
            console.error("Error saving link blacklist to localStorage:", error);
        }
    }

    
    loadTrustedUsers() {
        try {
            const stored = localStorage.getItem(this.trustedKey);
            if (stored) {
                const arr = JSON.parse(stored);
                if (Array.isArray(arr)) {
                    this.trustedUsers = new Set(arr.map(u => u.toLowerCase()));
                    console.log(`Loaded trusted users: ${arr.length}.`);
                } else {
                    console.warn("Invalid trusted user data in localStorage. Starting fresh.");
                    this.trustedUsers = new Set();
                }
            } else {
                this.trustedUsers = new Set();
            }
        } catch (err) {
            console.error("Error loading trusted users from localStorage:", err);
            this.trustedUsers = new Set();
        }
    }

    saveTrustedUsers() {
        try {
            const arr = Array.from(this.trustedUsers);
            localStorage.setItem(this.trustedKey, JSON.stringify(arr));
        } catch (err) {
            console.error("Error saving trusted users to localStorage:", err);
        }
    }

    addTrustedUser(username) {
        const lower = username.toLowerCase().trim();
        if (!lower) {
            console.warn("Attempted to add empty username to trusted list.");
            return false;
        }
        if (!this.trustedUsers.has(lower)) {
            this.trustedUsers.add(lower);
            this.saveTrustedUsers();
            this.showTemporaryStatusMessage(`User "${username}" added to trusted list.`);
            return true;
        }
        this.showTemporaryStatusMessage(`User "${username}" already trusted.`);
        return false;
    }

    removeTrustedUser(username) {
        const lower = username.toLowerCase();
        if (this.trustedUsers.has(lower)) {
            this.trustedUsers.delete(lower);
            this.saveTrustedUsers();
            this.showTemporaryStatusMessage(`User "${username}" removed from trusted list.`);
            return true;
        }
        return false;
    }

    addToBlacklist(username) {
        const lowerCaseUsername = username.toLowerCase().trim();
        if (!lowerCaseUsername) {
            console.warn("Attempted to add empty username to blacklist.");
            return false; 
        }
        if (lowerCaseUsername === 'ses_muhendisi' || this.modUsers.has(lowerCaseUsername)) {
            this.blacklist.delete(lowerCaseUsername);
            this.saveBlacklist();
            const msg = lowerCaseUsername === 'ses_muhendisi'
                ? 'Cannot blacklist "ses_muhendisi".'
                : 'Cannot blacklist a moderator.';
            this.showTemporaryStatusMessage(msg);
            return false;
        }
        if (!this.blacklist.has(lowerCaseUsername)) {
            
            this.blacklist.add(lowerCaseUsername);
            this.saveBlacklist(); 

            
            const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
            if (linkContainer) {
                const items = linkContainer.querySelectorAll(`.link-item[data-sender="${lowerCaseUsername}"]`);
                items.forEach(item => {
                    const anchor = item.querySelector('a');
                    if (anchor) {
                        const href = anchor.getAttribute('href');
                        if (href) {
                            const key = href.toLowerCase().trim();
                            this.linkMap.delete(key);
                        }
                    }
                    this._removeElementWithAnimation(item);
                });
            }

            console.log(`User "${lowerCaseUsername}" added to blacklist and their messages removed.`);
            this.showTemporaryStatusMessage(`User "${lowerCaseUsername}" blacklisted and their messages removed.`);
            return true; 
        } else {
            console.log(`User "${lowerCaseUsername}" is already on the blacklist.`);
            this.showTemporaryStatusMessage(`User "${lowerCaseUsername}" is already blacklisted.`);
            return false; 
        }
    }

    addLinkToBlacklist(url) {
        const sanitized = url.toLowerCase().trim();
        if (!sanitized) return false;
        if (!this.linkBlacklist.has(sanitized)) {
            this.linkBlacklist.add(sanitized);
            this.saveLinkBlacklist();
            this.showTemporaryStatusMessage(`Link "${url}" blacklisted.`);

            const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
            if (linkContainer) {
                const items = linkContainer.querySelectorAll('.link-item a');
                items.forEach(anchor => {
                    const href = anchor.getAttribute('href');
                    if (href && href.toLowerCase().trim() === sanitized) {
                        this.linkMap.delete(sanitized);
                        this._removeElementWithAnimation(anchor.closest('.link-item'));
                    }
                });
            }

            return true;
        }
        return false;
    }

    
    isUserModOrBroadcaster(senderIdentity) {
        if (!senderIdentity || !Array.isArray(senderIdentity.badges)) {
            return false;
        }
        
        return senderIdentity.badges.some(badge =>
            badge.type === 'moderator' || badge.type === 'broadcaster'
        );
    }

    
    async getUserInfo(userToFetch, retriesLeft = 5) {
        for (let attempt = 1; attempt <= retriesLeft; attempt++) {
            try {
                const response = await fetch(`https://kick.com/api/v2/channels/${userToFetch}`);
                if (!response.ok) {
                    let errorMsg = `HTTP error! status: ${response.status}`;
                    try { const errorBody = await response.json(); errorMsg += ` - ${errorBody.message || JSON.stringify(errorBody)}`; } catch (e) { } 
                    throw new Error(errorMsg);
                }
                const data = await response.json();
                this.userInfoCache[userToFetch] = data;
                return data;
            } catch (error) {
                console.error("Failed to get user info:", error);
                const loadingElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.LOADING);
                if (loadingElement) {
                    if (attempt < retriesLeft) {
                        loadingElement.textContent = `Error fetching info for ${userToFetch}. Retrying (${attempt}/${retriesLeft})...`;
                    } else {
                        loadingElement.textContent = `Failed to fetch info for ${userToFetch} after ${retriesLeft} attempts.`;
                    }
                }
                if (attempt >= retriesLeft) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
      }

    connectToChatroom(chatroomID, channelID) {
        const wsUrl = `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
        console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

        if (this.chat) {
            try { this.chat.close(); } catch (_) {}
        }

        const chat = new WebSocket(wsUrl);
        this.chat = chat;
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = null;

        chat.onerror = (error) => {
          console.error("WebSocket Error:", error);
          if (this.pingInterval) clearInterval(this.pingInterval); 
          this.pingInterval = null;
          const loadingElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.LOADING);
          if (loadingElement) {
              loadingElement.innerHTML = "WebSocket connection error. Trying to reconnect...";
              loadingElement.style.display = 'block';
          }
          
          setTimeout(() => {
            if (!this.chat || (this.chat.readyState !== WebSocket.OPEN && this.chat.readyState !== WebSocket.CONNECTING)) {
                 this.connectToChatroom(chatroomID, channelID);
            }
          }, 5000);
        };

        chat.onopen = () => {
          console.log("WebSocket Connected to Pusher");
          const loadingElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.LOADING);
          if (loadingElement) {
              loadingElement.innerHTML = "Connected. Waiting for messages...";
              setTimeout(() => { if (loadingElement) loadingElement.style.display = 'none'; }, 2000);
          }
          this.subscribeToChannel(chat, `chatrooms.${chatroomID}.v2`);

          
          if (this.pingInterval) clearInterval(this.pingInterval);
          
          this.pingInterval = setInterval(() => {
            if (chat.readyState === WebSocket.OPEN) {
              chat.send(JSON.stringify({ event: "pusher:ping", data: {} }));
            } else {
              console.log("WebSocket not open during ping interval, clearing interval.");
              clearInterval(this.pingInterval); 
            }
          }, 60000);
        };

        chat.onmessage = (event) => {
          this.parseMessage(event.data);
        };

         chat.onclose = (event) => {
            console.log("WebSocket closed:", event.reason, event.code);
            if (this.pingInterval) clearInterval(this.pingInterval); 
            this.pingInterval = null;
            this.chat = null;
            const loadingElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.LOADING);
            if (loadingElement) {
                loadingElement.innerHTML = "WebSocket disconnected. Attempting to reconnect in 5 seconds...";
                loadingElement.style.display = 'block';
            }
            
            setTimeout(() => {
                
                if (!this.chat || (this.chat.readyState !== WebSocket.OPEN && this.chat.readyState !== WebSocket.CONNECTING)) {
                    this.connectToChatroom(chatroomID, channelID);
                }
            }, 5000);
        };
      }

    subscribeToChannel(chat, channelName) {
        if (chat.readyState === WebSocket.OPEN) {
            console.log(`Subscribing to ${channelName}`);
            chat.send(JSON.stringify({ event: "pusher:subscribe", data: { auth: null, channel: channelName } }));
        } else {
            console.warn("WebSocket not open. Cannot subscribe yet.");
        }
      }

    
    parseMessage(message) {
        try {
          const msg = JSON.parse(message);

          if (msg.event.startsWith("pusher:") && msg.event !== "pusher:pong") {
            if (msg.event === 'pusher:subscription_succeeded') console.log(`Successfully subscribed to channel: ${msg.channel}`);
            else if (msg.event === 'pusher:error') console.error(`Pusher Error: ${JSON.stringify(msg.data)}`);
            return;
          }

          if (msg.data && typeof msg.data === 'string') {
              const cleanedDataString = msg.data
                  .replace(/\\u00a0/g, " ").replace(/\\n/g, " ").replace(/\\t/g, " ")
                  .replace(/\\r/g, " ").replace(/\\\\/g, "\\");
               let data;
               try { data = JSON.parse(cleanedDataString); }
               catch (parseError) { console.error("Failed to parse inner JSON data:", parseError, "Original:", cleanedDataString); return; }

              switch (msg.event) {
                case "App\\Events\\ChatMessageEvent":
                  this.handleMessageAndExtractLinks(data);
                  break;
                case "App\\Events\\ChatroomClearEvent":
                  console.log("Chat cleared event received.");
                  this.handleClear();
                  break;
                
              }
          } else if (msg.event !== "pusher:pong") {
             
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error, "Original message:", message);
        }
      }

    
    handleMessageAndExtractLinks(data) {
        
        if (!data || !data.content || !data.sender || !data.sender.username || !data.created_at || !data.sender.identity) {
            console.warn("Received ChatMessageEvent with incomplete data:", data);
            return;
        }

        this.totalMessages += 1;
        this.updateProgressBar(this.totalMessages);
        this.debouncedSaveTotalMessages();

        const {
          content: msgContent,
          sender,
          created_at: msgTimestamp,
        } = data;
        const senderUsername = sender.username; 
        const lowerCaseSender = senderUsername.toLowerCase();
        const isMod = this.isUserModOrBroadcaster(sender.identity);
        if (isMod) {
            this.modUsers.add(lowerCaseSender);
            if (this.blacklist.delete(lowerCaseSender)) {
                this.saveBlacklist();
            }
            if (!this.trustedUsers.has(lowerCaseSender)) {
                this.trustedUsers.add(lowerCaseSender);
                this.saveTrustedUsers();
            }
        }

        
        const commandPrefix = "!blacklist ";
        if (msgContent.startsWith(commandPrefix)) {
            if (this.isUserModOrBroadcaster(sender.identity)) {
                const targetUsername = msgContent.substring(commandPrefix.length).trim();
                if (targetUsername) {
                    this.addToBlacklist(targetUsername);
                } else {
                    console.warn(`Received empty !blacklist command from ${senderUsername}`);
                    this.showTemporaryStatusMessage("Usage: !blacklist <username>");
                }
                return; 
            } else {
                console.log(`User ${senderUsername} tried to use !blacklist command without permission.`);
                
                return; 
            }
        }

        
        if (this.blacklist.has(lowerCaseSender)) {
            
            return; 
        }

        
        const userExpiry = this.userTimeouts.get(lowerCaseSender);
        if (userExpiry) {
            if (userExpiry > Date.now()) {
                return; 
            } else {
                this.userTimeouts.delete(lowerCaseSender);
                this.updateUserTimeoutModal();
            }
        }

        
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        let urlsFound = msgContent.match(urlRegex);
        const messageWithoutLinks = msgContent.replace(urlRegex, '').trim();

        const upperMsg = msgContent.toLocaleUpperCase('tr');
        const urgent = (this.trustedUsers.has(lowerCaseSender) || isMod) &&
                       (upperMsg.includes('!ACIL') || upperMsg.includes('!ACİL'));

        if (urlsFound) {
            urlsFound.forEach(url => {
                let properUrl = url;
                if (!properUrl.startsWith('http://') && !properUrl.startsWith('https://') && !properUrl.startsWith('ftp://') && !properUrl.startsWith('file://')) {
                    properUrl = 'http://' + url;
                }

                const sanitizedUrl = properUrl.toLowerCase().trim();
                if (this.linkBlacklist.has(sanitizedUrl)) {
                    return; 
                }

                
                const expiryTimestamp = this.linkTimeouts.get(sanitizedUrl);
                if (expiryTimestamp) {
                    if (expiryTimestamp > Date.now()) {
                        return; 
                    } else {
                        this.linkTimeouts.delete(sanitizedUrl);
                    }
                }

                
                let linkInfo = this.linkMap.get(sanitizedUrl);
                
                if (linkInfo && linkInfo.element && linkInfo.element.parentElement) {
                    
                    linkInfo.count++;
                    
                    let badge = linkInfo.element.querySelector('.link-count-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.classList.add('link-count-badge');
                        linkInfo.element.prepend(badge);
                    }
                    badge.textContent = String(linkInfo.count);

                    linkInfo.element.parentElement.prepend(linkInfo.element);
                    linkInfo.element.classList.add('duplicate-link'); 
                    
                    const histIndex = this.linkHistory.findIndex(h => h.url === sanitizedUrl);
                    if (histIndex >= 0) {
                        this.linkHistory[histIndex].count = linkInfo.count;
                    }
                    this.debouncedSaveHistory();

                } else {
                    
                    const count = linkInfo ? linkInfo.count + 1 : 1;
                    const isNewLink = !linkInfo;

                    const ts = this.normalizeTimestamp(msgTimestamp);
                    const linkElement = this.displayLink({
                        url: properUrl,
                        displayText: url,
                        sender: senderUsername,
                        timestamp: ts,
                        isDuplicate: !isNewLink,
                        count: count,
                        message: messageWithoutLinks,
                        urgent: urgent,
                    });

                    if (linkElement) {
                        this.linkMap.set(sanitizedUrl, { element: linkElement, count: count });
                        this.seenLinks.add(sanitizedUrl);

                        const histIndex = this.linkHistory.findIndex(h => h.url === sanitizedUrl);
                        if (histIndex >= 0) {
                            this.linkHistory[histIndex].count = count;
                        } else {
                            this.linkHistory.push({
                                url: sanitizedUrl,
                                sender: senderUsername,
                                timestamp: ts,
                                message: messageWithoutLinks,
                                count: count,
                                urgent: urgent,
                            });
                        }
                        this.debouncedSaveHistory();
                    }
                }

                if (urgent) speakText(lowerCaseSender + ' acil link gönderdi', 'tr-TR', 0.5);
                this.checkLinkCountBeep();
            });
        } else if (urgent) {
            const ts = this.normalizeTimestamp(msgTimestamp);
            this.displayUrgentMessage({ message: msgContent, sender: senderUsername, timestamp: ts });
            this.checkLinkCountBeep();
        }
        this.applySearchFilter();
    }

    
    removeFromBlacklist(username) {
        const lowerCaseUsername = username.toLowerCase();
        if (this.blacklist.has(lowerCaseUsername)) {
            this.blacklist.delete(lowerCaseUsername);
            this.saveBlacklist();
            this.showTemporaryStatusMessage(`User "${username}" removed from blacklist.`);
            return true;
        }
        return false;
    }

    
    timeoutLink(url, minutes) {
        const key = url.toLowerCase().trim();
        const expiry = Date.now() + minutes * 60000;
        this.linkTimeouts.set(key, expiry);
        this.updateTimeoutModal();
    }

    
    timeoutUser(username, minutes) {
        const expiry = Date.now() + minutes * 60000;
        const lower = username.toLowerCase();
        this.userTimeouts.set(lower, expiry);
        this.updateUserTimeoutModal();

        
        const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (linkContainer) {
            const items = linkContainer.querySelectorAll(`.link-item[data-sender="${lower}"]`);
            items.forEach(item => {
                const anchor = item.querySelector('a');
                if (anchor) {
                    const href = anchor.getAttribute('href');
                    if (href) {
                        const key = href.toLowerCase().trim();
                        this.linkMap.delete(key);
                    }
                }
                this._removeElementWithAnimation(item);
            });
        }
        this.showTemporaryStatusMessage(`User "${username}" timed out for ${minutes} minutes and their messages removed.`);
    }

    
    updateTimeoutModal() {
        const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.TIMEOUT_ITEMS);
        if (!container) return;

        
        const now = Date.now();
        for (const [u, exp] of Array.from(this.linkTimeouts.entries())) {
            if (exp <= now) this.linkTimeouts.delete(u);
        }

        container.innerHTML = '';
        if (this.linkTimeouts.size === 0) {
            const p = document.createElement('p');
            p.textContent = 'No active timeouts.';
            container.appendChild(p);
            return;
        }

        for (const [u, exp] of Array.from(this.linkTimeouts.entries())) {
            const item = document.createElement('div');
            item.className = 'blacklist-item';

            const span = document.createElement('span');
            const timeStr = new Date(exp).toLocaleTimeString();
            span.textContent = `${u} (expires ${timeStr})`;
            item.appendChild(span);

            const btn = document.createElement('button');
            btn.className = 'remove-timeout';
            btn.setAttribute('data-url', u);
            btn.textContent = 'Remove';
            item.appendChild(btn);

            container.appendChild(item);
        }

        container.querySelectorAll('.remove-timeout').forEach(btn => {
            btn.onclick = () => {
                const url = btn.getAttribute('data-url');
                this.linkTimeouts.delete(url);
                this.updateTimeoutModal();
            };
        });
    }

    
    updateUserTimeoutModal() {
        const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.USER_TIMEOUT_ITEMS);
        if (!container) return;

        const now = Date.now();
        for (const [u, exp] of Array.from(this.userTimeouts.entries())) {
            if (exp <= now) this.userTimeouts.delete(u);
        }

        container.innerHTML = '';
        if (this.userTimeouts.size === 0) {
            const p = document.createElement('p');
            p.textContent = 'No active user timeouts.';
            container.appendChild(p);
            return;
        }

        for (const [u, exp] of Array.from(this.userTimeouts.entries())) {
            const item = document.createElement('div');
            item.className = 'blacklist-item';

            const span = document.createElement('span');
            const timeStr = new Date(exp).toLocaleTimeString();
            span.textContent = `${u} (expires ${timeStr})`;
            item.appendChild(span);

            const btn = document.createElement('button');
            btn.className = 'remove-user-timeout';
            btn.setAttribute('data-username', u);
            btn.textContent = 'Remove';
            item.appendChild(btn);

            container.appendChild(item);
        }

        container.querySelectorAll('.remove-user-timeout').forEach(btn => {
            btn.onclick = () => {
                const u = btn.getAttribute('data-username');
                this.userTimeouts.delete(u);
                this.updateUserTimeoutModal();
            };
        });
    }

    removeLinkFromBlacklist(url) {
        const sanitized = url.toLowerCase();
        if (this.linkBlacklist.has(sanitized)) {
            this.linkBlacklist.delete(sanitized);
            this.saveLinkBlacklist();
            this.showTemporaryStatusMessage(`Link "${url}" removed from blacklist.`);
            return true;
        }
        return false;
    }

    setupModal() {
       
        
        const userModal  = document.querySelector(LinkCrawlerChatroom.SELECTORS.BLACKLIST_MODAL);
        const userBtn    = document.querySelector(LinkCrawlerChatroom.SELECTORS.MANAGE_BLACKLIST_BTN);
        const userClose  = userModal?.querySelector('.close-modal');

        
        const linkModal  = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINK_BLACKLIST_MODAL);
        const linkBtn    = document.querySelector(LinkCrawlerChatroom.SELECTORS.MANAGE_LINK_BLACKLIST_BTN);
        const linkClose  = linkModal?.querySelector('.close-modal');

        
        const trustedModal = document.querySelector(LinkCrawlerChatroom.SELECTORS.TRUSTED_MODAL);
        const trustedBtn   = document.querySelector(LinkCrawlerChatroom.SELECTORS.MANAGE_TRUSTED_BTN);
        const trustedClose = trustedModal?.querySelector('.close-modal');

        
        const timeoutModal = document.querySelector(LinkCrawlerChatroom.SELECTORS.TIMEOUT_MODAL);
        const timeoutBtn   = document.querySelector(LinkCrawlerChatroom.SELECTORS.MANAGE_TIMEOUTS_BTN);
        const timeoutClose     = timeoutModal?.querySelector('.close-timeout-modal');
        const clearBtn         = document.querySelector(LinkCrawlerChatroom.SELECTORS.CLEAR_TIMEOUTS_BTN);
        const clearUserBtn     = document.querySelector(LinkCrawlerChatroom.SELECTORS.CLEAR_USER_TIMEOUTS_BTN);

        
       const settingsModal = document.querySelector(LinkCrawlerChatroom.SELECTORS.SETTINGS_MODAL);
       const settingsBtn   = document.querySelector(LinkCrawlerChatroom.SELECTORS.SETTINGS_BTN);
       const settingsClose = settingsModal?.querySelector('.close-settings-modal');

        
        const statsModal = document.querySelector(LinkCrawlerChatroom.SELECTORS.STATS_MODAL);
        const statsBtn   = document.querySelector(LinkCrawlerChatroom.SELECTORS.STATS_BTN);
        const statsClose = statsModal?.querySelector('.close-stats-modal');

       
        userBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.updateBlacklistModal();
            userModal.style.display = 'block';
        });

        linkBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.updateLinkBlacklistModal();
            linkModal.style.display = 'block';
        });

        trustedBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.updateTrustedModal();
            trustedModal.style.display = 'block';
        });

        timeoutBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.updateTimeoutModal();
            this.updateUserTimeoutModal();
            timeoutModal.style.display = 'block';
        });

        settingsBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            settingsModal.style.display = 'block';
        });

        statsBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.updateStatsModal();
            statsModal.style.display = 'block';
        });

       
        userClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,   () => userModal.style.display    = 'none');
        linkClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,   () => linkModal.style.display    = 'none');
        trustedClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,() => trustedModal.style.display = 'none');
        timeoutClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,() => timeoutModal.style.display = 'none');
        settingsClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,() => settingsModal.style.display = 'none');
        statsClose?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK,() => statsModal.style.display = 'none');

       
        clearBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.linkTimeouts.clear();
            this.updateTimeoutModal();
        });

        clearUserBtn?.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            this.userTimeouts.clear();
            this.updateUserTimeoutModal();
        });

       
        window.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, (e) => {
            if (e.target === userModal)    userModal.style.display    = 'none';
            if (e.target === linkModal)    linkModal.style.display    = 'none';
            if (e.target === trustedModal) trustedModal.style.display = 'none';
            if (e.target === timeoutModal) timeoutModal.style.display = 'none';
            if (e.target === settingsModal) settingsModal.style.display = 'none';
            if (e.target === statsModal)   statsModal.style.display   = 'none';
        });
    }

    
    _removeElementWithAnimation(element) {
        if (!element) return;
        element.classList.add('animate__animated', 'animate__backOutLeft', 'animate__faster');
        element.addEventListener('animationend', () => {
            element.remove();
        }, { once: true });
    }

    
    loadTestMode() {
        try {
            const stored = localStorage.getItem(this.testModeKey);
            this.isTestMode = stored === 'true';
            if (this.isTestMode) {
                this.startTestMode();
            }
        } catch (e) {
            console.error('Failed to load test mode setting:', e);
            this.isTestMode = false;
        }
    }

    saveTestMode() {
        try {
            localStorage.setItem(this.testModeKey, this.isTestMode ? 'true' : 'false');
        } catch (e) {
            console.error('Failed to save test mode setting:', e);
        }
    }

    toggleTestMode(enable) {
        this.isTestMode = enable;
        this.saveTestMode();
        if (this.isTestMode) {
            this.startTestMode();
            this.showTemporaryStatusMessage('Test modu AÇIK: Rastgele linkler akmaya başladı.');
        } else {
            this.stopTestMode();
            this.showTemporaryStatusMessage('Test modu KAPALI: Rastgele linkler durduruldu.');
        }
    }

    startTestMode() {
        if (this.testModeInterval) clearInterval(this.testModeInterval);
        const sendRandomLink = () => {
            const randomLinkData = this.generateRandomLink();
            this.handleMessageAndExtractLinks(randomLinkData);
            const nextInterval = this._getRandomInterval(1000, 3000); 
            this.testModeInterval = setTimeout(sendRandomLink, nextInterval);
        };
        sendRandomLink(); 
    }

    stopTestMode() {
        if (this.testModeInterval) {
            clearTimeout(this.testModeInterval);
            this.testModeInterval = null;
        }
    }

    _getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateRandomLink() {
        const users = ['testuser1', 'random_dev', 'anon_viewer', 'kick_streamer', 'mod_user'];
        const domains = ['example.com', 'test.org', 'randomsite.net', 'mysite.io', 'github.com'];
        const paths = ['/page1', '/docs/item', '/blog/post', '/profile', '/downloads/file.zip'];
        const messages = [
            'Check this out!',
            'Cool link',
            'Important info here',
            'Random thought',
            '',
            'Another regular message.',
            'Just sharing.',
            'A quick one.',
            '!ACIL this is urgent', 
        ];

        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        const url = `https://${randomDomain}${randomPath}?q=${Math.random().toString(36).substring(7)}`;

        return {
            content: `${randomMessage} ${url}`.trim(),
            sender: {
                username: randomUser,
                identity: {
                    badges: randomUser === 'mod_user' ? [{ type: 'moderator' }] : []
                }
            },
            created_at: new Date().toISOString()
        };
    }


    
    updateBlacklistModal() {
        const blacklistItems = document.getElementById('blacklist-items');
        blacklistItems.innerHTML = '';

        if (this.blacklist.size === 0) {
            blacklistItems.textContent = 'No users are currently blacklisted.';
            return;
        }

        Array.from(this.blacklist).sort().forEach(username => {
            const item = document.createElement('div');
            item.className = 'blacklist-item';

            const span = document.createElement('span');
            span.textContent = username;
            item.appendChild(span);

            const btn = document.createElement('button');
            btn.className = 'remove-from-blacklist';
            btn.setAttribute('data-username', username);
            btn.textContent = 'Remove';
            item.appendChild(btn);

            blacklistItems.appendChild(item);
        });

        
        blacklistItems.querySelectorAll('.remove-from-blacklist').forEach(button => {
            button.onclick = () => {
                const username = button.getAttribute('data-username');
                if (this.removeFromBlacklist(username)) {
                    this.updateBlacklistModal(); 
                }
            };
        });
    }

    updateLinkBlacklistModal() {
        const linkItems = document.getElementById('link-blacklist-items');
        linkItems.innerHTML = '';

        if (this.linkBlacklist.size === 0) {
            linkItems.textContent = 'No links are currently blacklisted.';
            return;
        }

        Array.from(this.linkBlacklist).sort().forEach(url => {
            const item = document.createElement('div');
            item.className = 'blacklist-item';

            const span = document.createElement('span');
            span.textContent = url;
            item.appendChild(span);

            const btn = document.createElement('button');
            btn.className = 'remove-from-link-blacklist';
            btn.setAttribute('data-url', url);
            btn.textContent = 'Remove';
            item.appendChild(btn);

            linkItems.appendChild(item);
        });

        linkItems.querySelectorAll('.remove-from-link-blacklist').forEach(button => {
            button.onclick = () => {
                const url = button.getAttribute('data-url');
                if (this.removeLinkFromBlacklist(url)) {
                    this.updateLinkBlacklistModal();
                }
            };
        });
    }

    updateTrustedModal() {
        const items = document.getElementById('trusted-items');
        if (!items) return;
        items.innerHTML = '';

        if (this.trustedUsers.size === 0) {
            items.textContent = 'No trusted users.';
        } else {
            Array.from(this.trustedUsers).sort().forEach(name => {
                const div = document.createElement('div');
                div.className = 'blacklist-item';

                const span = document.createElement('span');
                span.textContent = name;
                div.appendChild(span);

                const btn = document.createElement('button');
                btn.className = 'remove-from-trusted';
                btn.setAttribute('data-username', name);
                btn.textContent = 'Remove';
                div.appendChild(btn);

                items.appendChild(div);
            });
        }

        items.querySelectorAll('.remove-from-trusted').forEach(btn => {
            btn.onclick = () => {
                const u = btn.getAttribute('data-username');
                if (this.removeTrustedUser(u)) {
                    this.updateTrustedModal();
                }
            };
        });

        const addBtn = document.getElementById('add-trusted-btn');
        const input  = document.getElementById('trusted-input');
        if (addBtn && input) {
            addBtn.onclick = () => {
                const val = input.value.trim();
                if (val) {
                    if (this.addTrustedUser(val)) {
                        input.value = '';
                    }
                    this.updateTrustedModal();
                }
            };
        }
    }

    

    _createBaseMessageElement({ url, sender, timestamp, message = '', urgent = false, isHistory = false }) {
        const escapeAttr = (str) => str
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const element = document.createElement("div");
        element.classList.add("link-item");
        element.dataset.sender = sender.toLowerCase();
        if (isHistory) {
            element.classList.add('history-link');
        }
        if (urgent) {
            element.classList.add('urgent-message');
        }

        const time = new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('link-timestamp');
        timeSpan.textContent = `[${time}]`;
        element.appendChild(timeSpan);

        const wrapper = document.createElement('div');
        wrapper.classList.add('link-and-message-container');

        if (message) {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('message-context');
            msgDiv.textContent = message;
            msgDiv.setAttribute('title', escapeAttr(message));
            wrapper.appendChild(msgDiv);
        }

        const contentRow = document.createElement('div');
        contentRow.classList.add('link-row'); 

        const faviconImg = document.createElement('img');
        faviconImg.classList.add('link-favicon');
        try {
            const domain = new URL(url).hostname;
            faviconImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch (e) {
            faviconImg.style.display = 'none'; 
        }
        contentRow.appendChild(faviconImg);

        faviconImg.classList.add('link-favicon');
        try {
            const domain = new URL(url).hostname;
            faviconImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch (e) {
            faviconImg.style.display = 'none'; 
        }
        contentRow.appendChild(faviconImg);

        const senderSpan = document.createElement('span');
        senderSpan.classList.add('link-sender');
        senderSpan.textContent = `${sender}:`;
        contentRow.appendChild(senderSpan);

        wrapper.appendChild(contentRow);
        element.appendChild(wrapper);

        return { element, contentRow };
    }

    displayLink({ url, displayText, sender, timestamp, isDuplicate, count = 1, message = '', urgent = false, isHistory = false }) {
        if (!isHttpProtocol(url)) {
            console.warn('Blocked non-http URL:', url);
            return null;
        }
        const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (!linkContainer) return null;

        const { element: linkElement, contentRow } = this._createBaseMessageElement({ url, sender, timestamp, message, urgent, isHistory });

        if (isDuplicate) {
            const badge = document.createElement('span');
            badge.classList.add('link-count-badge');
            badge.textContent = String(count);
            linkElement.prepend(badge); 
        }

        const anchor = document.createElement('a');
        anchor.textContent = displayText;
        anchor.setAttribute('href', url);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        contentRow.appendChild(anchor);

        const controls = document.createElement('div');
        controls.classList.add('control-buttons');

        const createBtn = (cls, text, title) => {
            const btn = document.createElement('button');
            btn.classList.add(cls);
            btn.textContent = text;
            btn.setAttribute('title', title);
            return btn;
        };

        controls.appendChild(createBtn('timeout-button', 'T', 'Timeout this link'));
        controls.appendChild(createBtn('user-timeout-button', 'U', 'Timeout this user'));
        controls.appendChild(createBtn('blacklist-button', 'B', 'Blacklist this user'));
        controls.appendChild(createBtn('link-blacklist-button', 'L', 'Blacklist this link'));
        linkElement.appendChild(controls);

        const closeDiv = document.createElement('div');
        closeDiv.classList.add('close-buttons');

        const openBtn = document.createElement('button');
        openBtn.classList.add('open-button');
        openBtn.textContent = '';
        openBtn.setAttribute('title', 'Open link and remove');
        closeDiv.appendChild(openBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-button');
        deleteBtn.textContent = '';
        deleteBtn.setAttribute('title', 'Remove this link');
        closeDiv.appendChild(deleteBtn);

        linkElement.appendChild(closeDiv);

        linkContainer.prepend(linkElement);

        
        linkElement.classList.add('animate__animated', 'animate__slideInDown', 'animate__faster');
        linkElement.addEventListener('animationend', () => {
            linkElement.classList.remove('animate__animated', 'animate__slideInDown', 'animate__faster');
        }, { once: true });

        while (linkContainer.children.length > LinkCrawlerChatroom.MAX_DISPLAY_LINKS) {
            const lastItem = linkContainer.lastChild;
            if (lastItem) {
                const anchor = lastItem.querySelector('a');
                if (anchor) {
                    const href = anchor.getAttribute('href');
                    if (href) {
                        const key = href.toLowerCase().trim();
                        this.linkMap.delete(key);
                    }
                }
                linkContainer.removeChild(lastItem);
            }
        }
        this.checkLinkCountBeep();
        return linkElement;
    }

    displayUrgentMessage({ message, sender, timestamp }) {
        const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (!container) return null;

        const { element: el, contentRow } = this._createBaseMessageElement({ sender, timestamp, message, urgent: true });

        const indicator = document.createElement('span');
        indicator.textContent = '[URGENT]';
        contentRow.appendChild(indicator);

        const controls = document.createElement('div');
        controls.classList.add('control-buttons');

        const createBtn = (cls, text, title) => {
            const btn = document.createElement('button');
            btn.classList.add(cls);
            btn.textContent = text;
            btn.setAttribute('title', title);
            return btn;
        };

        controls.appendChild(createBtn('user-timeout-button', 'U', 'Timeout this user'));
        controls.appendChild(createBtn('blacklist-button', 'B', 'Blacklist this user'));
        el.appendChild(controls);

        const closeDiv = document.createElement('div');
        closeDiv.classList.add('close-buttons');

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-button');
        deleteBtn.textContent = '';
        deleteBtn.setAttribute('title', 'Remove this message');
        closeDiv.appendChild(deleteBtn);

        el.appendChild(closeDiv);

        container.prepend(el);
        speakText(sender + ': ' + message, 'tr-TR', 0.5);

        
        el.classList.add('animate__animated', 'animate__slideInDown', 'animate__faster');
        el.addEventListener('animationend', () => {
            el.classList.remove('animate__animated', 'animate__slideInDown', 'animate__faster');
        }, { once: true });

        while (container.children.length > LinkCrawlerChatroom.MAX_DISPLAY_LINKS) {
            const last = container.lastChild;
            if (last) container.removeChild(last);
        }
        this.checkLinkCountBeep();
        return el;
    }

    setBeepThreshold(threshold) {
        const t = parseInt(threshold, 10);
        if (Number.isInteger(t) && t > 0) {
            this.beepThreshold = t;
            localStorage.setItem(this.beepThresholdKey, String(t));
            this.showTemporaryStatusMessage(`Beep threshold set to ${t}.`);
            
            this.lastBeepCount = 0;
        } else {
            this.showTemporaryStatusMessage('Invalid threshold value. Enter a positive integer.');
        }
    }

    updateOpenAllButtonCount() {
        const btn = document.querySelector(LinkCrawlerChatroom.SELECTORS.OPEN_ALL_BUTTON);
        const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (!btn || !container) return;
        const visible = Array.from(
            container.querySelectorAll('.link-item:not(.history-link)')
        ).filter(el => el.style.display !== 'none').length;
        btn.textContent = `Open All (${visible})`;
    }

    checkLinkCountBeep() {
        const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (!container) return;
        
        const totalCount = container.querySelectorAll('.link-item:not(.history-link)').length;
        if (totalCount > this.beepThreshold) {
            
            if (this.lastBeepCount === 0 || totalCount >= this.lastBeepCount + 10) {
                speakText(`ohhh nooo dostum linkler ${totalCount} adedi aştı.`, 'tr-TR', 0.5);
                this.lastBeepCount = totalCount;
            }
        } else {
            
            this.lastBeepCount = 0;
        }
        this.updateOpenAllButtonCount();
    }

    setupDeleteButtonListener() {
        const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (linkContainer) {
            linkContainer.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, (event) => {
                const linkItem = event.target.closest('.link-item');
                if (!linkItem) return;

                const anchor = event.target.closest('a');
                if (anchor) {
                    this.markLinkOpened(anchor.href);
                }

                if (event.target.classList.contains('delete-button')) {
                    const link = linkItem.querySelector('a');
                    if (link) {
                        const href = link.getAttribute('href');
                        if (href) {
                            const key = href.toLowerCase().trim();
                            this.linkMap.delete(key);
                        }
                    }
                    this._removeElementWithAnimation(linkItem);
                } else if (event.target.classList.contains('open-button')) {
                    const link = linkItem.querySelector('a');
                    if (link) {
                        const href = link.getAttribute('href');
                        if (href && isHttpProtocol(href)) {
                            window.open(href, '_blank', 'noopener');
                            this.markLinkOpened(href);
                            const key = href.toLowerCase().trim();
                            this.linkMap.delete(key);
                        }
                    }
                    this._removeElementWithAnimation(linkItem);
                } else if (event.target.classList.contains('blacklist-button')) {
                    const senderElement = linkItem.querySelector('.link-sender');
                    if (senderElement) {
                        const username = senderElement.textContent.replace(':', '').trim();
                        this.addToBlacklist(username);
                    }
                } else if (event.target.classList.contains('link-blacklist-button')) {
                    const linkElement = linkItem.querySelector('a');
                    if (linkElement) {
                        const href = linkElement.getAttribute('href');
                        if (this.addLinkToBlacklist(href)) {
                            this._removeElementWithAnimation(linkItem);
                        }
                    }
                } else if (event.target.classList.contains('timeout-button')) {
                    const link = linkItem.querySelector('a');
                    if (link) {
                        let mins = prompt('Timeout this link for how many minutes?', '10');
                        const minutes = parseInt(mins, 10);
                        if (Number.isInteger(minutes) && minutes > 0 && minutes <= MAX_TIMEOUT_MINUTES) {
                            this.timeoutLink(link.href, minutes);
                            const href = link.getAttribute('href');
                            if (href) {
                                const key = href.toLowerCase().trim();
                                this.linkMap.delete(key);
                            }
                            this._removeElementWithAnimation(linkItem);
                        } else if (mins !== null) {
                            alert(`Please enter a number between 1 and ${MAX_TIMEOUT_MINUTES}.`);
                        }
                    }
                } else if (event.target.classList.contains('user-timeout-button')) {
                    const senderElement = linkItem.querySelector('.link-sender');
                    if (senderElement) {
                        const username = senderElement.textContent.replace(':', '').trim();
                        let mins = prompt(`Timeout user "${username}" for how many minutes?`, '10');
                        const minutes = parseInt(mins, 10);
                        if (Number.isInteger(minutes) && minutes > 0 && minutes <= MAX_TIMEOUT_MINUTES) {
                            this.timeoutUser(username, minutes);
                            
                        } else if (mins !== null) {
                            alert(`Please enter a number between 1 and ${MAX_TIMEOUT_MINUTES}.`);
                        }
                    }
                }
                
                
                this.checkLinkCountBeep();
            });
        } else {
            console.warn("links-container not found for delete listener setup, retrying...");
            setTimeout(() => this.setupDeleteButtonListener(), 500);
        }
    }

    resetLinkCounts() {
        this.linkMap.forEach((info, url) => {
            info.count = 1;
            if (info.element) {
                const badge = info.element.querySelector('.link-count-badge');
                if (badge) badge.textContent = '1';
                info.element.classList.remove('duplicate-link');
            }
        });
        this.showTemporaryStatusMessage('Link counts reset.');
    }

    getOpenedLinks(now = Date.now()) {
        const TWO_DAYS = 48 * 60 * 60 * 1000;
        let opened = {};
        try {
            const stored = localStorage.getItem(this.openedLinksKey);
            if (stored) opened = JSON.parse(stored) || {};
        } catch (err) {
            console.error('Failed to load opened links from localStorage:', err);
        }
        for (const [url, ts] of Object.entries(opened)) {
            if (!isHttpProtocol(url) || now - ts > TWO_DAYS) delete opened[url];
        }
        return opened;
    }

    saveOpenedLinks(opened) {
        try {
            localStorage.setItem(this.openedLinksKey, JSON.stringify(opened));
        } catch (err) {
            console.error('Failed to save opened links to localStorage:', err);
        }
    }

    markLinkOpened(url) {
        if (!isHttpProtocol(url)) return;
        const now = Date.now();
        const opened = this.getOpenedLinks(now);
        opened[url] = now;
        this.saveOpenedLinks(opened);
    }

    normalizeTimestamp(ts) {
        const d = new Date(ts);
        const ms = d.getTime();
        return Number.isNaN(ms) ? Date.now() : ms;
    }

    purgeOldHistory(now = Date.now()) {
        const limit = LINK_HISTORY_HOURS * 60 * 60 * 1000;
        this.linkHistory = this.linkHistory.filter(item => now - item.timestamp <= limit);
    }

    loadLinkHistory() {
        try {
            const stored = localStorage.getItem(this.historyKey);
            if (stored) {
                const arr = JSON.parse(stored);
                if (Array.isArray(arr)) {
                    this.linkHistory = arr.filter(item => isHttpProtocol(item.url));
                    this.purgeOldHistory();
                    this.linkHistory.forEach(item => {
                        if (!this.linkMap.has(item.url)) {
                            const el = this.displayLink({
                                url: item.url,
                                displayText: item.url,
                                sender: item.sender,
                                timestamp: item.timestamp,
                                isDuplicate: item.count > 1,
                                count: item.count,
                                message: item.message || '',
                                urgent: item.urgent || false,
                                isHistory: true,
                            });
                            this.linkMap.set(item.url, { element: el, count: item.count });
                            this.seenLinks.add(item.url);
                        }
                    });
                    this.applySearchFilter();
                }
            }
        } catch (err) {
            console.error('Failed to load link history from localStorage:', err);
            this.linkHistory = [];
        }
    }

    saveLinkHistory() {
        this.purgeOldHistory();
        const filtered = this.linkHistory.filter(item => isHttpProtocol(item.url));
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(filtered));
        } catch (err) {
            console.error('Failed to save link history to localStorage:', err);
        }
    }

    exportSettings() {
        const keys = [
            this.localStorageKey,
            this.trustedKey,
            this.linkBlacklistKey,
            this.openedLinksKey,
            this.historyKey
        ];
        const data = {};
        keys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) {
                try { data[k] = JSON.parse(val); } catch (e) { data[k] = val; } 
            }
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kick_link_crawler_settings.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showTemporaryStatusMessage('Settings exported.');
    }

    importSettings(json) {
        let data;
        try { data = JSON.parse(json); } catch (err) {
            this.showTemporaryStatusMessage('Invalid settings file.');
            return;
        }
        const keys = [
            this.localStorageKey,
            this.trustedKey,
            this.linkBlacklistKey,
            this.openedLinksKey,
            this.historyKey
        ];
        keys.forEach(k => {
            if (data[k] !== undefined) {
                localStorage.setItem(k, JSON.stringify(data[k]));
            }
        });
        this.loadBlacklist();
        this.loadTrustedUsers();
        this.loadLinkBlacklist();
        this.loadLinkHistory();
        this.showTemporaryStatusMessage('Settings imported.');
    }

    openAllLinks() {
        const SOFT_LIMIT = 20;
        const now = Date.now();
        const openedStore = this.getOpenedLinks(now);

        
        const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
        if (!linkContainer) return;

        
        const visibleLinks = Array.from(
            linkContainer.querySelectorAll('.link-item:not(.history-link)')
        ).filter(el => el.style.display !== 'none');

        
        const toOpen = [];
        const seen = new Set();
        visibleLinks.forEach(el => {
            const a = el.querySelector('a[href]');
            if (!a) return;
            const href = a.href;
            if (!href || !isHttpProtocol(href) || openedStore[href]) return;
            const key = href.toLowerCase().trim();
            if (seen.has(key)) return;      
            seen.add(key);
            toOpen.push(href);
        });

        if (!toOpen.length) {
            return this.showTemporaryStatusMessage('No new links to open.');
        }

        const promptMsg = toOpen.length > SOFT_LIMIT
            ? `${toOpen.length} links will be opened in new tabs.\nThis may slow down your browser. Continue?`
            : `${toOpen.length} link${toOpen.length > 1 ? 's' : ''} will be opened. Continue?`;

        if (!window.confirm(promptMsg)) return;

        const triggerClick = (url) => {
            if (!isHttpProtocol(url)) return;
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            openedStore[url] = now;
        };

        toOpen.forEach(triggerClick);

        this.saveOpenedLinks(openedStore);

        this.showTemporaryStatusMessage(`${toOpen.length} link${toOpen.length !== 1 ? 's' : ''} opened.`);
    }


    recoverOpenedLinks() {
        const opened = this.getOpenedLinks(Date.now());
        const urls   = Object.keys(opened);

        if (!urls.length) {
            return this.showTemporaryStatusMessage('No saved links found for recovery.');
        }

        if (!window.confirm(`${urls.length} saved link${urls.length !== 1 ? 's' : ''} will be reopened in new tabs. Continue?`)) {
            return;
        }

        const clickOpen = (url) => {
            if (!isHttpProtocol(url)) return;
            const a   = document.createElement('a');
            a.href    = url;
            a.target  = '_blank';
            a.rel     = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        urls.forEach(clickOpen);

        this.showTemporaryStatusMessage(`${urls.length} link${urls.length !== 1 ? 's' : ''} reopened from history.`);
    }

    handleClear() {
          const linkContainer = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
          if (linkContainer) {
              linkContainer.innerHTML = '<div class="clear-message">-- Chat Cleared --</div>';
              setTimeout(() => {
                const clearMsgElement = linkContainer.querySelector('.clear-message');
                if(clearMsgElement) clearMsgElement.remove();
              }, 5000);
          }
          
          
          this.seenLinks.clear();
          this.linkMap.clear();
          this.linkHistory = [];
          this.saveLinkHistory();
          console.log("Chat cleared: Cleared seen links set.");
          
        
      }

      removeDisplayedLinks() {
          const container = document.querySelector(LinkCrawlerChatroom.SELECTORS.LINKS_CONTAINER);
          if (container) {
              container.innerHTML = '';
          }
          this.linkMap.clear();
          this.updateOpenAllButtonCount();
      }

      searchLinks(query) {
          this.currentSearchQuery = query.toLowerCase();
          this.applySearchFilter();
      }

      filterLinks(filter) {
          this.currentFilter = filter;
          this.applySearchFilter();
      }

      applySearchFilter() {
          this.linkMap.forEach((info) => {
              if (!info.element) return;
              const isHistory = info.element.classList.contains('history-link');
              let matchesQuery = true;
              if (this.currentSearchQuery) {
                  const text = info.element.textContent.toLowerCase();
                  matchesQuery = text.includes(this.currentSearchQuery);
              }
              let matchesFilter = true;
              if (this.currentFilter === 'history') {
                  matchesFilter = isHistory;
              } else if (this.currentFilter === 'urgent') {
                  matchesFilter = info.element.classList.contains('urgent-message') && !isHistory;
              } else if (this.currentFilter === 'duplicates') {
                  matchesFilter = info.element.classList.contains('duplicate-link') && !isHistory;
              } else {
                  matchesFilter = !isHistory;
              }
              info.element.style.display = (matchesQuery && matchesFilter) ? '' : 'none';
          });
          
          this.checkLinkCountBeep();
      }

      
      showTemporaryStatusMessage(message, duration = 3000) {
          let statusElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.STATUS_MESSAGE);
          if (!statusElement) {
              statusElement = document.createElement('div');
              statusElement.id = LinkCrawlerChatroom.SELECTORS.STATUS_MESSAGE.slice(1);
              document.body.appendChild(statusElement); 
          }
          statusElement.textContent = message;
          statusElement.style.display = 'block';

          
          if (this.statusTimeout) {
              clearTimeout(this.statusTimeout);
          }

          
          this.statusTimeout = setTimeout(() => {
              statusElement.style.display = 'none';
          }, duration);
      }


     
        initProgressBar() {
            if (document.getElementById('progress-container')) return;

            const container = document.createElement('div');
            container.id = 'progress-container';

            const bar = document.createElement('div');
            bar.id = 'progress-bar';

            const labels = document.createElement('div');
            labels.id = 'progress-labels';

            this.countLabel = document.createElement('span');
            this.goalLabel = document.createElement('span');

            this.countLabel.textContent = '0';
            this.goalLabel.textContent = 'Hedef: ' + this.progressGoal;

            labels.appendChild(this.countLabel);
            labels.appendChild(this.goalLabel);

            container.appendChild(bar);
            container.appendChild(labels);
            document.body.prepend(container);

            
            const spacer = document.createElement('div');
            spacer.style.height = '30px';
            document.body.insertBefore(spacer, document.body.children[1]);

            const percentLabel = document.createElement('div');
            percentLabel.id = 'progress-percent';
            percentLabel.textContent = '0%';
            container.appendChild(percentLabel);
            this.percentLabel = percentLabel;


            this.updateProgressBar(); 
        }
        getTotalMessages() {
            return this.totalMessages;
        }

        updateProgressBar(newCount) {
            const count = typeof newCount === 'number' ? newCount : this.getTotalMessages();
            const bar = document.getElementById('progress-bar');
            if (!bar) return;
            const pct = Math.min(100, (count / this.progressGoal) * 100);
            bar.style.width = pct + '%';

            if (this.countLabel) {
                this.countLabel.textContent = count.toLocaleString('tr-TR');
            }
            if (this.percentLabel) {
                this.percentLabel.textContent = `${pct.toFixed(3)}%`;
            }
        }



      
      formatDateLocal(d) {
          const year  = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day   = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      }

      getCurrentDateKey() {
          const now = new Date();
          if (now.getHours() < 6) now.setDate(now.getDate() - 1);
          return this.formatDateLocal(now);
      }

      getDateKeyFromTimestamp(ts) {
          const d = new Date(ts);
          if (d.getHours() < 6) d.setDate(d.getDate() - 1);
          return this.formatDateLocal(d);
      }

      updateStatsModal() {
          const container = document.getElementById('stats-content');
          if (!container) return;
          container.innerHTML = '';
          
          
          const dailyLinkCounts = {};
          const seen = new Set();
          
          this.linkHistory.forEach(item => {
              const key = this.getDateKeyFromTimestamp(item.timestamp);
              if (key === this.currentStatsDateKey) {
                  const id = item.sender.toLowerCase() + '|' + item.url.toLowerCase();
                  if (seen.has(id)) return;
                  seen.add(id);
                  const user = item.sender.toLowerCase();
                  dailyLinkCounts[user] = (dailyLinkCounts[user] || 0) + 1;
              }
          });

          const entries = Object.entries(dailyLinkCounts).sort((a,b) => b[1]-a[1]);
          if (entries.length === 0) {
              container.textContent = 'No data since 06:00.';
              return;
          }

          const list = document.createElement('ul');
          entries.forEach(([user,count]) => {
              const li = document.createElement('li');
              li.textContent = `${user}: ${count}`;
              list.appendChild(li);
          });
          container.appendChild(list);
      }
}


async function digestMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


async function fetchAndDisplayUpdates() {
    try {
        const response = await fetch('updates.md');
        if (!response.ok) return;
        const text = await response.text();
        const hash = await digestMessage(text);
        const stored = localStorage.getItem(LinkCrawlerChatroom.STORAGE_KEYS.UPDATES_HASH);
        if (stored === hash) return;

        const modal = document.querySelector(LinkCrawlerChatroom.SELECTORS.UPDATES_MODAL);
        const contentDiv = document.querySelector(LinkCrawlerChatroom.SELECTORS.UPDATES_CONTENT);
        const closeBtn = modal?.querySelector('.close-updates-modal');
        if (!modal || !contentDiv || !closeBtn) return;

        if (typeof marked !== 'undefined') {
            const rawHtml = marked.parse(text);
            if (typeof DOMPurify !== 'undefined') {
                contentDiv.innerHTML = DOMPurify.sanitize(rawHtml);
            } else {
                contentDiv.innerHTML = rawHtml;
            }
        } else {
            contentDiv.textContent = text;
        }
        modal.style.display = 'block';

        const closeModal = () => {
            modal.style.display = 'none';
            localStorage.setItem(LinkCrawlerChatroom.STORAGE_KEYS.UPDATES_HASH, hash);
            closeBtn.removeEventListener('click', closeModal);
            window.removeEventListener('click', outsideClick);
        };

        const outsideClick = (e) => { if (e.target === modal) closeModal(); };

        closeBtn.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, closeModal);
        window.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, outsideClick);
    } catch (err) {
        console.error('Failed to load updates:', err);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLParams();
    const user = urlParams.getParam("user");
    const loadingElement = document.querySelector(LinkCrawlerChatroom.SELECTORS.LOADING);
    let crawler;

    if (!user) {
        if (loadingElement) {
            loadingElement.textContent = 'Error: No user specified in URL params (?user=username). Add ?user=kick_username to the URL.';
            loadingElement.style.display = 'block';
        } else {
            console.error('Error: No user specified and loading element not found.');
        }
        return;
    }

    if (loadingElement) {
        loadingElement.textContent = `Fetching channel info for ${user}...`;
        loadingElement.style.display = 'block';
    }

    crawler = new LinkCrawlerChatroom(user);
    window.crawler = crawler; 
    crawler.setupModal(); 
    fetchAndDisplayUpdates();

    
    const recoverFlag = urlParams.getParam('recover');
    if (recoverFlag !== null) {
        
        setTimeout(() => crawler.recoverOpenedLinks(), 100);
    }

    const resetButton = document.querySelector(LinkCrawlerChatroom.SELECTORS.RESET_COUNTS_BUTTON);
    if (resetButton) {
        resetButton.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => crawler.resetLinkCounts());
    }

    const openAllButton = document.querySelector(LinkCrawlerChatroom.SELECTORS.OPEN_ALL_BUTTON);
    if (openAllButton) {
        openAllButton.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => crawler.openAllLinks());
        crawler.updateOpenAllButtonCount();
    }

    const searchInput = document.querySelector(LinkCrawlerChatroom.SELECTORS.SEARCH_INPUT);
    if (searchInput) {
        searchInput.addEventListener(LinkCrawlerChatroom.EVENTS.INPUT, (e) => crawler.searchLinksDebounced(e.target.value));
    }

    const filterSelect = document.querySelector(LinkCrawlerChatroom.SELECTORS.FILTER_SELECT);
    if (filterSelect) {
        filterSelect.addEventListener(LinkCrawlerChatroom.EVENTS.CHANGE, (e) => crawler.filterLinks(e.target.value));
    }

    const exportBtn = document.querySelector(LinkCrawlerChatroom.SELECTORS.EXPORT_BUTTON);
    if (exportBtn) {
        exportBtn.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => crawler.exportSettings());
    }

    const importBtn = document.querySelector(LinkCrawlerChatroom.SELECTORS.IMPORT_BUTTON);
    if (importBtn) {
        importBtn.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = () => {
                const file = input.files && input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        crawler.importSettings(reader.result);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }

    const testModeToggle = document.getElementById('test-mode-toggle');
    if (testModeToggle) {
        testModeToggle.checked = crawler.isTestMode;
        testModeToggle.addEventListener(LinkCrawlerChatroom.EVENTS.CHANGE, (e) => {
            crawler.toggleTestMode(e.target.checked);
        });
    }

    const sayacBtn = document.getElementById('sayac-btn');
    if (sayacBtn) {
        sayacBtn.addEventListener(LinkCrawlerChatroom.EVENTS.CLICK, () => {
            window.open('/sayac.html', '_blank');
        });
    }

    crawler.getUserInfo(user)
      .then(userData => {
        if (userData && userData.chatroom && userData.chatroom.id && userData.chatroom.channel_id) {
            console.log(`Got chatroom ID: ${userData.chatroom.id}, Channel ID: ${userData.chatroom.channel_id}`);
             if (loadingElement) loadingElement.textContent = `Connecting to ${user}'s chat...`;
            crawler.connectToChatroom(userData.chatroom.id, userData.chatroom.channel_id);
        } else {
             console.error("Could not get valid chatroom/channel ID from user data:", userData);
             if (loadingElement) loadingElement.textContent = `Error: Could not find chatroom info for user ${user}. The username might be incorrect or the API response is unexpected.`;
        }
      })
      .catch(error => {
        console.error("Initial getUserInfo promise chain failed:", error);
        if (loadingElement) loadingElement.textContent = `Failed to fetch initial info for ${user}. See console for details. Up to 5 retries will be attempted.`;
      });
});

function dontLeave() {
    return "Please, don't leave!";
}

window.addEventListener(LinkCrawlerChatroom.EVENTS.BEFORE_UNLOAD, (e) => {
    const message = dontLeave();
    e.returnValue = message;
    return message;
});


let audioContextInitialized = false;

function ensureAudioContext() {
    if (audioContextInitialized) return;
    playBeep(0.001); 
    speakText(' ', 'tr-TR', 0.01);
    audioContextInitialized = true;
}

document.addEventListener(LinkCrawlerChatroom.EVENTS.POINTER_DOWN, ensureAudioContext, { once: true });
document.addEventListener(LinkCrawlerChatroom.EVENTS.KEY_DOWN, ensureAudioContext, { once: true });


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isHttpProtocol,
        debounce,
        URLParams,
        dontLeave,
        LinkCrawlerChatroom
    };
}