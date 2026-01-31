
import React, { useState, useCallback, useRef } from 'react';
import { Chapter, ModelName, Notification, NotificationType, LogLevel } from '../types';
import { translateChapterStream as translateWithGemini, getApiKeyInfo as getGeminiApiKeyInfo } from '../services/geminiService';
import { translateChapterStream as translateWithCerebras, getApiKeyInfo as getCerebrasApiKeyInfo } from '../services/cerebrasService';
import { translateChapterStream as translateWithGptOss, getApiKeyInfo as getGptOssApiKeyInfo } from '../services/gptOssService';
import { SYSTEM_PROMPT, MODEL_RATE_LIMITS } from '../constants';

type SetChapters = React.Dispatch<React.SetStateAction<Chapter[]>>;
type UpdateUsage = (model: ModelName, incrementBy: number) => Promise<void>;
type RefreshApiKeyInfo = (model: ModelName) => void;
type AddLog = (message: string, level?: LogLevel) => void;


const DURATION_STORAGE_KEY = 'translationDurations';
const MAX_DURATIONS = 20;

const addDurationToStorage = (duration: number) => {
    try {
        const stored = localStorage.getItem(DURATION_STORAGE_KEY);
        const durations = stored ? JSON.parse(stored) : [];
        durations.push(duration);
        if (durations.length > MAX_DURATIONS) {
            durations.shift();
        }
        localStorage.setItem(DURATION_STORAGE_KEY, JSON.stringify(durations));
    } catch (e) { 
        console.warn('Could not save translation duration to localStorage.', e); 
    }
};

const getAverageDuration = (): number => {
    try {
        const stored = localStorage.getItem(DURATION_STORAGE_KEY);
        if (!stored) return 30000; // Default to 30 seconds if no data exists
        const durations = JSON.parse(stored);
        if (durations.length === 0) return 30000;
        
        const sum = durations.reduce((a: number, b: number) => a + b, 0);
        return sum / durations.length;
    } catch (e) {
        console.warn('Could not get average translation duration from localStorage.', e);
        return 30000;
    }
};


export const useTranslation = (
    setChapters: SetChapters,
    updateUsage: UpdateUsage,
    refreshApiKeyInfo: RefreshApiKeyInfo,
    addLog: AddLog
) => {
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState(0); // in milliseconds
    const translationQueue = useRef<Array<{ chapter: Chapter; model: ModelName; systemPrompt: string | null, temperature: number, thinkingBudget: number }>>([]);
    const initialQueueSize = useRef(0);

    const addNotification = useCallback((message: string, type: NotificationType) => {
        const newNotification = { id: Date.now(), message, type };
        setNotifications(prev => [...prev, newNotification]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 5000);
    }, []);
    
    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const runTranslation = useCallback(async (chapter: Chapter, model: ModelName, systemPrompt: string | null, temperature: number, thinkingBudget: number) => {
        const startTime = Date.now();
        addLog(`Starting translation for "${chapter.originalTitle}" with model ${model}.`);
        try {
            const systemPromptToUse = systemPrompt || SYSTEM_PROMPT;

            setChapters(prev =>
                prev.map(c => c.id === chapter.id ? { ...c, translatedText: '' } : c)
            );

            const handleChunk = (chunk: string) => {
                setChapters(prev =>
                    prev.map(c => 
                        c.id === chapter.id 
                        ? { ...c, translatedText: (c.translatedText || '') + chunk } 
                        : c
                    )
                );
            };

            const handleKeySwitched = (newKeyInfo: any) => {
                const message = `تم التبديل تلقائيًا إلى مفتاح API رقم ${newKeyInfo.globalCurrent} من ${newKeyInfo.globalTotal} لنموذج ${model}.`;
                addNotification(message, 'info');
                addLog(message, 'WARN');
                refreshApiKeyInfo(model);
            };
            
            let service: any;
            if (model.startsWith('cerebras/')) {
                service = translateWithCerebras;
            } else if (model.startsWith('gpt-oss/')) {
                service = translateWithGptOss;
            } else {
                service = translateWithGemini;
            }
            
            await service(chapter.originalTitle, chapter.originalContent, model, systemPromptToUse, temperature, thinkingBudget, handleChunk, handleKeySwitched);
            
            setChapters(prev =>
                prev.map(c => c.id === chapter.id ? { ...c, status: 'completed' } : c)
            );
            addLog(`Successfully translated "${chapter.originalTitle}".`, 'SUCCESS');
            return { success: true, chapterId: chapter.id };

        } catch (error: any) {
            const errorMessage = `فشل ترجمة (${chapter.originalTitle}): ${error.message}`;
            setChapters(prev =>
                prev.map(c => c.id === chapter.id ? { ...c, translatedText: `### ${errorMessage}`, status: 'failed' } : c)
            );
            addNotification(errorMessage, 'error');
            addLog(`Translation failed for "${chapter.originalTitle}": ${error.message}`, 'ERROR');
            return { success: false, chapterId: chapter.id };
        } finally {
            const endTime = Date.now();
            addDurationToStorage(endTime - startTime);
        }
    }, [setChapters, addNotification, refreshApiKeyInfo, addLog]);

    const processQueue = useCallback(async () => {
        if (translationQueue.current.length === 0) {
            setIsProcessing(false);
            setTranslationProgress(100);
            setEstimatedTime(0);
            return;
        }
        
        setIsProcessing(true);
       
        let successfulTranslations = 0;
        let failedTranslations = 0;
        const averageDuration = getAverageDuration();

        while (translationQueue.current.length > 0) {
            const progress = ((initialQueueSize.current - translationQueue.current.length) / initialQueueSize.current) * 100;
            setTranslationProgress(progress);
            setEstimatedTime(averageDuration * translationQueue.current.length);
            
            const job = translationQueue.current.shift();
            if (!job) continue;

            const { chapter, model, systemPrompt, temperature, thinkingBudget } = job;
            const result = await runTranslation(chapter, model, systemPrompt, temperature, thinkingBudget);

            if (result.success) {
                successfulTranslations++;
                await updateUsage(model, 1);
            } else {
                failedTranslations++;
            }

            if (translationQueue.current.length > 0) {
                const rateLimitPerMinute = MODEL_RATE_LIMITS[model] || 10;
                const delay = 60000 / rateLimitPerMinute;
                await new Promise(resolve => setTimeout(resolve, delay + 200)); // 200ms buffer
            }
        }
        
        setTranslationProgress(100);
        setEstimatedTime(0);

        if (successfulTranslations > 0) {
            const message = `اكتملت ترجمة ${successfulTranslations} فصل بنجاح!`;
            addNotification(message, 'success');
            addLog(message, 'SUCCESS');
        }
        if (failedTranslations > 0) {
            const message = `فشلت ترجمة ${failedTranslations} فصل.`;
            addNotification(message, 'error');
            addLog(message, 'ERROR');
        }

        setIsProcessing(false);
        initialQueueSize.current = 0;
    }, [addNotification, updateUsage, runTranslation, addLog]);

    const startTranslation = useCallback(async (chapters: Chapter[], model: ModelName, systemPrompt: string | null, temperature: number, thinkingBudget: number) => {
        const chaptersToTranslate = chapters.filter(c => (c.originalContent || '').trim() && (c.status === 'idle' || c.status === 'failed'));
        
        if (chaptersToTranslate.length === 0) {
            addNotification('لا توجد فصول جديدة أو فاشلة لترجمتها.', 'info');
            return;
        }
        
        if (isProcessing) return;
        
        const message = `بدأت ترجمة ${chaptersToTranslate.length} فصل.`;
        addNotification(message, 'info');
        addLog(message);
        
        initialQueueSize.current = chaptersToTranslate.length;
        setTranslationProgress(0);

        const newJobs = chaptersToTranslate.map(chapter => ({ chapter, model, systemPrompt, temperature, thinkingBudget }));
        translationQueue.current.push(...newJobs);

        setChapters(prev =>
            prev.map(c => chaptersToTranslate.some(ct => ct.id === c.id) ? { ...c, status: 'translating' } : c)
        );

        processQueue();
    }, [addNotification, setChapters, isProcessing, processQueue, addLog]);

    const retryTranslation = useCallback(async (chapter: Chapter, model: ModelName, systemPrompt: string | null, temperature: number, thinkingBudget: number) => {
        if(isProcessing) return;
        
        addLog(`Retrying translation for chapter "${chapter.originalTitle}".`);

        initialQueueSize.current = 1;
        setTranslationProgress(0);
        translationQueue.current.unshift({ chapter, model, systemPrompt, temperature, thinkingBudget });
        
        setChapters(prev => 
            prev.map(c => c.id === chapter.id ? { ...c, status: 'translating', translatedText: 'جاري إعادة المحاولة...' } : c)
        );
        
        processQueue();
    }, [setChapters, isProcessing, processQueue, addLog]);

    return {
        isLoading: isProcessing,
        notifications,
        translationProgress,
        estimatedTime,
        addNotification,
        removeNotification,
        startTranslation,
        retryTranslation,
    };
};
