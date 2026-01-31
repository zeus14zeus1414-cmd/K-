
import React, { useState } from 'react';
import { CodexEntry, CodexCategory, Chapter, ModelName, CodexBook } from '../types';
import { BookIcon, TrashIcon, PlusIcon, BrainIcon, SpinnerIcon, FileIcon, ArrowRightIcon } from './Icons';

interface CodexManagerProps {
    entries: CodexEntry[];
    books: CodexBook[];
    activeBookId: string;
    onSetActiveBook: (id: string) => void;
    onCreateBook: (name: string) => void;
    onDeleteBook: (id: string) => void;
    
    onAddEntry: (category: CodexCategory, name: string, translation: string, description: string) => void;
    onRemoveEntry: (id: string) => void;
    onExtract: (chapter: Chapter, model: ModelName) => void;
    
    activeChapter: Chapter | null;
    selectedModel: ModelName;
    isExtracting: boolean;
}

const categories: { id: CodexCategory; label: string; color: string }[] = [
    { id: 'character', label: 'شخصيات', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    { id: 'location', label: 'أماكن', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    { id: 'item', label: 'عناصر', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    { id: 'rank', label: 'رتب', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
    { id: 'other', label: 'أخرى', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
];

export const CodexManager: React.FC<CodexManagerProps> = ({ 
    entries, books, activeBookId, onSetActiveBook, onCreateBook, onDeleteBook,
    onAddEntry, onRemoveEntry, onExtract, activeChapter, selectedModel, isExtracting 
}) => {
    const [activeCategory, setActiveCategory] = useState<CodexCategory>('character');
    const [newName, setNewName] = useState('');
    const [newTrans, setNewTrans] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isCreatingBook, setIsCreatingBook] = useState(false);
    const [newBookName, setNewBookName] = useState('');

    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName && newTrans) {
            onAddEntry(activeCategory, newName, newTrans, newDesc);
            setNewName('');
            setNewTrans('');
            setNewDesc('');
        }
    };

    const handleCreateBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBookName.trim()) {
            onCreateBook(newBookName);
            setNewBookName('');
            setIsCreatingBook(false);
        }
    }

    const filteredEntries = entries.filter(e => e.category === activeCategory);

    return (
        <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
            
            {/* Sidebar: Books List */}
            <div className="w-full md:w-64 flex-shrink-0 bg-dark-bg/50 rounded-xl border border-dark-border flex flex-col overflow-hidden max-h-[200px] md:max-h-full">
                <div className="p-3 border-b border-dark-border bg-dark-bg flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-sm">مكتبة الروايات</h3>
                    <button onClick={() => setIsCreatingBook(true)} className="p-1 hover:bg-white/10 rounded text-primary" title="رواية جديدة">
                        <PlusIcon className="h-4 w-4" />
                    </button>
                </div>
                
                {isCreatingBook && (
                    <form onSubmit={handleCreateBook} className="p-2 border-b border-dark-border bg-dark-card animate-fade-in-down">
                        <input 
                            autoFocus
                            type="text" 
                            value={newBookName}
                            onChange={e => setNewBookName(e.target.value)}
                            placeholder="اسم الرواية..."
                            className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs mb-2 text-white"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-primary text-white text-xs py-1 rounded">حفظ</button>
                            <button type="button" onClick={() => setIsCreatingBook(false)} className="flex-1 bg-white/10 text-white text-xs py-1 rounded">إلغاء</button>
                        </div>
                    </form>
                )}

                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    {books.map(book => (
                        <div 
                            key={book.id}
                            onClick={() => onSetActiveBook(book.id)}
                            className={`
                                group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all
                                ${activeBookId === book.id ? 'bg-primary/20 border border-primary/50 text-white shadow-sm' : 'hover:bg-white/5 text-dark-text/70 border border-transparent'}
                            `}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <BookIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{book.name}</span>
                            </div>
                            {books.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col min-w-0 bg-dark-bg/30 rounded-xl border border-dark-border overflow-hidden relative">
                
                {/* 1. Header & Controls (Sticky Top) */}
                <div className="flex-shrink-0 bg-dark-bg/80 backdrop-blur-md z-20 border-b border-dark-border">
                    <div className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-primary truncate">
                                {books.find(b => b.id === activeBookId)?.name}
                            </h2>
                            <p className="text-[10px] text-dark-text/50 truncate">
                                {entries.length} مصطلح مسجل
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => activeChapter && onExtract(activeChapter, selectedModel)}
                            disabled={!activeChapter || isExtracting || !activeChapter.translatedText}
                            className={`
                                flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all
                                ${isExtracting 
                                    ? 'bg-primary/20 text-primary cursor-wait' 
                                    : (!activeChapter || !activeChapter.translatedText)
                                        ? 'bg-white/5 text-dark-text/30 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/20 hover:scale-105'
                                }
                            `}
                        >
                            {isExtracting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <BrainIcon className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isExtracting ? 'جاري التحليل...' : 'استخراج ذكي'}</span>
                        </button>
                    </div>

                    {/* Compact Category Tabs */}
                    <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`
                                    px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border
                                    ${activeCategory === cat.id 
                                        ? `${cat.color} shadow-sm`
                                        : 'bg-dark-card border-dark-border text-dark-text/50 hover:bg-white/5'
                                    }
                                `}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Compact Input Form (Sticky below Header) */}
                <div className="flex-shrink-0 p-3 bg-dark-card/50 border-b border-dark-border z-10">
                    <form onSubmit={handleAddEntry} className="grid grid-cols-12 gap-2">
                        {/* Row 1: Name & Translation (Side by Side on Mobile) */}
                        <div className="col-span-6 md:col-span-4">
                            <input 
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="الاسم (English)"
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder:text-white/20"
                                dir="ltr"
                            />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <input 
                                type="text" 
                                value={newTrans}
                                onChange={e => setNewTrans(e.target.value)}
                                placeholder="الترجمة (عربي)"
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder:text-white/20"
                                dir="rtl"
                            />
                        </div>

                        {/* Row 2: Description & Button */}
                        <div className="col-span-10 md:col-span-3">
                            <input 
                                type="text" 
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="ملاحظة / سياق (اختياري)"
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-dark-text placeholder:text-white/20"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <button 
                                type="submit" 
                                disabled={!newName || !newTrans}
                                className="w-full h-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95"
                            >
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* 3. Scrollable List */}
                <div className="flex-grow overflow-y-auto p-2 space-y-2 scrollbar-thin">
                    {filteredEntries.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-dark-text/30 py-10 opacity-60">
                            <BookIcon className="h-10 w-10 mb-2" />
                            <p className="text-xs">لا توجد مصطلحات هنا.</p>
                        </div>
                    ) : (
                        filteredEntries.map(entry => (
                            <div key={entry.id} className="group flex items-start justify-between p-3 bg-dark-card/40 rounded-lg border border-white/5 hover:border-primary/30 transition-all hover:bg-dark-card">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 w-full min-w-0">
                                    <div className="font-bold text-white text-xs sm:text-sm truncate select-all" dir="ltr">{entry.name}</div>
                                    <div className="hidden sm:block text-dark-text/20">→</div>
                                    <div className="font-bold text-primary text-xs sm:text-sm truncate select-all">{entry.translation}</div>
                                    {entry.description && (
                                         <div className="text-[10px] sm:text-xs text-dark-text/40 sm:border-r sm:border-white/10 sm:pr-2 sm:mr-2 truncate flex-1">{entry.description}</div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => onRemoveEntry(entry.id)}
                                    className="text-dark-text/20 hover:text-red-400 transition-colors p-1.5 -mr-1"
                                >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
