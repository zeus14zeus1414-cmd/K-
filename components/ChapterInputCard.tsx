
import React, { useRef, useState, useMemo } from 'react';
import { RetryIcon, UploadIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

export const ChapterInputCard: React.FC = () => {
    const { activeChapter: chapter, updateChapter, handleRetry, isLimitReached, handleChapterFileUpload } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate Counts
    const counts = useMemo(() => {
        if (!chapter?.originalContent) return { words: 0, chars: 0 };
        const text = chapter.originalContent;
        return {
            chars: text.length,
            words: text.trim() ? text.trim().split(/\s+/).length : 0
        };
    }, [chapter?.originalContent]);

    if (!chapter) return null;

    const handleFileSelect = (files: FileList | null) => {
        if (files && files[0]) {
            handleChapterFileUpload(chapter.id, files[0]);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Toolbar Header */}
            <div className="flex-shrink-0 h-12 border-b border-white/5 flex items-center justify-between px-3 md:px-4 bg-dark-bg/50 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 border border-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 shadow-sm">Source</span>
                    <input
                        type="text"
                        value={chapter.originalTitle}
                        onChange={(e) => updateChapter(chapter.id, 'originalTitle', e.target.value)}
                        className="bg-transparent text-sm font-bold text-white placeholder:text-dark-text/30 focus:outline-none w-full truncate"
                        placeholder="عنوان الفصل..."
                    />
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Counters */}
                    <div className="hidden sm:flex items-center gap-3 mr-2 px-2 py-1 bg-white/5 rounded border border-white/5 text-[10px] font-mono text-dark-text/50 select-none">
                        <span>{counts.words.toLocaleString()} words</span>
                        <span className="w-px h-3 bg-white/10"></span>
                        <span>{counts.chars.toLocaleString()} chars</span>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} className="hidden" accept=".txt,.docx" />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-white/10 text-dark-text/50 hover:text-primary transition-colors" title="رفع ملف">
                        <UploadIcon className="h-4 w-4" />
                    </button>
                    
                    {chapter.status === 'failed' && (
                         <button onClick={() => handleRetry(chapter.id)} disabled={isLimitReached} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors" title="إعادة المحاولة">
                            <RetryIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-grow relative w-full h-full">
                <textarea
                    value={chapter.originalContent}
                    onChange={(e) => updateChapter(chapter.id, 'originalContent', e.target.value)}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`
                        w-full h-full bg-transparent p-4 md:p-6 resize-none 
                        focus:outline-none text-sm leading-relaxed
                        text-dark-text/80 font-mono
                        transition-all duration-200 scrollbar-thin
                        ${isDragging ? 'bg-primary/5 ring-2 ring-primary ring-inset backdrop-blur-sm' : ''}
                    `}
                    placeholder="ألصق النص الأصلي هنا (English/Chinese)..."
                    dir="ltr"
                    spellCheck={false}
                ></textarea>
            </div>
        </div>
    );
};
