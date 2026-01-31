import { ModelName } from "../types";

let keys: string[] = [];
let baseUrl: string = '';
let modelIdentifier: string = '';
let currentKeyIndex = 0;

export const initialize = (gptOssKeys: string[], gptOssBaseUrl: string, gptOssModelName: string) => {
    keys = gptOssKeys.map(k => k.trim()).filter(Boolean);
    baseUrl = gptOssBaseUrl.trim();
    modelIdentifier = gptOssModelName.trim();
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
    modelName: ModelName, // This is 'gpt-oss/custom', but we use the initialized modelIdentifier
    systemPrompt: string,
    temperature: number,
    thinkingBudget: number, // Ignored but kept for interface consistency
    onChunk: (chunk: string) => void,
    onKeySwitched: (newKeyInfo: ReturnType<typeof getApiKeyInfo>) => void
): Promise<void> => {
    if (keys.length === 0 || !baseUrl || !modelIdentifier) {
        throw new Error("لم يتم تكوين GPT-OSS بشكل كامل. يرجى توفير مفتاح API ورابط أساسي واسم نموذج في الإعدادات.");
    }
    
    const fullQuery = `
    العنوان الأصلي: ${chapterTitle}
    محتوى الفصل الأصلي:
    ---
    ${chapterContent}
    ---

    قم بتطبيق التعليمات بدقة 100% على النص أعلاه وقم بإخراج النص المترجم والمنسق فقط (العنوان ثم المحتوى).
    `;

    const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    while (true) {
        const currentApiKey = getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error("All available GPT-OSS API keys have been tried and failed.");
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentApiKey}`
                },
                body: JSON.stringify({
                    model: modelIdentifier,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: fullQuery }
                    ],
                    stream: true,
                    max_tokens: 16384, // Increased limit to support long chapter translations
                    temperature: temperature,
                    top_p: 1.0,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                const errorMessage = errorData?.error?.message || errorData.message || 'Unknown error';

                if (response.status === 401 || response.status === 429) {
                    console.warn(`GPT-OSS API key (${maskKey(currentApiKey)}) failed with status ${response.status}. Trying next key.`);
                    if (moveToNextKey()) {
                        onKeySwitched(getApiKeyInfo());
                        continue; 
                    } else {
                        throw new Error("All GPT-OSS API keys have been tried and failed.");
                    }
                } else {
                    throw new Error(`GPT-OSS API Error (${response.status}): ${errorMessage}`);
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
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                    
                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.substring(6).trim();
                        try {
                            const parsed = JSON.parse(data);
                            const text = parsed.choices?.[0]?.delta?.content;
                            if (text) {
                                hasReceivedText = true;
                                onChunk(text);
                            }
                        } catch (e) {
                            // Ignore empty or malformed chunks gracefully
                        }
                    }
                }
            }
            
            if (!hasReceivedText) {
                 throw new Error("API response was empty. The request might have been blocked or the key is invalid.");
            }
            
            return;

        } catch (error: any) {
             console.error(`Translation failed using GPT-OSS:`, error);
             throw new Error(`GPT-OSS translation failed: ${error.message}`);
        }
    }
};