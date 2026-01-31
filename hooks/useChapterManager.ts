
// Fix: Import React to resolve 'Cannot find namespace React' error for types like React.Dispatch and React.SetStateAction.
import React, { useEffect, useCallback } from 'react';
import { Chapter, Folder } from '../types';
import { usePersistedState } from './usePersistedState';


export const useChapterManager = () => {
    const [chapters, setChapters] = usePersistedState<Chapter[]>('savedChapters', []);
    const [archivedChapters, setArchivedChapters] = usePersistedState<Chapter[]>('archivedChapters', []);
    const [activeTabIndex, setActiveTabIndex] = usePersistedState<number>('activeTabIndex', 0);
    const [folders, setFolders] = usePersistedState<Folder[]>('chapterFolders', []);

    // Initialize with one chapter if empty, and validate active tab
    useEffect(() => {
        if (chapters.length === 0) {
            setChapters([{
                id: crypto.randomUUID(),
                originalTitle: `Chapter 1`,
                originalContent: '',
                translatedText: null,
                status: 'idle',
            }]);
            setActiveTabIndex(0);
        } else {
             // Validate the active tab index in case chapters were deleted from another session/tab
             if (activeTabIndex >= chapters.length) {
                setActiveTabIndex(Math.max(0, chapters.length - 1));
             }
        }
    }, [chapters.length, activeTabIndex, setChapters, setActiveTabIndex]);

    // Initialize Default Folders (Source & Translated)
    useEffect(() => {
        setFolders(prev => {
            const hasSource = prev.some(f => f.name === 'المصدر');
            const hasTranslated = prev.some(f => f.name === 'المترجمة');
            
            let newFolders = [...prev];
            if (!hasSource) {
                newFolders.push({ id: crypto.randomUUID(), name: 'المصدر', isOpen: true });
            }
            if (!hasTranslated) {
                newFolders.push({ id: crypto.randomUUID(), name: 'المترجمة', isOpen: true });
            }
            
            // Only update if changes were made to avoid infinite loop
            if (newFolders.length !== prev.length) {
                return newFolders;
            }
            return prev;
        });
    }, [setFolders]);

    // --- CHAPTER OPERATIONS ---

    const addNewChapter = useCallback((folderId?: string) => {
        setChapters(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                folderId: folderId,
                originalTitle: `Chapter ${prev.length + 1}`,
                originalContent: '',
                translatedText: null,
                status: 'idle',
            }
        ]);
    }, [setChapters]);

    const updateChapter = useCallback((id: string, field: 'originalTitle' | 'originalContent', value: string) => {
        setChapters(prev =>
            prev.map(c => {
                if (c.id === id) {
                    const updatedChapter = { ...c, [field]: value };
                    if (field === 'originalContent') {
                        updatedChapter.status = 'idle';
                        updatedChapter.translatedText = null;
                    }
                    return updatedChapter;
                }
                return c;
            })
        );
    }, [setChapters]);

    const updateTranslatedText = useCallback((id: string, newText: string) => {
        setChapters(prev =>
            prev.map(c => {
                if (c.id === id) {
                    return { ...c, translatedText: newText };
                }
                return c;
            })
        );
    }, [setChapters]);

    const removeChapter = useCallback((id: string) => {
        if (chapters.length <= 1) return;
        
        setChapters(prev => {
            const newChapters = prev.filter(c => c.id !== id);
            if (activeTabIndex >= newChapters.length) {
                setActiveTabIndex(Math.max(0, newChapters.length - 1));
            }
            return newChapters;
        });
    }, [chapters.length, activeTabIndex, setChapters, setActiveTabIndex]);

    const clearAllChapters = useCallback((confirm = true) => {
        const doClear = !confirm || window.confirm('هل أنت متأكد من أنك تريد مسح جميع الفصول؟ سيتم الاحتفاظ بالفصل الأول فقط.');
        if (doClear) {
            // Force reset to index 0 first
            setActiveTabIndex(0);
            
            setChapters(prev => {
                // Completely regenerate the list to ensure UI updates cleanly
                // We keep the first chapter's data if it exists, but reset its status
                const firstChapter = prev[0];
                return [{
                    id: firstChapter ? firstChapter.id : crypto.randomUUID(),
                    originalTitle: firstChapter ? firstChapter.originalTitle : `Chapter 1`,
                    originalContent: firstChapter ? firstChapter.originalContent : '',
                    translatedText: null,
                    status: 'idle',
                }];
            });
        }
    }, [setChapters, setActiveTabIndex]);

    const loadChapters = useCallback((newChapters: Chapter[]) => {
        if (newChapters.length > 0) {
            setChapters(newChapters);
            setActiveTabIndex(0);
        } else {
            // If the file was empty or had no chapters, reset to a single blank chapter without confirmation
            clearAllChapters(false); 
        }
    }, [setChapters, clearAllChapters, setActiveTabIndex]);

    const archiveChapter = useCallback((id: string) => {
        const chapterToArchive = chapters.find(c => c.id === id);
        if (!chapterToArchive || chapterToArchive.status !== 'completed') {
            return;
        }

        // Add to archive first
        setArchivedChapters(prev => [...prev, chapterToArchive]);

        // Now handle removing from the main list
        if (chapters.length === 1) {
            // If it's the last chapter, replace it with a new one.
            const newChapter: Chapter = {
                id: crypto.randomUUID(),
                originalTitle: `Chapter 1`,
                originalContent: '',
                translatedText: null,
                status: 'idle',
            };
            setChapters([newChapter]);
            setActiveTabIndex(0);
        } else {
            // If there are other chapters, just remove it.
            removeChapter(id); // removeChapter already handles active tab logic
        }
    }, [chapters, removeChapter, setArchivedChapters, setChapters, setActiveTabIndex]);
    
    const clearArchive = useCallback(() => {
         if (window.confirm('هل أنت متأكد من أنك تريد مسح جميع الفصول المؤرشفة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            setArchivedChapters([]);
        }
    }, [setArchivedChapters]);

    // --- FOLDER OPERATIONS ---

    const createFolder = useCallback((name: string) => {
        const newFolder: Folder = {
            id: crypto.randomUUID(),
            name,
            isOpen: true
        };
        setFolders(prev => [...prev, newFolder]);
    }, [setFolders]);

    const deleteFolder = useCallback((id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا المجلد؟ سيتم نقل الفصول الموجودة بداخله إلى القائمة الرئيسية.')) {
            // Reset folderId for chapters inside
            setChapters(prev => prev.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
            setFolders(prev => prev.filter(f => f.id !== id));
        }
    }, [setFolders, setChapters]);

    const toggleFolder = useCallback((id: string) => {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f));
    }, [setFolders]);

    const renameFolder = useCallback((id: string, newName: string) => {
         setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    }, [setFolders]);

    const moveChaptersToFolder = useCallback((chapterIds: string[], folderId: string | undefined) => {
        setChapters(prev => prev.map(c => 
            chapterIds.includes(c.id) ? { ...c, folderId: folderId } : c
        ));
    }, [setChapters]);

    return {
        chapters,
        setChapters,
        archivedChapters,
        folders, // Expose Folders
        addNewChapter,
        updateChapter,
        updateTranslatedText,
        removeChapter,
        archiveChapter,
        clearAllChapters,
        clearArchive,
        loadChapters,
        activeTabIndex,
        setActiveTabIndex,
        // Folder Actions
        createFolder,
        deleteFolder,
        toggleFolder,
        renameFolder,
        moveChaptersToFolder
    };
};
