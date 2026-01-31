import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';

export const useCerebrasApiKeyManager = () => {
    const [keys, setKeys] = usePersistedState<string[]>('cerebrasApiKeys_v1', []);

    const addKey = useCallback((key: string) => {
        const trimmedKey = key.trim();
        if (!trimmedKey) return;
        
        setKeys(prev => {
            // Avoid adding duplicate keys
            if (prev.includes(trimmedKey)) {
                return prev;
            }
            return [...prev, trimmedKey];
        });
    }, [setKeys]);

    const removeKey = useCallback((keyToRemove: string) => {
        setKeys(prev => prev.filter(key => key !== keyToRemove));
    }, [setKeys]);

    return { keys, addKey, removeKey };
};
