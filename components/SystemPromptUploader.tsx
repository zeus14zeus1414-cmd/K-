
import React, { useRef, useState } from 'react';
import { UploadIcon, TrashIcon, DownloadIcon } from './Icons';
import { readTextFromFile } from '../utils/fileReader';
import { SYSTEM_PROMPT } from '../constants';
import saveAs from 'file-saver';

interface SystemPromptUploaderProps {
    onPromptUpload: (prompt: string, fileName: string) => void;
    onPromptClear: () => void;
    onPromptChange: (text: string) => void;
    currentPrompt: string | null;
    uploadedFileName: string | null;
}

export const SystemPromptUploader: React.FC<SystemPromptUploaderProps> = ({ onPromptUpload, onPromptClear, onPromptChange, currentPrompt, uploadedFileName }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = async (file: File | null) => {
        if (file) {
            try {
                // Use the existing utility to read .txt or .docx
                const text = await readTextFromFile(file);
                onPromptUpload(text, file.name);
            } catch (error) {
                alert("فشل قراءة الملف. يرجى التأكد من أن الملف نصي أو Docx.");
                console.error(error);
            }
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
    };

    const handleDownloadDefault = () => {
        try {
            const blob = new Blob([SYSTEM_PROMPT], { type: "text/plain;charset=utf-8" });
            saveAs(blob, "Default_Rules_v1.9.txt");
        } catch (error) {
            console.error("Failed to download default rules:", error);
            alert("فشل تحميل الملف.");
        }
    };

    return (
        <div 
            className={`flex flex-col h-full relative p-3 transition-colors rounded-xl ${isDragging ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${uploadedFileName ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-dark-text/40'}`}>
                        {uploadedFileName ? `ملف: ${uploadedFileName}` : 'وضع التعديل اليدوي'}
                    </span>
                </div>
                <div className="flex gap-2 shrink-0">
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files?.[0] || null)} className="hidden" accept=".txt,.docx,.md" />
                    
                    <button 
                        onClick={handleDownloadDefault}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-dark-text rounded-lg text-xs font-bold transition-colors"
                        title="تحميل القوانين الافتراضية (V1.9)"
                    >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">تحميل الافتراضي</span>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                        title="رفع ملف تعليمات (Txt/Docx)"
                    >
                        <UploadIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">استيراد</span>
                    </button>

                    {currentPrompt && (
                        <button onClick={onPromptClear} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg" title="مسح النص">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Text Area */}
            <textarea
                value={currentPrompt || ''}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="أدخل تعليمات المترجم هنا... 
أو قم بسحب وإفلات ملف نصي (.txt, .docx) ليتم تعبئة هذا الحقل تلقائياً.
يمكنك تعديل النص بعد رفعه بحرية."
                className="flex-grow w-full bg-dark-bg/50 border border-dark-border rounded-lg p-4 text-sm focus:outline-none focus:border-primary resize-none font-mono leading-relaxed text-dark-text/90 scrollbar-thin"
                spellCheck={false}
                dir="auto"
            />
        </div>
    );
};
