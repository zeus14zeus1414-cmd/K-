import { ModelName } from "../types";

let keys: string[] = [];
let currentKeyIndex = 0;

export const initializeKeys = (cerebrasKeys: string[]) => {
    keys = cerebrasKeys.map(k => k.trim()).filter(Boolean);
    currentKeyIndex = 0;
};

const getCurrentApiKey = (): string | null => {
    if (currentKeyIndex >= keys.length) return null;
    return keys[currentKeyIndex];
}

const moveToNextKey = (): boolean => {
    currentKeyIndex++;
    return currentKeyIndex < keys.length;
}

export const getApiKeyInfo = () => {
    if (keys.length === 0) {
        return { totalGroups: 0, currentGroup: 0, globalTotal: 0, globalCurrent: 0 };
    }
    return {
        totalGroups: 1,
        currentGroup: 1,
        globalTotal: keys.length,
        globalCurrent: Math.min(currentKeyIndex + 1, keys.length),
    };
};

const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}


export const translateChapterStream = async (
    chapterTitle: string,
    chapterContent: string,
    modelName: ModelName,
    systemPrompt: string,
    temperature: number,
    thinkingBudget: number, // Ignored but kept for interface consistency
    onChunk: (chunk: string) => void,
    onKeySwitched: (newKeyInfo: ReturnType<typeof getApiKeyInfo>) => void
): Promise<void> => {
    if (keys.length === 0) {
        throw new Error("لم يتم تكوين أي مفاتيح API لـ Cerebras. يرجى إضافة مفتاح واحد على الأقل في الإعدادات.");
    }
    
    const fullQuery = `
    العنوان الأصلي: ${chapterTitle}
    محتوى الفصل الأصلي:
    ---
    ${chapterContent}
    ---

    قم بتطبيق التعليمات بدقة 100% على النص أعلاه وقم بإخراج النص المترجم والمنسق فقط (العنوان ثم المحتوى).
    `;

    const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
    const bareModelName = modelName.replace('cerebras/', '');

    // Define model-specific parameters
    let modelParams: any;
    if (bareModelName === 'gpt-oss-120b') {
        modelParams = {
            max_completion_tokens: 65536, // Massive context for 120b
            temperature: temperature,
            top_p: 1,
            reasoning_effort: "medium"
        };
    } else { // default to llama-3.1-70b params
        modelParams = {
            max_completion_tokens: 8192, // Increased from 2048 to prevent chapter cutoff
            temperature: temperature,
            top_p: 1.0,
        };
    }

    while (true) {
        const currentApiKey = getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error("All available Cerebras API keys have been tried and failed, likely due to usage limits or invalid keys.");
        }

        try {
            const response = await fetch(CEREBRAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentApiKey}`
                },
                body: JSON.stringify({
                    model: bareModelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: fullQuery }
                    ],
                    stream: true,
                    ...modelParams
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                const errorMessage = errorData?.error?.message || errorData.message || 'Unknown error';

                if (response.status === 401 || response.status === 429) {
                    console.warn(`Cerebras API key (${maskKey(currentApiKey)}) failed with status ${response.status}. Trying next key.`);
                    if (moveToNextKey()) {
                        onKeySwitched(getApiKeyInfo());
                        continue; 
                    } else {
                        throw new Error("All Cerebras API keys have been tried and failed.");
                    }
                } else {
                    throw new Error(`Cerebras API Error: ${errorMessage}`);
                }
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let hasReceivedText = false;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim();
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const text = parsed.choices?.[0]?.delta?.content;
                            if (text) {
                                hasReceivedText = true;
                                onChunk(text);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data chunk:', data, e);
                        }
                    }
                }
            }
            
            if (!hasReceivedText) {
                 throw new Error("API response was empty. The request might have been blocked or the key is invalid.");
            }
            
            return; // Success, exit the function

        } catch (error: any) {
             console.error(`Translation failed for chapter "${chapterTitle}" using Cerebras:`, error);
             // Rethrow to be caught by the translation hook
             throw new Error(`Cerebras translation failed: ${error.message}`);
        }
    }
};