import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';

export const useGptOssManager = () => {
    const [keys, setKeys] = usePersistedState<string[]>('gptOssApiKeys_v1', []);
    const [baseUrl, setBaseUrl] = usePersistedState<string>('gptOssBaseUrl_v1', '');
    const [modelName, setModelName] = usePersistedState<string>('gptOssModelName_v1', '');

    const addKey = useCallback((key: string) => {
        const trimmedKey = key.trim();
        if (!trimmedKey) return;
        
        setKeys(prev => {
            if (prev.includes(trimmedKey)) {
                return prev;
            }
            return [...prev, trimmedKey];
        });
    }, [setKeys]);

    const removeKey = useCallback((keyToRemove: string) => {
        setKeys(prev => prev.filter(key => key !== keyToRemove));
    }, [setKeys]);

    return { keys, addKey, removeKey, baseUrl, setBaseUrl, modelName, setModelName };
};
