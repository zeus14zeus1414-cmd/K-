import { useState, useEffect, useCallback } from 'react';
import { ModelName, DailyUsage } from '../types';
import { getApiKeyInfo as getGeminiApiKeyInfo } from '../services/geminiService';
import { getApiKeyInfo as getCerebrasApiKeyInfo } from '../services/cerebrasService';
import { getApiKeyInfo as getGptOssApiKeyInfo } from '../services/gptOssService';
import { getSharedUsage, updateSharedUsage } from '../services/geminiService';
import { usePersistedState } from './usePersistedState';

const getInitialUsage = (): { [key in ModelName]?: number } => ({
    'gemini-2.5-flash': 0,
    'gemini-flash-lite-latest': 0,
    'gemini-2.5-pro': 0,
    'gemini-3-pro-preview': 0,
    'cerebras/llama-3.1-70b': 0,
    'cerebras/gpt-oss-120b': 0,
    'gpt-oss/custom': 0,
});

export const useUsageTracker = () => {
    const [dailyUsage, setDailyUsage] = useState<{ [key in ModelName]?: number }>(getInitialUsage());
    const [apiKeyInfo, setApiKeyInfo] = useState<ReturnType<typeof getGeminiApiKeyInfo> | null>(null);
    
    // Changed from useState to usePersistedState to save the selection
    const [selectedModel, setSelectedModel] = usePersistedState<ModelName>('selectedModel', 'gemini-2.5-flash');
    
    const refreshApiKeyInfo = useCallback((model: ModelName) => {
        let getInfo;
        if (model.startsWith('cerebras/')) {
            getInfo = getCerebrasApiKeyInfo;
        } else if (model.startsWith('gpt-oss/')) {
            getInfo = getGptOssApiKeyInfo;
        } else {
            getInfo = getGeminiApiKeyInfo;
        }
        setApiKeyInfo(getInfo());
    }, []);

    useEffect(() => {
        const initializeUsage = async () => {
            const today = new Date().toISOString().split('T')[0];
            const initialCounts = getInitialUsage();

            try {
                // Shared usage is currently only tracked for Gemini models
                const sharedUsage = await getSharedUsage();
                if (sharedUsage && sharedUsage.date === today) {
                    const combinedCounts = { ...initialCounts, ...sharedUsage.counts };
                    setDailyUsage(combinedCounts);
                    localStorage.setItem('dailyTranslationUsage', JSON.stringify({ date: today, counts: combinedCounts }));
                } else {
                    if (sharedUsage && sharedUsage.date !== today) {
                        await updateSharedUsage({ date: today, counts: initialCounts }).catch(e => console.warn("Failed to reset shared usage for new day"));
                    }
                    const storedUsageRaw = localStorage.getItem('dailyTranslationUsage');
                    const storedUsage = storedUsageRaw ? JSON.parse(storedUsageRaw) : null;
                    if (storedUsage && storedUsage.date === today && storedUsage.counts) {
                        setDailyUsage({ ...initialCounts, ...storedUsage.counts });
                    } else {
                        localStorage.setItem('dailyTranslationUsage', JSON.stringify({ date: today, counts: initialCounts }));
                        setDailyUsage(initialCounts);
                    }
                }
            } catch (e) {
                console.error("Failed to initialize usage data:", e);
                localStorage.setItem('dailyTranslationUsage', JSON.stringify({ date: today, counts: initialCounts }));
                setDailyUsage(initialCounts);
            }
            // This will now use the persisted selectedModel
            refreshApiKeyInfo(selectedModel);
        };

        initializeUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const updateUsage = useCallback(async (model: ModelName, incrementBy: number) => {
        if (incrementBy <= 0) return;

        const today = new Date().toISOString().split('T')[0];
        const newCounts = { ...dailyUsage, [model]: (dailyUsage[model] || 0) + incrementBy };
        
        setDailyUsage(newCounts);
        const usageData: DailyUsage = { date: today, counts: newCounts };
        localStorage.setItem('dailyTranslationUsage', JSON.stringify(usageData));

        // Only sync Gemini usage for now
        if (!model.startsWith('cerebras/') && !model.startsWith('gpt-oss/')) {
            try {
                await updateSharedUsage(usageData);
            } catch (e) {
                console.warn("Could not sync with shared usage after update. Local storage is up-to-date.", e);
            }
        }
    }, [dailyUsage]);


    return {
        dailyUsage,
        apiKeyInfo,
        updateUsage,
        selectedModel,
        setSelectedModel: (model: ModelName) => {
            setSelectedModel(model);
            refreshApiKeyInfo(model);
        },
        refreshApiKeyInfo,
    };
};