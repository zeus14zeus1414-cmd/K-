
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
    TranslateIcon, FileIcon, CopyIcon, BookOpenIcon, 
    SparklesIcon, BrainIcon, CloseIcon, UploadIcon,
    CheckCircleIcon
} from './Icons';
import { copyTextToClipboard } from '../utils/clipboard';

export const AdvancedTranslator: React.FC = () => {
    const { 
        chapters, 
        activeChapter, 
        setActiveTabIndex, 
        handleStartTranslation, 
        isLoading, 
        translationProgress, 
        updateChapter, 
        updateTranslatedText,
        selectedModel,
        setSelectedModel,
        apiKeys,
        activeBook,
        analyzeChapter,
        isAnalyzing,
        handleChapterFileUpload,
        extractionPrompt
    } = useAppContext();

    const [extractionStatus, setExtractionStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll output when text changes (streaming effect)
    useEffect(() => {
        if (isLoading && outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [activeChapter?.translatedText, isLoading]);

    const chapterList = chapters.map((c, idx) => ({ ...c, originalIndex: idx }));

    const handleCopy = async () => {
        if (activeChapter?.translatedText) {
            await copyTextToClipboard(activeChapter.translatedText);
            setExtractionStatus('تم النسخ!');
            setTimeout(() => setExtractionStatus(''), 2000);
        }
    };

    const handleExtractTerms = () => {
        if (!activeChapter) return;
        if (!activeChapter.translatedText) {
            alert('لا يوجد نص مترجم لاستخراج المصطلحات منه.');
            return;
        }
        analyzeChapter(activeChapter, selectedModel, extractionPrompt);
    };

    return (
        <div className="h-full w-full bg-[#050505] text-[#e4e4e7] font-sans overflow-y-auto scrollbar-thin relative custom-selection">
            <style>{`
                .custom-selection ::selection { background: rgba(212, 175, 55, 0.3); color: white; }
                .latin-text { font-family: 'Segoe UI', sans-serif; }
            `}</style>

            {/* Decorative Background Elements */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#d4af37]/5 to-transparent pointer-events-none z-0" />
            
            <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 pb-32 relative z-10">
                
                {/* Header Section */}
                <header className="text-center relative py-2 md:py-6">
                    <div className="inline-flex flex-col items-center">
                        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] via-[#fce274] to-[#b8860b] drop-shadow-[0_0_25px_rgba(212,175,55,0.3)] tracking-tight">
                            Advanced Zeus
                        </h1>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-2 opacity-50"></div>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    
                    {/* --- LEFT COLUMN: Input & Configuration --- */}
                    <div className="space-y-6 order-2 lg:order-1">
                        
                        {/* 1. Model Selector */}
                        <div className="bg-[#0a0a0a] rounded-2xl p-1.5 border border-[#d4af37]/20 shadow-lg shadow-black/50 flex gap-1 relative overflow-hidden backdrop-blur-sm">
                            {['Gemini', 'Cerebras', 'GPT-OSS'].map((provider) => {
                                const isSelected = selectedModel.toLowerCase().includes(provider.toLowerCase()) || (provider === 'GPT-OSS' && selectedModel.startsWith('gpt-oss'));
                                return (
                                    <button
                                        key={provider}
                                        onClick={() => {
                                            if (provider === 'Gemini') setSelectedModel('gemini-2.5-flash');
                                            if (provider === 'Cerebras') setSelectedModel('cerebras/llama-3.1-70b');
                                            if (provider === 'GPT-OSS') setSelectedModel('gpt-oss/custom');
                                        }}
                                        className={`
                                            flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 relative overflow-hidden group
                                            ${isSelected 
                                                ? 'text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                                                : 'text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[#d4af37]/5'
                                            }
                                        `}
                                    >
                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37] to-[#fce274]"></div>}
                                        <span className="relative z-10 flex items-center justify-center gap-2 latin-text tracking-wide">
                                            {provider}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 2. Chapter Controls */}
                        <div className="bg-[#0a0a0a]/80 rounded-3xl p-5 border border-[#d4af37]/10 space-y-4 shadow-xl">
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="relative flex-grow group">
                                    <select 
                                        value={activeChapter?.id || ''}
                                        onChange={(e) => {
                                            const idx = chapterList.find(c => c.id === e.target.value)?.originalIndex;
                                            if (idx !== undefined) setActiveTabIndex(idx);
                                        }}
                                        className="w-full bg-[#111] text-white border border-[#d4af37]/20 rounded-xl px-4 py-3.5 pl-10 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/50 transition-all appearance-none text-sm font-bold shadow-inner"
                                    >
                                        <option value="" disabled>اختر فصلاً للعمل عليه...</option>
                                        {chapterList.map(c => (
                                            <option key={c.id} value={c.id}>{c.originalTitle}</option>
                                        ))}
                                    </select>
                                    <BookOpenIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#d4af37] pointer-events-none" />
                                </div>
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-[#1a1a1a] hover:bg-[#252525] text-[#d4af37] border border-[#d4af37]/20 rounded-xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] whitespace-nowrap active:scale-95"
                                >
                                    <UploadIcon className="w-4 h-4" />
                                    <span>ملف</span>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={(e) => e.target.files?.[0] && activeChapter && handleChapterFileUpload(activeChapter.id, e.target.files[0])} />
                            </div>

                            <input 
                                type="text" 
                                value={activeChapter?.originalTitle || ''}
                                onChange={(e) => activeChapter && updateChapter(activeChapter.id, 'originalTitle', e.target.value)}
                                placeholder="عنوان الفصل (مثلاً: Chapter 1)"
                                className="w-full bg-[#111] border border-[#d4af37]/10 rounded-xl px-4 py-3 text-sm text-[#d4af37] font-mono focus:border-[#d4af37]/50 outline-none transition-all placeholder:text-[#d4af37]/20"
                            />
                        </div>

                        {/* 3. Source Text Input */}
                        <div className="relative group rounded-3xl overflow-hidden border border-[#d4af37]/10 bg-[#080808] shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-[#0a0a0a] border-b border-[#d4af37]/10 flex items-center px-4 justify-between">
                                <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest">Source Input</span>
                                <span className="text-[10px] text-zinc-600 font-mono">{activeChapter?.originalContent?.length || 0} chars</span>
                            </div>
                            <textarea 
                                value={activeChapter?.originalContent || ''}
                                onChange={(e) => activeChapter && updateChapter(activeChapter.id, 'originalContent', e.target.value)}
                                placeholder="ألصق النص الإنجليزي هنا..."
                                className="w-full h-[300px] md:h-[500px] bg-transparent text-gray-300 p-5 pt-12 resize-none outline-none focus:bg-[#0a0a0a] transition-colors scrollbar-thin font-mono text-sm leading-relaxed"
                                dir="ltr"
                                spellCheck={false}
                            ></textarea>
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: Output & Actions --- */}
                    <div className="space-y-6 order-1 lg:order-2">
                        
                        {/* 1. Main Action Button (Floating/Sticky feel) */}
                        <div className="relative z-20">
                            <button 
                                onClick={handleStartTranslation}
                                disabled={isLoading || !activeChapter?.originalContent}
                                className={`
                                    w-full py-4 md:py-6 rounded-2xl font-black text-lg md:text-2xl flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group shadow-[0_10px_50px_rgba(0,0,0,0.7)] ring-1 ring-[#d4af37]/30
                                    ${isLoading 
                                        ? 'bg-[#1a1a1a] text-[#d4af37]/50 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-[#d4af37] via-[#fce274] to-[#b8860b] text-black hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)]'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="absolute inset-0 bg-[#d4af37]/5 w-full h-full">
                                            <div className="h-full bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/20 transition-all duration-300" style={{ width: `${translationProgress}%` }}></div>
                                        </div>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="animate-pulse">جاري الترجمة {Math.round(translationProgress)}%</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></span>
                                        <TranslateIcon className="w-6 h-6 md:w-8 md:h-8 relative z-10" />
                                        <span className="relative z-10">ترجمة فورية</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 2. Arabic Output Area */}
                        <div className="relative group rounded-3xl overflow-hidden border border-[#d4af37]/30 bg-[#080808] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            {/* Toolbar */}
                            <div className="absolute top-0 left-0 right-0 h-12 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#d4af37]/10 flex items-center px-4 justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest">Arabic Output</span>
                                    {isLoading && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCopy}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${extractionStatus ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-[#1a1a1a] text-[#d4af37] border-[#d4af37]/20 hover:bg-[#252525]'}`}
                                    >
                                        {extractionStatus ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                                        <span>{extractionStatus || 'نسخ'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Text Area */}
                            <textarea 
                                ref={outputRef}
                                value={activeChapter?.translatedText || ''}
                                onChange={(e) => activeChapter && updateTranslatedText(activeChapter.id, e.target.value)}
                                placeholder={isLoading ? "جاري استقبال النص..." : "ستظهر الترجمة هنا..."}
                                className="w-full h-[400px] md:h-[600px] bg-transparent text-[#ffffff] p-6 pt-16 resize-none outline-none focus:bg-[#0b0b0b] transition-colors scrollbar-thin text-base md:text-lg leading-loose font-[Tajawal]"
                                dir="rtl"
                                spellCheck={false}
                            ></textarea>
                            
                            {/* Empty State / Placeholder Animation */}
                            {!activeChapter?.translatedText && !isLoading && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                                    <TranslateIcon className="w-32 h-32 text-[#d4af37]" />
                                </div>
                            )}
                        </div>

                        {/* 3. Footer Tools */}
                        <div className="bg-[#0a0a0a]/80 backdrop-blur rounded-2xl border border-[#d4af37]/10 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#d4af37]/10 rounded-xl border border-[#d4af37]/10">
                                    <SparklesIcon className="w-5 h-5 text-[#d4af37]" />
                                </div>
                                <div className="text-center md:text-right">
                                    <h3 className="text-white text-sm font-bold">المسرد الذكي (Smart Codex)</h3>
                                    <p className="text-zinc-500 text-[10px] mt-0.5">استخراج الكيانات والمصطلحات تلقائياً</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleExtractTerms}
                                disabled={isAnalyzing || !activeChapter?.translatedText}
                                className="w-full md:w-auto bg-[#151515] hover:bg-[#202020] disabled:opacity-50 text-white border border-[#d4af37]/20 hover:border-[#d4af37] px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isAnalyzing ? (
                                    <span className="animate-pulse">جاري التحليل...</span>
                                ) : (
                                    <>
                                        <BrainIcon className="w-4 h-4 text-[#d4af37]" />
                                        <span>استخراج الآن</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 4. Extracted Terms Preview */}
                        {(activeBook?.entries.length || 0) > 0 && (
                            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-white/5 max-h-[150px] overflow-y-auto scrollbar-thin shadow-inner">
                                <h4 className="text-[#d4af37] text-[10px] font-bold uppercase tracking-widest mb-3 sticky top-0 bg-[#0a0a0a] pb-2 border-b border-white/5">
                                    📚 {activeBook?.name} - Terms
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeBook?.entries.slice(0, 8).map(entry => (
                                        <div key={entry.id} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-400 flex items-center gap-2">
                                            <span>{entry.name}</span>
                                            <span className="text-[#d4af37]/50">→</span>
                                            <span className="text-[#d4af37] font-bold">{entry.translation}</span>
                                        </div>
                                    ))}
                                    {(activeBook?.entries.length || 0) > 8 && (
                                        <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                                            +{activeBook!.entries.length - 8} المزيد...
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
};
