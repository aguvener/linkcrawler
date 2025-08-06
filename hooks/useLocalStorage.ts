import { useState, useEffect } from 'react';

export const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        // SSR-safe: window might be undefined during SSR or static builds
        if (typeof window === 'undefined') return initialValue;
        try {
            const raw = window.localStorage.getItem(key);
            if (raw === null) return initialValue;
            try {
                return JSON.parse(raw) as T;
            } catch {
                // Corrupted JSON; fall back and overwrite on next effect
                return initialValue;
            }
        } catch (error) {
            // Private mode/quota or access denied
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const valueToStore = storedValue;
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            // QuotaExceededError or access denied
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};
