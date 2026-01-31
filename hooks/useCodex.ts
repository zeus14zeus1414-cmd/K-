
import { useCallback, useState, useEffect } from 'react';
import { CodexEntry, CodexCategory, Chapter, ModelName, CodexBook } from '../types';
import { usePersistedState } from './usePersistedState';
import { translateChapterStream as translateWithGemini } from '../services/geminiService';
import { DEFAULT_EXTRACTION_PROMPT } from '../constants';

export const useCodex = () => {
    const [books, setBooks] = usePersistedState<CodexBook[]>('codexBooks', []);
    const [activeBookId, setActiveBookId] = usePersistedState<string>('activeCodexBookId', '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initialize default book if none exist
    useEffect(() => {
        if (books.length === 0) {
            const defaultBook: CodexBook = {
                id: crypto.randomUUID(),
                name: 'الرواية الافتراضية',
                entries: []
            };
            setBooks([defaultBook]);
            setActiveBookId(defaultBook.id);
        } else if (!activeBookId || !books.find(b => b.id === activeBookId)) {
            setActiveBookId(books[0].id);
        }
    }, [books.length, activeBookId, setBooks, setActiveBookId, books]);

    const activeBook = books.find(b => b.id === activeBookId) || books[0];

    const createBook = useCallback((name: string) => {
        const newBook: CodexBook = {
            id: crypto.randomUUID(),
            name,
            entries: []
        };
        setBooks(prev => [...prev, newBook]);
        setActiveBookId(newBook.id);
    }, [setBooks, setActiveBookId]);

    const deleteBook = useCallback((id: string) => {
        if (books.length <= 1) {
            alert("لا يمكن حذف الكتاب الوحيد المتبقي.");
            return;
        }
        if (confirm("هل أنت متأكد من حذف هذا الكتاب وكافة محتوياته؟")) {
            setBooks(prev => prev.filter(b => b.id !== id));
            if (activeBookId === id) {
                setActiveBookId(books.find(b => b.id !== id)?.id || '');
            }
        }
    }, [books, activeBookId, setBooks, setActiveBookId]);

    const renameBook = useCallback((id: string, newName: string) => {
        setBooks(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
    }, [setBooks]);

    const addEntry = useCallback((category: CodexCategory, name: string, translation: string, description: string) => {
        if (!name.trim() || !activeBookId) return;
        
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;

            const existingIndex = book.entries.findIndex(e => e.name.toLowerCase() === name.trim().toLowerCase());
            if (existingIndex >= 0) {
                // Update existing
                const updatedEntries = [...book.entries];
                updatedEntries[existingIndex] = {
                    ...updatedEntries[existingIndex],
                    category,
                    translation,
                    description,
                    lastUpdated: new Date().toISOString()
                };
                return { ...book, entries: updatedEntries };
            }
            // Add new
            return {
                ...book,
                entries: [...book.entries, {
                    id: crypto.randomUUID(),
                    category,
                    name: name.trim(),
                    translation: translation.trim(),
                    description: description.trim(),
                    lastUpdated: new Date().toISOString()
                }]
            };
        }));
    }, [setBooks, activeBookId]);

    const removeEntry = useCallback((entryId: string) => {
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;
            return { ...book, entries: book.entries.filter(e => e.id !== entryId) };
        }));
    }, [setBooks, activeBookId]);

    // Smart Analysis Logic (Post-Translation)
    const analyzeChapter = useCallback(async (chapter: Chapter, modelName: ModelName, customPrompt?: string) => {
        if (!chapter.originalContent || !chapter.translatedText) {
            alert("يجب أن يحتوي الفصل على نص أصلي وترجمة للقيام بالتحليل.");
            return;
        }
        setIsAnalyzing(true);

        const currentEntries = activeBook?.entries || [];
        const existingNames = currentEntries.map(e => e.name.toLowerCase());

        // Use custom prompt or default, and inject variables
        const basePrompt = customPrompt || DEFAULT_EXTRACTION_PROMPT;
        const prompt = basePrompt
            .replace('{{ENGLISH_TEXT}}', chapter.originalContent.substring(0, 6000))
            .replace('{{ARABIC_TEXT}}', chapter.translatedText.substring(0, 6000));

        // Add filter for duplicates to the prompt dynamically if not already handled by user prompt
        const finalPrompt = prompt + `\n\nIMPORTANT: Exclude these already known names from output: ${JSON.stringify(existingNames)}.`;

        try {
            let extractedText = "";
            const onChunk = (chunk: string) => { extractedText += chunk; };
            const onKeySwitch = () => {}; 

            await translateWithGemini(
                "CODEX_ANALYSIS", 
                "", 
                modelName, 
                finalPrompt, 
                0.1, 
                0, 
                onChunk,
                onKeySwitch
            );

            // Clean up markdown
            const jsonString = extractedText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            try {
                const parsed = JSON.parse(jsonString);
                let addedCount = 0;

                if (Array.isArray(parsed)) {
                    parsed.forEach((item: any) => {
                        // Double check existence to be safe
                        if (item.name && item.translation && !existingNames.includes(item.name.toLowerCase())) {
                            // Filter out garbage/common words that might slip through
                            if (item.name.length < 2 || item.translation.length < 2) return;
                            
                            addEntry(
                                (item.category as CodexCategory) || 'other', 
                                item.name, 
                                item.translation, 
                                item.description || ''
                            );
                            addedCount++;
                        }
                    });
                    alert(`تم الانتهاء من التحليل. تمت إضافة ${addedCount} مصطلح جديد.`);
                }
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                console.log("Raw Output:", extractedText);
                alert("فشل في معالجة استجابة الذكاء الاصطناعي. تأكد من أن النموذج يدعم JSON.");
            }

        } catch (e) {
            console.error("Codex Analysis Failed:", e);
            alert("فشلت عملية التحليل.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [addEntry, activeBook]);

    return { 
        books, 
        activeBook, 
        activeBookId,
        setActiveBookId, 
        createBook, 
        deleteBook, 
        renameBook, 
        addEntry, 
        removeEntry, 
        analyzeChapter, 
        isAnalyzing 
    };
};
