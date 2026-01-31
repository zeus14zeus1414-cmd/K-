
import React, { useState } from 'react';
import { Chapter } from '../types';
import { 
    PlusIcon, TrashIcon, ImportIcon, ArchiveIcon, SpinnerIcon, 
    SuccessIcon, ErrorIcon, FileIcon, SearchIcon, FolderIcon, 
    FolderOpenIcon, ChevronRightIcon, ChevronDownIcon, CheckCircleIcon 
} from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface ChapterListProps {
    onImportChapters: () => void;
}

const StatusDot = ({ status }: { status: Chapter['status'] }) => {
    switch (status) {
        case 'translating':
            return <SpinnerIcon className="h-3 w-3 text-primary animate-spin" />;
        case 'completed':
            return <SuccessIcon className="h-3 w-3 text-green-400" />;
        case 'failed':
            return <ErrorIcon className="h-3 w-3 text-red-400" />;
        default:
            return <div className="h-1.5 w-1.5 rounded-full bg-white/10" />;
    }
};

export const ChapterList: React.FC<ChapterListProps> = ({ onImportChapters }) => {
    const {
        chapters,
        folders,
        activeTabIndex,
        setActiveTabIndex,
        addNewChapter,
        clearAllChapters,
        removeChapter,
        archiveChapter,
        // Folder actions
        createFolder,
        deleteFolder,
        toggleFolder,
        moveChaptersToFolder,
    } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // --- SMART STATUS LOGIC ---
    const sourceFolder = folders.find(f => f.name === 'المصدر');
    const translatedFolder = folders.find(f => f.name === 'المترجمة');

    const getSmartStatus = (chapter: Chapter & { originalIndex: number }): Chapter['status'] => {
        // Strict Logic for "Source" Folder
        if (sourceFolder && chapter.folderId === sourceFolder.id) {
            if (translatedFolder) {
                // Check if a counterpart exists in the Translated folder with the same title
                const hasTranslation = chapters.some(c => 
                    c.folderId === translatedFolder.id && 
                    c.originalTitle === chapter.originalTitle
                );
                // If it exists in translated folder, mark source as completed visually
                return hasTranslation ? 'completed' : 'idle';
            }
            return 'idle';
        }
        
        // Default behavior for Translated folder and others
        return chapter.status;
    };

    // --- Helper Functions ---
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedChapters);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedChapters(newSet);
    };

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            createFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreatingFolder(false);
        }
    };

    const handleMoveSelected = (folderId: string | undefined) => {
        if (selectedChapters.size === 0) return;
        moveChaptersToFolder(Array.from(selectedChapters), folderId);
        setSelectedChapters(new Set());
        setSelectionMode(false);
    };

    // --- Filtering & Sorting ---
    // We map chapters to include their original index in the main 'chapters' array 
    // because that's what activeTabIndex relies on.
    const mappedChapters = chapters.map((c, idx) => ({ ...c, originalIndex: idx }));
    
    // Filter by search
    const filteredChapters = mappedChapters.filter(chapter => 
        chapter.originalTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grouping
    const grouped = {
        folders: folders.map(folder => ({
            ...folder,
            items: filteredChapters.filter(c => c.folderId === folder.id)
        })),
        root: filteredChapters.filter(c => !c.folderId)
    };

    return (
        <div className="flex flex-col h-full bg-dark-bg/30">
            {/* Toolbar */}
            <div className="flex-shrink-0 p-3 border-b border-white/5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addNewChapter(undefined)} className="py-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary/50 text-dark-text/70 hover:text-primary transition-all flex items-center justify-center shadow-sm active:scale-95 text-xs font-bold" title="فصل جديد">
                        <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                        <span>فصل</span>
                    </button>
                    <button onClick={() => setIsCreatingFolder(true)} className="py-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary/50 text-dark-text/70 hover:text-primary transition-all flex items-center justify-center shadow-sm active:scale-95 text-xs font-bold" title="مجلد جديد">
                        <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                        <span>مجلد</span>
                    </button>
                    <button onClick={onImportChapters} className="py-2 rounded-lg bg-dark-card border border-dark-border hover:border-white/20 text-dark-text/70 hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-95 text-xs font-bold" title="استيراد">
                        <ImportIcon className="h-3.5 w-3.5 mr-1.5" />
                        <span>استيراد</span>
                    </button>
                    <button onClick={() => setSelectionMode(!selectionMode)} className={`py-2 rounded-lg border transition-all flex items-center justify-center shadow-sm active:scale-95 text-xs font-bold ${selectionMode ? 'bg-primary border-primary text-white' : 'bg-dark-card border-dark-border text-dark-text/70 hover:text-white'}`} title="تحديد">
                        <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                        <span>تحديد</span>
                    </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative group">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-text/30 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث في الفصول..." 
                        className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 pr-9 pl-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-dark-text/20"
                    />
                </div>

                {/* New Folder Input */}
                {isCreatingFolder && (
                    <form onSubmit={handleCreateFolder} className="flex gap-2 animate-fade-in-down">
                        <input 
                            autoFocus
                            type="text" 
                            value={newFolderName} 
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="اسم المجلد..."
                            className="flex-1 bg-dark-bg border border-primary/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none min-w-0"
                        />
                        <button type="submit" className="px-2 bg-primary text-white rounded-lg text-xs flex-shrink-0">OK</button>
                        <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-2 bg-white/10 text-white rounded-lg text-xs flex-shrink-0">X</button>
                    </form>
                )}

                 {/* Selection Actions */}
                 {selectionMode && selectedChapters.size > 0 && (
                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in-down">
                        <div className="text-[10px] text-primary font-bold mb-2 flex justify-between">
                            <span>تم تحديد {selectedChapters.size}</span>
                            <button onClick={() => setSelectedChapters(new Set())} className="hover:underline">إلغاء</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {/* Move to Root */}
                            <button onClick={() => handleMoveSelected(undefined)} className="p-1 bg-dark-bg hover:bg-white/10 rounded text-[10px] text-dark-text/80 truncate border border-white/5">
                                إلى الرئيسية
                            </button>
                             {/* Move to specific folder */}
                             {folders.map(f => (
                                <button key={f.id} onClick={() => handleMoveSelected(f.id)} className="p-1 bg-dark-bg hover:bg-white/10 rounded text-[10px] text-dark-text/80 truncate border border-white/5">
                                    إلى {f.name}
                                </button>
                             ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List Content */}
            <div className="flex-grow overflow-y-auto min-h-0 p-2 space-y-2 scrollbar-thin pb-20">
                
                {/* 1. Folders Section */}
                {grouped.folders.map(folder => (
                    <div key={folder.id} className="rounded-xl overflow-hidden border border-white/5 bg-black/20">
                        {/* Folder Header */}
                        <div 
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors group"
                            onClick={() => toggleFolder(folder.id)}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                {folder.isOpen ? <ChevronDownIcon className="h-3 w-3 flex-shrink-0 text-dark-text/50" /> : <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-dark-text/50 rtl:rotate-180" />}
                                {folder.isOpen ? <FolderOpenIcon className="h-4 w-4 flex-shrink-0 text-primary" /> : <FolderIcon className="h-4 w-4 flex-shrink-0 text-primary/70" />}
                                <span className="text-xs font-bold text-dark-text/80 truncate group-hover:text-white flex-1">{folder.name}</span>
                                <span className="text-[9px] text-dark-text/30 bg-white/5 px-1.5 rounded-full flex-shrink-0">{folder.items.length}</span>
                            </div>
                            
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); addNewChapter(folder.id); }}
                                    className="p-1 hover:bg-primary hover:text-white text-dark-text/50 rounded" 
                                    title="إضافة فصل هنا"
                                >
                                    <PlusIcon className="h-3 w-3" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                    className="p-1 hover:bg-red-500 hover:text-white text-dark-text/50 rounded"
                                    title="حذف المجلد"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Folder Content (Accordion) */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${folder.isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="pl-3 pr-1 pb-1 space-y-1 border-r-2 border-white/5 mr-3 my-1">
                                {folder.items.map(chapter => (
                                    <ChapterItem 
                                        key={chapter.id}
                                        chapter={chapter}
                                        displayStatus={getSmartStatus(chapter)}
                                        isActive={activeTabIndex === chapter.originalIndex}
                                        isSelected={selectedChapters.has(chapter.id)}
                                        selectionMode={selectionMode}
                                        onSelect={() => toggleSelection(chapter.id)}
                                        onClick={() => setActiveTabIndex(chapter.originalIndex)}
                                        onArchive={() => archiveChapter(chapter.id)}
                                        onDelete={() => removeChapter(chapter.id)}
                                    />
                                ))}
                                {folder.items.length === 0 && (
                                    <div className="text-[10px] text-dark-text/20 p-2 text-center italic">فارغ</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* 2. Root Chapters (Uncategorized) */}
                {grouped.root.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                        {grouped.root.map(chapter => (
                             <ChapterItem 
                                key={chapter.id}
                                chapter={chapter}
                                displayStatus={chapter.status} // Uncategorized uses normal status
                                isActive={activeTabIndex === chapter.originalIndex}
                                isSelected={selectedChapters.has(chapter.id)}
                                selectionMode={selectionMode}
                                onSelect={() => toggleSelection(chapter.id)}
                                onClick={() => setActiveTabIndex(chapter.originalIndex)}
                                onArchive={() => archiveChapter(chapter.id)}
                                onDelete={() => removeChapter(chapter.id)}
                            />
                        ))}
                    </div>
                )}

                 {/* Empty State */}
                 {chapters.length === 0 && (
                    <div className="text-center text-dark-text/20 py-8 text-xs">لا توجد فصول</div>
                )}

            </div>
            <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

// Sub-component for individual chapter rows to keep main component clean
const ChapterItem: React.FC<{
    chapter: Chapter & { originalIndex: number };
    displayStatus: Chapter['status']; // Use displayStatus for visual logic
    isActive: boolean;
    isSelected: boolean;
    selectionMode: boolean;
    onSelect: () => void;
    onClick: () => void;
    onArchive: () => void;
    onDelete: () => void;
}> = ({ chapter, displayStatus, isActive, isSelected, selectionMode, onSelect, onClick, onArchive, onDelete }) => {
    return (
        <div
            onClick={selectionMode ? onSelect : onClick}
            className={`
                group relative p-2 rounded-lg cursor-pointer transition-all duration-200 border select-none
                flex items-center gap-2 shadow-sm min-h-[44px]
                ${isActive 
                    ? 'bg-gradient-to-r from-primary/10 to-transparent border-primary/30 shadow-[0_0_10px_rgba(var(--color-primary),0.05)]' 
                    : isSelected 
                        ? 'bg-primary/20 border-primary/50'
                        : 'bg-dark-card/40 border-white/5 hover:bg-white/5 hover:border-white/10'
                }
            `}
        >
            {/* Icon / Checkbox */}
            <div className={`
                flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-all duration-300
                ${isActive ? 'bg-primary text-white scale-105' : 'bg-white/5 text-dark-text/40 group-hover:bg-white/10'}
                ${isSelected ? 'bg-primary text-white' : ''}
            `}>
                {selectionMode ? (
                    isSelected ? <CheckCircleIcon className="h-4 w-4" /> : <div className="h-3 w-3 rounded-full border border-dark-text/30" />
                ) : (
                    <FileIcon className="h-3.5 w-3.5" />
                )}
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0 overflow-hidden pr-2">
                <div className="flex items-center">
                    <h3 className={`text-[11px] sm:text-xs font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-dark-text/80 group-hover:text-white'}`}>
                        {chapter.originalTitle}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                     {displayStatus !== 'idle' && <StatusDot status={displayStatus} />}
                     <p className="text-[9px] text-dark-text/40 truncate font-mono">
                        {displayStatus === 'completed' ? 'Translated' : displayStatus === 'failed' ? 'Failed' : 'Ready'}
                    </p>
                </div>
            </div>

            {/* Actions (Only show if not selecting) */}
            {!selectionMode && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1 bg-dark-bg/80 backdrop-blur-sm rounded-lg">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onArchive(); }} 
                        disabled={displayStatus !== 'completed'}
                        className={`p-1.5 rounded hover:bg-white/10 ${displayStatus === 'completed' ? 'text-green-400' : 'text-dark-text/20 cursor-not-allowed'}`}
                        title="أرشفة"
                    >
                        <ArchiveIcon className="h-3 w-3" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                        title="حذف"
                    >
                        <TrashIcon className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
};
