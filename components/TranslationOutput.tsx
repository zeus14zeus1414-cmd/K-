

import React, { useState, useMemo } from 'react';
import { CopyIcon, BookOpenIcon, SuccessIcon, SpinnerIcon, TypeIcon, SearchIcon, CloseIcon, ArrowRightIcon, SparklesIcon } from './Icons';
import { copyTextToClipboard } from '../utils/clipboard';
import { useAppContext } from '../contexts/AppContext';

// Helper to escape regex special characters
const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

export const TranslationOutput: React.FC = () => {
    const { activeChapter: chapter, updateTranslatedText, terms, activeBook } = useAppContext();
    const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied'>('idle');
    const editableDivRef = React.useRef<HTMLDivElement>(null);
    
    // Productivity States
    const [fontSize, setFontSize] = useState(16);
    const [lineHeight, setLineHeight] = useState(2);
    const [showTypography, setShowTypography] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');

    // Counters
     const counts = useMemo(() => {
        if (!chapter?.translatedText) return { words: 0, chars: 0 };
        const text = chapter.translatedText;
        return {
            chars: text.length,
            words: text.trim() ? text.trim().split(/\s+/).length : 0
        };
    }, [chapter?.translatedText]);


    React.useEffect(() => {
        if (editableDivRef.current && chapter?.translatedText !== editableDivRef.current.innerText) {
            editableDivRef.current.innerText = chapter?.translatedText || '';
        }
    }, [chapter?.translatedText]);

    const handleCopy = async () => {
        if (chapter?.translatedText) {
            const success = await copyTextToClipboard(chapter.translatedText);
            if (success) {
                setCopyStatus('copied');
                setTimeout(() => setCopyStatus('idle'), 2000);
            }
        }
    };
    
    const handleReplace = () => {
        if (!chapter?.translatedText || !findText) return;
        
        try {
            const regex = new RegExp(escapeRegExp(findText), 'g');
            const newText = chapter.translatedText.replace(regex, replaceText);
            updateTranslatedText(chapter.id, newText);
        } catch (e) {
            console.error("Invalid Regex or replace error", e);
        }
    };

    // --- SMART SEARCH LOGIC ---
    
    // 1. Calculate Match Count
    const matchCount = useMemo(() => {
        if (!findText || !chapter?.translatedText) return 0;
        try {
            const regex = new RegExp(escapeRegExp(findText), 'gi');
            return (chapter.translatedText.match(regex) || []).length;
        } catch { return 0; }
    }, [findText, chapter?.translatedText]);

    // 2. Generate Suggestions from Codex & Glossary
    const suggestions = useMemo(() => {
        if (!findText || findText.length < 2) return [];
        
        const textToFind = findText.toLowerCase();
        const results: string[] = [];

        // Helper to check and add
        const addIfMatch = (original: string, translation: string) => {
            if (original.toLowerCase().includes(textToFind) || translation.includes(textToFind)) {
                if (translation !== findText && !results.includes(translation)) {
                    results.push(translation);
                }
            }
        };

        // Check Glossary
        terms.forEach(term => addIfMatch(term.original, term.translation));

        // Check Active Codex Book
        if (activeBook) {
            activeBook.entries.forEach(entry => addIfMatch(entry.name, entry.translation));
        }

        return results.slice(0, 3); // Limit to top 3 suggestions
    }, [findText, terms, activeBook]);


    if (!chapter) return null;

    return (
        <div className="flex flex-col h-full w-full relative group">
             {/* Toolbar Header */}
             <div className="flex-shrink-0 h-12 border-b border-white/5 flex items-center justify-between px-3 md:px-4 bg-dark-bg/50 backdrop-blur-sm relative z-20">
                <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-green-400/80 uppercase tracking-wider bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded shadow-sm">Target</span>
                     <span className="text-xs font-semibold text-dark-text/50 hidden sm:inline">Arabic Translation</span>
                </div>

                <div className="flex items-center gap-2">
                     {/* Counters */}
                     <div className="hidden sm:flex items-center gap-3 mr-2 px-2 py-1 bg-white/5 rounded border border-white/5 text-[10px] font-mono text-dark-text/50 select-none">
                        <span>{counts.words.toLocaleString()} words</span>
                        <span className="w-px h-3 bg-white/10"></span>
                        <span>{counts.chars.toLocaleString()} chars</span>
                    </div>

                    {/* Search Toggle */}
                    <button 
                        onClick={() => { setShowSearch(!showSearch); setShowTypography(false); }}
                        className={`p-1.5 rounded transition-colors ${showSearch ? 'text-primary bg-primary/10' : 'text-dark-text/50 hover:bg-white/10'}`}
                        title="بحث واستبدال"
                    >
                        <SearchIcon className="h-4 w-4" />
                    </button>

                    {/* Typography Toggle */}
                     <button 
                        onClick={() => { setShowTypography(!showTypography); setShowSearch(false); }}
                        className={`p-1.5 rounded transition-colors ${showTypography ? 'text-primary bg-primary/10' : 'text-dark-text/50 hover:bg-white/10'}`}
                        title="تنسيق النص"
                    >
                        <TypeIcon className="h-4 w-4" />
                    </button>
                    
                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    {chapter.status === 'completed' && (
                        <button
                            onClick={handleCopy}
                            className={`
                                flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide border
                                ${copyStatus === 'copied' 
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                                    : 'bg-white/5 border-white/10 text-dark-text/60 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                }
                            `}
                        >
                            {copyStatus === 'idle' ? <CopyIcon className="h-3 w-3" /> : <SuccessIcon className="h-3 w-3" />}
                            <span>{copyStatus === 'idle' ? 'Copy' : 'Copied'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Find & Replace Toolbar (Overlay) */}
            {showSearch && (
                <div className="absolute top-12 left-0 right-0 bg-dark-card border-b border-white/10 p-3 flex flex-col gap-3 z-30 shadow-2xl animate-fade-in-down backdrop-blur-xl bg-opacity-95">
                     
                     <div className="flex flex-col sm:flex-row gap-2">
                        {/* Find Input */}
                        <div className="relative flex-1 group">
                            <input 
                                type="text" 
                                value={findText} 
                                onChange={e => setFindText(e.target.value)}
                                placeholder="بحث عن..." 
                                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none pl-3 pr-20 transition-all focus:ring-1 focus:ring-primary/50"
                            />
                            {matchCount > 0 && (
                                <div className="absolute top-2 right-2 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {matchCount} matches
                                </div>
                            )}
                        </div>

                        <div className="text-dark-text/50 self-center hidden sm:block"><ArrowRightIcon className="h-3 w-3 rtl:rotate-180" /></div>
                        
                        {/* Replace Input */}
                        <div className="flex-1 flex gap-2">
                            <input 
                                type="text" 
                                value={replaceText} 
                                onChange={e => setReplaceText(e.target.value)}
                                placeholder="استبدال بـ..." 
                                className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all focus:ring-1 focus:ring-primary/50"
                            />
                            <button 
                                onClick={handleReplace}
                                disabled={!findText || matchCount === 0}
                                className="px-4 py-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex-shrink-0 shadow-lg shadow-primary/20 active:scale-95"
                            >
                                استبدال
                            </button>
                            <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-white/10 rounded-lg text-dark-text/50 flex-shrink-0"><CloseIcon className="h-4 w-4" /></button>
                        </div>
                     </div>

                     {/* Smart Suggestions */}
                     {suggestions.length > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in-right">
                            <SparklesIcon className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-[10px] text-dark-text/50 font-bold uppercase tracking-wide">اقتراحات:</span>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {suggestions.map((sug, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setReplaceText(sug)}
                                        className="text-xs bg-white/5 hover:bg-primary/20 hover:text-primary text-dark-text/80 px-2 py-1 rounded border border-white/5 transition-colors whitespace-nowrap"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
            )}

             {/* Typography Toolbar (Overlay) */}
             {showTypography && (
                <div className="absolute top-12 right-0 w-64 bg-dark-card border border-white/10 rounded-bl-xl p-4 z-30 shadow-2xl animate-fade-in-down backdrop-blur-xl bg-opacity-95">
                     <div className="mb-4">
                        <div className="flex justify-between text-xs text-dark-text/70 mb-1">
                            <span>حجم الخط</span>
                            <span>{fontSize}px</span>
                        </div>
                        <input 
                            type="range" min="12" max="24" step="1" 
                            value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                     </div>
                     <div>
                        <div className="flex justify-between text-xs text-dark-text/70 mb-1">
                            <span>ارتفاع السطر</span>
                            <span>{lineHeight}</span>
                        </div>
                         <input 
                            type="range" min="1.2" max="3.0" step="0.1" 
                            value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))}
                            className="w-full h-1.5 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                     </div>
                </div>
            )}


            {/* Content Area */}
            <div className="flex-grow relative w-full h-full overflow-hidden">
                {/* Empty State */}
                {chapter.status === 'idle' && !chapter.translatedText && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-20 select-none pointer-events-none">
                        <BookOpenIcon className="h-16 w-16 mb-4" />
                        <p className="text-sm font-bold tracking-widest uppercase">Target Empty</p>
                    </div>
                )}

                {/* Loading State */}
                {chapter.status === 'translating' && !chapter.translatedText && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none z-10">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full animate-pulse"></div>
                            <SpinnerIcon className="h-10 w-10 text-primary relative z-10 animate-spin" />
                        </div>
                        <p className="text-xs text-primary font-mono tracking-[0.3em] animate-pulse font-bold">DECODING ABYSS...</p>
                    </div>
                )}

                {/* Editor */}
                <div
                    ref={editableDivRef}
                    contentEditable={chapter.status !== 'translating'}
                    suppressContentEditableWarning
                    onBlur={(e) => updateTranslatedText(chapter.id, e.currentTarget.innerText)}
                    className={`
                        w-full h-full outline-none p-4 md:p-6 overflow-y-auto scrollbar-thin
                        text-justify text-white/90 font-medium
                        transition-all duration-500
                        ${chapter.status === 'translating' ? 'opacity-50 blur-sm grayscale' : 'opacity-100'}
                    `}
                    dir="rtl"
                    style={{ 
                        fontFamily: 'Tajawal, sans-serif',
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight
                    }}
                ></div>
            </div>
            <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-right {
                    animation: fade-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};
