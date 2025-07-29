
export interface UserInfo {
  chatroom: {
    id: number;
    channel_id: number;
  };
}

export interface SenderIdentity {
  badges: { type: 'moderator' | 'broadcaster' | string }[];
}

export interface Sender {
  id: number;
  username: string;
  slug: string;
  identity: SenderIdentity;
}

export interface ChatMessageEvent {
  id: string;
  event: string;
  data: string;
  channel: string;
}

export interface ParsedChatMessageData {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: Sender;
}

export interface LinkItemData {
  id: string;
  url: string;
  displayText: string;
  sender: string;
  timestamp: number;
  message: string;
  count: number;
  isDuplicate: boolean;
  urgent: boolean;
  isHistory: boolean;
}

export enum FilterType {
    ALL = "all",
    URGENT = "urgent",
    DUPLICATES = "duplicates",
    HISTORY = "history"
}

export interface Settings {
    [key: string]: any;
    kickLinkCrawlerBlacklist?: string[];
    kickLinkCrawlerTrusted?: string[];
    kickLinkCrawlerLinkBlacklist?: string[];
    kickLinkCrawlerOpenedLinks?: { [url: string]: number };
    kickLinkCrawlerLinkHistory?: any[];
    testMode?: boolean;
}
