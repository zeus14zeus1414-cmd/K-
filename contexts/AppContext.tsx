
import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useChapterManager } from '../hooks/useChapterManager';
import { useUsageTracker } from '../hooks/useUsageTracker';
import { useTranslation } from '../hooks/useTranslation';
import { useTerminology } from '../hooks/useTerminology';
import { useCodex } from '../hooks/useCodex';
import { usePersistedState } from '../hooks/usePersistedState';
import { useApiKeyManager } from '../hooks/useApiKeyManager';
import { useCerebrasApiKeyManager } from '../hooks/useCerebrasApiKeyManager';
import { useGptOssManager } from '../hooks/useGptOssManager';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useLogger } from './LogContext';

import { initializeKeys as initializeGeminiKeys } from '../services/geminiService';
import { initializeKeys as initializeCerebrasKeys } from '../services/cerebrasService';
import { initialize as initializeGptOss } from '../services/gptOssService';

import { MODEL_LIMITS, DEFAULT_EXTRACTION_PROMPT } from '../constants';
import { Chapter, AppTheme } from '../types';
import { readChapterFile, readTextFromFile } from '../utils/fileReader';
import { parseChaptersFromText } from '../utils/chapterParser';

// Define the shape of the context data
type AppContextType = 
    & ReturnType<typeof useChapterManager>
    & ReturnType<typeof useUsageTracker>
    & ReturnType<typeof useTranslation>
    & ReturnType<typeof useTerminology>
    & ReturnType<typeof useCodex>
    & {
        systemPrompt: string | null;
        setSystemPrompt: React.Dispatch<React.SetStateAction<string | null>>;
        extractionPrompt: string;
        setExtractionPrompt: React.Dispatch<React.SetStateAction<string>>;
        uploadedFileName: string | null;
        setUploadedFileName: React.Dispatch<React.SetStateAction<string | null>>;
        temperature: number;
        setTemperature: React.Dispatch<React.SetStateAction<number>>;
        thinkingBudget: number;
        setThinkingBudget: React.Dispatch<React.SetStateAction<number>>;
        
        currentTheme: AppTheme;
        setTheme: (theme: AppTheme) => void;
        swapThemeColors: () => void;

        apiKeys: ReturnType<typeof useApiKeyManager>;
        cerebrasApiKeys: ReturnType<typeof useCerebrasApiKeyManager>;
        gptOssConfig: ReturnType<typeof useGptOssManager>;
        googleDrive: ReturnType<typeof useGoogleDrive>;

        activeChapter: Chapter | null;
        isLimitReached: boolean;
        hasApiKeysForModel: boolean;

        handleStartTranslation: () => void;
        handleRetry: (id: string) => void;
        handleFileImport: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
        handleChapterFileUpload: (chapterId: string, file: File) => Promise<void>;
    };

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_THEME: AppTheme = {
    id: 'zeus-gold',
    name: 'ZEUS (Default)',
    primary: '212 175 55', // Metallic Gold
    secondary: '250 204 21', // Lighter Gold / Yellow-400
    previewColor: '#d4af37'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addLog } = useLogger();

    const chapterManager = useChapterManager();
    const usageTracker = useUsageTracker();
    const terminology = useTerminology();
    const codex = useCodex();
    const apiKeys = useApiKeyManager();
    const cerebrasApiKeys = useCerebrasApiKeyManager();
    const gptOssConfig = useGptOssManager();
    const googleDrive = useGoogleDrive();

    // Initialize services with the latest keys from storage
    useEffect(() => {
        initializeGeminiKeys(apiKeys.keys);
        usageTracker.refreshApiKeyInfo(usageTracker.selectedModel);
    }, [apiKeys.keys, usageTracker.refreshApiKeyInfo, usageTracker.selectedModel]);

    useEffect(() => {
        initializeCerebrasKeys(cerebrasApiKeys.keys);
        usageTracker.refreshApiKeyInfo(usageTracker.selectedModel);
    }, [cerebrasApiKeys.keys, usageTracker.refreshApiKeyInfo, usageTracker.selectedModel]);

    useEffect(() => {
        initializeGptOss(gptOssConfig.keys, gptOssConfig.baseUrl, gptOssConfig.modelName);
        usageTracker.refreshApiKeyInfo(usageTracker.selectedModel);
    }, [gptOssConfig.keys, gptOssConfig.baseUrl, gptOssConfig.modelName, usageTracker.refreshApiKeyInfo, usageTracker.selectedModel]);


    const translation = useTranslation(chapterManager.setChapters, usageTracker.updateUsage, usageTracker.refreshApiKeyInfo, addLog);

    const [systemPrompt, setSystemPrompt] = usePersistedState<string | null>('systemPrompt', null);
    const [extractionPrompt, setExtractionPrompt] = usePersistedState<string>('extractionPrompt', DEFAULT_EXTRACTION_PROMPT);
    const [uploadedFileName, setUploadedFileName] = usePersistedState<string | null>('promptFileName', null);
    const [temperature, setTemperature] = usePersistedState<number>('ai_temperature', 0.7);
    const [thinkingBudget, setThinkingBudget] = usePersistedState<number>('ai_thinking_budget', 2048);
    
    // Theme State
    const [currentTheme, setCurrentTheme] = usePersistedState<AppTheme>('app_theme_v2', DEFAULT_THEME);

    // Apply Theme to CSS Variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', currentTheme.primary);
        root.style.setProperty('--color-secondary', currentTheme.secondary);
    }, [currentTheme]);
    
    const setTheme = (theme: AppTheme) => {
        setCurrentTheme(theme);
    };

    const swapThemeColors = () => {
        setCurrentTheme(prev => ({
            ...prev,
            primary: prev.secondary,
            secondary: prev.primary,
        }));
    };

    // --- LOGIC FOR PROMPT CONSTRUCTION (STRICT MODE) ---
    const combinedSystemPrompt = useMemo(() => {
        let finalPrompt = systemPrompt || '';
        
        // 1. Global Terminology (Highest Priority - Custom Dictionary)
        if (terminology.terms.length > 0) {
            // Sort terms by length (descending) to prevent partial matches
            const sortedTerms = [...terminology.terms].sort((a, b) => b.original.length - a.original.length);
            
            const terminologySection = `
\n
#####################################################################
### ⚠️ STRICT GLOSSARY & GRAMMAR RULES (القاموس والقواعد النحوية) ⚠️ ###

1. **NO MARKDOWN**: Do NOT make terms bold (**text**) or italic. Use plain text only.

2. **ORTHOGRAPHY & PREFIXES (الإملاء واللواصق)**:
   - If a particle (بـ, كـ, لـ, فـ, و) comes before a defined term, **CONNECT** it.
   - **NO spaces** allowed between the particle and the term.
   - Example (Term="التضحية"):
     - "With the Sacrifice" -> **بالتضحية** (Correct) | "بـ التضحية" (WRONG).
     - "For the Sacrifice" -> **للتضحية** (Correct) | "لـ التضحية" (WRONG).
     - "Like the Lion" -> **كالأسد** (Correct) | "كـ الأسد" (WRONG).

3. **GRAMMAR INTEGRATION (DEFINITE ARTICLE)**:
   - If the English is "The [Term]" and the Term matches a glossary entry:
     - Add "ال" (Al-) if it's a definite noun.
     - REMOVE "ال" (Al-) if it is the first part of a Genitive construction (Idafa/مضاف).
     - Do not simply paste the glossary value if the sentence requires "Al-" or requires removing "Al-".
   
4. **MANDATORY TERMS**:
${sortedTerms.map(t => `• English: "${t.original}" ➤ Arabic: "${t.translation}"`).join('\n')}

[End of Glossary]
#####################################################################
\n`;
            finalPrompt = terminologySection + finalPrompt; 
        }

        // 2. Active Codex Book (Story Context & Learned Terms)
        if (codex.activeBook && codex.activeBook.entries.length > 0) {
             // Sort entries by length (descending)
             const sortedEntries = [...codex.activeBook.entries].sort((a, b) => b.name.length - a.name.length);

            let codexSection = `\n
#####################################################################
### 🛡️ CODEX DATABASE (STRICT ADHERENCE REQUIRED) ###
NAME: "${codex.activeBook.name}"

RULES:
1. If a name in the text matches an entry below, you **MUST** use the provided Arabic translation.
2. **ORTHOGRAPHY**: Connect prefixes (بـ, لـ, كـ, و) directly to the name (e.g. "To [Name]" -> "ل[الاسم]" connected).
3. **NO MARKDOWN**: Do not put ** asterisks ** around codex terms.
4. Do NOT translate these names literally if a specific translation is provided here.

`;
            const categories = ['character', 'location', 'item', 'rank', 'other'];
            categories.forEach(cat => {
                const entries = sortedEntries.filter(e => e.category === cat) || [];
                if (entries.length > 0) {
                    codexSection += `--- ${cat.toUpperCase()} ---\n`;
                    entries.forEach(entry => {
                        codexSection += `• "${entry.name}" => "${entry.translation}" ${entry.description ? `(Context: ${entry.description})` : ''}\n`;
                    });
                }
            });

            codexSection += `#####################################################################\n`;
            finalPrompt += codexSection;
        }

        // 3. FINAL SAFETY LOCK (Anti-Hallucination Footer)
        // This ensures the last instruction the model reads is to be silent and strictly follow rules.
        finalPrompt += `
\n
#####################################################################
### 🚫 FINAL OUTPUT CONTROLS (تحذيرات نهائية) ###
1. **SILENCE**: Do not output "Here is the translation", "Note:", "Translation:", or any conversational filler.
2. **NO HALLUCINATIONS**: Do not add text that is not in the source.
3. **OUTPUT**: Return ONLY the translated Arabic text.
#####################################################################
`;

        return finalPrompt;
    }, [systemPrompt, terminology.terms, codex.activeBook]);

    const activeChapter = chapterManager.chapters[chapterManager.activeTabIndex] || null;
    const currentUsage = usageTracker.dailyUsage[usageTracker.selectedModel] ?? 0;
    const limit = MODEL_LIMITS[usageTracker.selectedModel] ?? 0;
    const isLimitReached = currentUsage >= limit;
    
    const hasApiKeysForModel = useMemo(() => {
        if (usageTracker.selectedModel.startsWith('cerebras/')) return cerebrasApiKeys.keys.length > 0;
        if (usageTracker.selectedModel.startsWith('gpt-oss/')) return gptOssConfig.keys.length > 0 && !!gptOssConfig.baseUrl && !!gptOssConfig.modelName;
        return apiKeys.keys.length > 0;
    }, [usageTracker.selectedModel, apiKeys.keys, cerebrasApiKeys.keys, gptOssConfig]);

    const handleStartTranslation = () => {
        if (!hasApiKeysForModel) {
            const errorMsg = `يرجى إضافة مفتاح API للنموذج المحدد (${usageTracker.selectedModel}) في الإعدادات.`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'ERROR');
            return;
        }
        if (isLimitReached) {
            const errorMsg = `تم الوصول إلى الحد اليومي للنموذج ${usageTracker.selectedModel}.`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'WARN');
            return;
        }

        // --- SMART FOLDER LOGIC ---
        // Check if we are translating a chapter from "المصدر" folder
        // If so, create a copy in "المترجمة" folder and translate THAT instead.
        const sourceFolder = chapterManager.folders.find(f => f.name === 'المصدر');
        const translatedFolder = chapterManager.folders.find(f => f.name === 'المترجمة');

        // We use chapterManager.chapters instead of passing them directly to handle state update logic
        let chaptersToProcess = chapterManager.chapters;

        // If the *Active* chapter is in Source, we might want to switch context to the Translated one immediately
        // But for bulk/batch, we iterate. 
        // NOTE: useTranslation handles filtering. We need to pre-process the chapters list passed to it.

        if (sourceFolder && translatedFolder) {
            const newChaptersList = [...chaptersToProcess];
            let addedNew = false;

            // Iterate through chapters that would be candidates for translation
            // (Idle/Failed and have content)
            const candidates = chaptersToProcess.filter(c => 
                (c.originalContent || '').trim() && (c.status === 'idle' || c.status === 'failed')
            );

            candidates.forEach(candidate => {
                if (candidate.folderId === sourceFolder.id) {
                    // Check if counterpart exists in Translated folder
                    const exists = newChaptersList.some(c => 
                        c.folderId === translatedFolder.id && c.originalTitle === candidate.originalTitle
                    );

                    if (!exists) {
                        // Create clone in Translated folder
                        const newChapter: Chapter = {
                            ...candidate,
                            id: crypto.randomUUID(),
                            folderId: translatedFolder.id,
                            translatedText: '',
                            status: 'idle' // Ready for translation
                        };
                        newChaptersList.push(newChapter);
                        addedNew = true;
                        
                        // Mark original as completed or keep it idle? 
                        // Let's keep original idle but we will NOT translate it in this run. 
                        // Instead, we translate the NEW chapter.
                    }
                }
            });

            if (addedNew) {
                // Update state with new chapters
                chapterManager.setChapters(newChaptersList);
                
                // If we added new chapters, we want to run translation on THOSE new chapters in the 'Translated' folder
                // NOT the ones in the 'Source' folder.
                chaptersToProcess = newChaptersList.filter(c => 
                     // Translate if it's in Translated Folder OR if it has no folder (legacy)
                     // But skip Source Folder chapters
                     c.folderId !== sourceFolder.id
                );
                
                // Show notification
                translation.addNotification('تم إنشاء نسخ للفصول في مجلد "المترجمة" وسيتم ترجمتها.', 'info');
                
                // Slight delay to ensure state update before running translation hook
                // In React batching, we might need to pass the new list directly
                translation.startTranslation(chaptersToProcess, usageTracker.selectedModel, combinedSystemPrompt, temperature, thinkingBudget);
                return;
            }
        }

        // Fallback: Standard translation (in-place)
        translation.startTranslation(chapterManager.chapters, usageTracker.selectedModel, combinedSystemPrompt, temperature, thinkingBudget);
    };

    const handleRetry = (id: string) => {
        if (!hasApiKeysForModel) {
            const errorMsg = `يرجى إضافة مفتاح API للنموذج المحدد (${usageTracker.selectedModel}) في الإعدادات.`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'ERROR');
            return;
        }
        const chapterToRetry = chapterManager.chapters.find(c => c.id === id);
        if (chapterToRetry && !isLimitReached) {
            translation.retryTranslation(chapterToRetry, usageTracker.selectedModel, combinedSystemPrompt, temperature, thinkingBudget);
        } else if (isLimitReached) {
            const errorMsg = `تم الوصول إلى الحد اليومي للنموذج ${usageTracker.selectedModel}.`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'WARN');
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // This is the Legacy/Basic Import for Home Page.
        // The ZeusEditor now has its own Advanced Import Modal.
        // We keep this for compatibility with the "Import" button on the Home Page empty state.
        
        const file = event.target.files?.[0];
        const input = event.target;
        if (!file) return;
        addLog(`Attempting to import file: ${file.name}`);

        try {
            const hasContent = chapterManager.chapters.some(c => c.originalContent.trim() !== '' || c.translatedText);
            if (hasContent && !window.confirm('لديك محتوى حالي. هل أنت متأكد من أنك تريد الاستيراد والكتابة فوقه؟ سيتم فقدان البيانات الحالية.')) {
                if (input) input.value = '';
                addLog('File import cancelled by user.', 'WARN');
                return;
            }
    
            let importedChapters: Chapter[] = [];
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
            if (fileExtension === 'json') {
                const content = await file.text();
                const parsedData = JSON.parse(content);
                if (Array.isArray(parsedData) && parsedData.every(c => 'id' in c && 'originalContent' in c)) {
                    importedChapters = parsedData as Chapter[];
                } else { throw new Error("Invalid JSON file format."); }
            } else if (fileExtension === 'txt' || fileExtension === 'docx') {
                const content = await file.text();
                const parsedData = JSON.parse(content); // Try parse as JSON first just in case
                if (Array.isArray(parsedData)) {
                    importedChapters = parsedData as Chapter[];
                } else {
                     // Fallback to text parsing
                     importedChapters = parseChaptersFromText(content);
                }
            } else { throw new Error("Unsupported file type."); }
    
            if (importedChapters.length > 0) {
                // Determine Source Folder ID if exists to place imported chapters there by default
                const sourceFolder = chapterManager.folders.find(f => f.name === 'المصدر');
                if (sourceFolder) {
                    importedChapters = importedChapters.map(c => ({ ...c, folderId: sourceFolder.id }));
                }

                chapterManager.loadChapters(importedChapters);
                const successMsg = `تم استيراد ${importedChapters.length} فصل بنجاح من ملف "${file.name}"${sourceFolder ? ' إلى مجلد المصدر' : ''}.`;
                translation.addNotification(successMsg, 'success');
                addLog(successMsg, 'SUCCESS');
            } else {
                const infoMsg = `لم يتم العثور على فصول قابلة للاستيراد في الملف "${file.name}".`;
                translation.addNotification(infoMsg, 'info');
                addLog(infoMsg, 'INFO');
            }
        } catch (err: any) {
            // If JSON parse failed, it might be a raw text file, try raw parsing
            if (err.message.includes('JSON')) {
                 try {
                    const content = await readTextFromFile(file!);
                    const importedChapters = parseChaptersFromText(content);
                    if (importedChapters.length > 0) {
                         // Determine Source Folder ID if exists
                        const sourceFolder = chapterManager.folders.find(f => f.name === 'المصدر');
                        const finalChapters = sourceFolder 
                            ? importedChapters.map(c => ({ ...c, folderId: sourceFolder.id }))
                            : importedChapters;

                        chapterManager.loadChapters(finalChapters);
                        const successMsg = `تم استيراد ${finalChapters.length} فصل بنجاح (وضع النص الخام) من ملف "${file!.name}".`;
                        translation.addNotification(successMsg, 'success');
                        addLog(successMsg, 'SUCCESS');
                        return;
                    }
                 } catch (rawErr) {}
            }

            const errorMsg = `فشل استيراد الملف: ${err.message}`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'ERROR');
        } finally {
            if (input) input.value = '';
        }
    };
    
    const handleChapterFileUpload = async (chapterId: string, file: File) => {
        addLog(`Uploading content for chapter ${chapterId} from file ${file.name}`);
        try {
            const { title, content } = await readChapterFile(file);
            chapterManager.updateChapter(chapterId, 'originalTitle', title);
            chapterManager.updateChapter(chapterId, 'originalContent', content);
            const successMsg = `تم استيراد محتوى "${file.name}" بنجاح.`;
            translation.addNotification(successMsg, 'success');
            addLog(successMsg, 'SUCCESS');
        } catch (error: any) {
            const errorMsg = `فشل استيراد الملف: ${error.message}`;
            translation.addNotification(errorMsg, 'error');
            addLog(errorMsg, 'ERROR');
        }
    };

    const value: AppContextType = {
        ...chapterManager,
        ...usageTracker,
        ...translation,
        ...terminology,
        ...codex, // Exposes books, activeBook, analyzeChapter, etc.
        systemPrompt,
        setSystemPrompt,
        extractionPrompt,
        setExtractionPrompt,
        uploadedFileName,
        setUploadedFileName,
        temperature,
        setTemperature,
        thinkingBudget,
        setThinkingBudget,
        currentTheme,
        setTheme,
        swapThemeColors,
        apiKeys,
        cerebrasApiKeys,
        gptOssConfig,
        googleDrive,
        activeChapter,
        isLimitReached,
        hasApiKeysForModel,
        handleStartTranslation,
        handleRetry,
        handleFileImport,
        handleChapterFileUpload,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
