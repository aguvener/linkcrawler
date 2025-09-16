
import { UserInfo, LinkItemData } from '../types';

export const getUserInfo = async (username: string, retriesLeft: number = 5): Promise<UserInfo> => {
    for (let attempt = 1; attempt <= retriesLeft; attempt++) {
        try {
            const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorMsg += ` - ${errorBody.message || JSON.stringify(errorBody)}`;
                } catch (e) {
                    // Ignore JSON parse errors
                }
                throw new Error(errorMsg);
            }
            const data: UserInfo = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to get user info:", error);
            
            if (attempt >= retriesLeft) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    throw new Error(`Failed to get user info after ${retriesLeft} attempts`);
};

const randomUsernames = ['user1', 'test_user', 'random_sender', 'kick_fan', 'streamer_pal'];
const randomDomains = ['example.com', 'test.org', 'random.net', 'kick.com'];
const randomPaths = ['/watch', '/profile', '/video/123', '/page', '/resource'];

export const generateRandomLink = (): LinkItemData => {
    const sender = randomUsernames[Math.floor(Math.random() * randomUsernames.length)];
    const domain = randomDomains[Math.floor(Math.random() * randomDomains.length)];
    const path = randomPaths[Math.floor(Math.random() * randomPaths.length)];
    const url = `https://${domain}${path}?q=${Math.random().toString(36).substring(7)}`;
    const id = Math.random().toString(36).substring(2, 15);

    return {
        id,
        url,
        displayText: url,
        sender,
        timestamp: Date.now(),
        message: `Check out this cool link: ${url}`,
        count: 1,
        isDuplicate: false,
        urgent: Math.random() > 0.8, // 20% chance of being urgent
        isHistory: false,
    };
};
