
export const MAX_DISPLAY_LINKS = 300;
export const MAX_TIMEOUT_MINUTES = 10080; // 7 days
export const LINK_HISTORY_HOURS = 24;
export const PROGRESS_GOAL = 17000000;
export const DEFAULT_BEEP_THRESHOLD = 50;

export const STORAGE_KEYS = {
    BLACKLIST: 'kickLinkCrawlerBlacklist',
    TRUSTED: 'kickLinkCrawlerTrusted',
    LINK_BLACKLIST: 'kickLinkCrawlerLinkBlacklist',
    OPENED_LINKS: 'kickLinkCrawlerOpenedLinks',
    HISTORY: 'kickLinkCrawlerLinkHistory',
    BEEP_THRESHOLD: 'kickLinkCrawlerBeepThreshold',
    TOTAL_MESSAGES: 'kickLinkCrawlerTotalMessages',
    TEST_MODE: 'kickLinkCrawlerTestMode',
    SENDER_COUNTS: 'kickLinkCrawlerSenderCounts',
    SUGGESTION_THRESHOLD: 'kickLinkCrawlerSuggestionThreshold'
};

export const DEFAULT_TRUSTED_USERS = ['ses_muhendisi', 'aerloss'];

export const CONNECTION_CONFIG = {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    RETRY_BACKOFF_MULTIPLIER: 1.5
} as const;

export const STATUS_MESSAGES = {
    IDLE: 'Initializing...',
    FETCHING_USER: (username: string) => `Fetching info for ${username}...`,
    CONNECTING: (username: string) => `Connecting to ${username}'s chat...`,
    CONNECTED: (username: string) => `Connected to ${username}'s chat`,
    USER_NOT_FOUND: (username: string) => `User '${username}' not found`,
    INVALID_CHATROOM: (username: string) => `User '${username}' does not have a valid chatroom`,
    CONNECTION_TIMEOUT: 'Connection timeout. Retrying...',
    CONNECTION_FAILED: 'Failed to connect after multiple attempts',
    API_ERROR: 'Failed to fetch user info. Please check your connection'
} as const;
