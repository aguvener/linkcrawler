
import { useEffect } from 'react';
import { generateRandomLink } from '../services/kickService';
import { LinkItemData } from '../types';

export const useTestMode = (testMode: boolean, addLink: (link: LinkItemData) => void) => {
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (testMode) {
            const scheduleNextLink = () => {
                const delay = Math.random() * 5000 + 5000; // 5-10 seconds
                intervalId = setTimeout(() => {
                    const randomLink = generateRandomLink();
                    addLink(randomLink);
                    scheduleNextLink();
                }, delay);
            };
            scheduleNextLink();
        }

        return () => {
            if (intervalId) {
                clearTimeout(intervalId);
            }
        };
    }, [testMode, addLink]);
};
