import { GoogleGenAI } from "@google/genai";
import { ModelName, DailyUsage } from "../types";

let keyGroups: string[][] = [];
let currentGroupIndex = 0;
let currentKeyInGroupIndex = 0;

const USAGE_DB_URL = 'https://jsonbase.com/advanced-chapter-translator-gemini-usage-v2';

export const initializeKeys = (keys: string[]) => {
    // Treat all keys as a single group for simplicity and compatibility with rotation logic
    const validKeys = keys.map(k => k.trim()).filter(Boolean);
    keyGroups = validKeys.length > 0 ? [validKeys] : [];
    currentGroupIndex = 0;
    currentKeyInGroupIndex = 0;
};

const getCurrentApiKey = (): string | null => {
    if (currentGroupIndex >= keyGroups.length) return null;
    const group = keyGroups[currentGroupIndex];
    if (currentKeyInGroupIndex >= group.length) return null;
    return group[currentKeyInGroupIndex];
}

const moveToNextKey = (): boolean => {
    if (currentGroupIndex >= keyGroups.length) return false;

    currentKeyInGroupIndex++;
    if (currentKeyInGroupIndex >= keyGroups[currentGroupIndex].length) {
        currentKeyInGroupIndex = 0;
        currentGroupIndex++;
    }

    return currentGroupIndex < keyGroups.length;
}

export const getApiKeyInfo = () => {
    if (keyGroups.length === 0 || keyGroups[0].length === 0) {
        return { totalGroups: 0, currentGroup: 0, globalTotal: 0, globalCurrent: 0 };
    }

    const allKeys = keyGroups.flat();
    const globalTotal = allKeys.length;
    let globalCurrent = 0;

    for (let i = 0; i < currentGroupIndex; i++) {
        globalCurrent += keyGroups[i].length;
    }
    globalCurrent += currentKeyInGroupIndex;
    
    // The "current" key is the one we are about to use, so add 1 to the count of used keys
    globalCurrent += 1;

    return {
        totalGroups: keyGroups.length,
        currentGroup: Math.min(currentGroupIndex + 1, keyGroups.length),
        globalTotal,
        globalCurrent: Math.min(globalCurrent, globalTotal),
    };
};

export const getSharedUsage = async (): Promise<DailyUsage | null> => {
    try {
        const response = await fetch(USAGE_DB_URL, { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            if (data && typeof data.date === 'string' && typeof data.counts === 'object') {
                return data as DailyUsage;
            }
        }
        return null;
    } catch (error) {
        console.warn("Failed to fetch shared usage data:", error);
        return null;
    }
};

export const updateSharedUsage = async (usage: DailyUsage): Promise<void> => {
    try {
        const response = await fetch(USAGE_DB_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(usage),
        });

        if (!response.ok) {
            // Log a warning if the server responds but with a failure status
            console.warn(`Failed to update shared usage data. Server responded with status: ${response.status}`);
        }
    } catch (error) {
        // This will catch network errors like "Failed to fetch" and prevent them from throwing an error.
        console.warn("Could not sync usage data with the shared database due to a network error. The app will continue using local storage.", error);
    }
};

export const translateChapterStream = async (
    chapterTitle: string,
    chapterContent: string,
    modelName: ModelName,
    systemPrompt: string,
    temperature: number,
    thinkingBudget: number, // New parameter
    onChunk: (chunk: string) => void,
    onKeySwitched: (newKeyInfo: ReturnType<typeof getApiKeyInfo>) => void
): Promise<void> => {
    if (keyGroups.length === 0 || keyGroups.flat().length === 0) {
        throw new Error("لم يتم تكوين أي مفاتيح API. يرجى إضافة مفتاح واحد على الأقل في الإعدادات.");
    }
    
    const fullQuery = `
    العنوان الأصلي: ${chapterTitle}
    محتوى الفصل الأصلي:
    ---
    ${chapterContent}
    ---

    قم بتطبيق التعليمات بدقة 100% على النص أعلاه وقم بإخراج النص المترجم والمنسق فقط (العنوان ثم المحتوى).
    `;

    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 2000;

    while (true) {
        const currentApiKey = getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error("All available API keys in all groups have reached their usage limits.");
        }

        const ai = new GoogleGenAI({ apiKey: currentApiKey });
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            let hasReceivedText = false;
            try {
                // Configure generation parameters
                const requestConfig: any = {
                    systemInstruction: systemPrompt,
                    temperature: temperature,
                };

                // STRICT CHECK: Only apply thinking config to models that explicitly support it.
                // sending thinkingConfig to flash-lite or older models causes a 400 InvalidArgument error.
                const supportsThinking = modelName === 'gemini-3-pro-preview' || modelName === 'gemini-2.5-flash' || modelName === 'gemini-2.5-pro';
                
                if (supportsThinking && thinkingBudget > 0) {
                     requestConfig.thinkingConfig = {
                        thinkingBudget: thinkingBudget
                    };
                }

                const responseStream = await ai.models.generateContentStream({
                    model: modelName,
                    contents: [{ parts: [{ text: fullQuery }] }],
                    config: requestConfig
                });

                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (text) {
                        hasReceivedText = true;
                        onChunk(text);
                    }
                }
                
                if (!hasReceivedText) {
                    throw new Error("API response was empty. The request might have been blocked due to safety settings or other issues.");
                }
                // If successful, break the loops and return
                return;

            } catch (error: any) {
                const errorMessage = (error.message || '').toLowerCase();
                
                // Check for specific thinking budget errors (often 400 InvalidArgument)
                if (errorMessage.includes('thinking') || errorMessage.includes('invalid argument')) {
                     console.error("Thinking Config Error - Retrying without thinking budget may fix this if model doesn't support it.");
                }

                const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('429') || errorMessage.includes('api key not valid');
                const isOverloadedError = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable');

                if (isQuotaError) {
                    console.warn(`API key (Group ${currentGroupIndex + 1}, Key ${currentKeyInGroupIndex + 1}) reached its quota or is invalid. Trying next key.`);
                    if (moveToNextKey()) {
                        onKeySwitched(getApiKeyInfo());
                    } else {
                        throw new Error("All API keys have been tried and failed, likely due to usage limits or invalid keys.");
                    }
                    // Break the retry loop for this key and move to the next key in the outer while loop
                    break; 
                } else if (isOverloadedError && attempt < MAX_RETRIES - 1) {
                    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`Model is overloaded. Retrying attempt ${attempt + 2}/${MAX_RETRIES} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // Continue to the next iteration of the retry loop
                } else {
                    // For non-retryable errors or last failed attempt
                    console.error(`Translation failed for chapter "${chapterTitle}" on attempt ${attempt + 1}:`, error);
                    throw new Error(`Translation failed: ${error.message}`);
                }
            }
        }
    }
};