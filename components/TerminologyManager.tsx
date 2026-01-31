
import React, { useState, useRef } from 'react';
import { Term } from '../types';
import { TrashIcon, PlusIcon, DownloadIcon, UploadIcon } from './Icons';
import saveAs from 'file-saver';

interface TerminologyManagerProps {
    terms: Term[];
    onAddTerm: (original: string, translation: string) => void;
    onRemoveTerm: (id: string) => void;
    importTerms: (terms: Term[], merge: boolean) => void;
}

export const TerminologyManager: React.FC<TerminologyManagerProps> = ({ terms, onAddTerm, onRemoveTerm, importTerms }) => {
    const [original, setOriginal] = useState('');
    const [translation, setTranslation] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        onAddTerm(original, translation);
        setOriginal('');
        setTranslation('');
    };

    const handleExport = () => {
        if (terms.length === 0) return;
        const cleanTerms = terms.map(({ original, translation }) => ({ original, translation }));
        const jsonString = JSON.stringify(cleanTerms, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        saveAs(blob, "abyssal-glossary.json");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed) && parsed.every(t => 'original' in t && 'translation' in t)) {
                    const confirmMerge = window.confirm("هل تريد دمج المصطلحات الجديدة مع القائمة الحالية؟\n\n(موافق = دمج، إلغاء = استبدال الكل)");
                    const validTerms = parsed.map((t: any) => ({
                        id: crypto.randomUUID(), 
                        original: t.original,
                        translation: t.translation
                    }));
                    importTerms(validTerms, confirmMerge);
                } else {
                    alert("صيغة الملف غير صحيحة.");
                }
            } catch (error) {
                console.error("Import error:", error);
                alert("فشل في قراءة الملف.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-shrink-0 bg-dark-bg z-10 pb-4">
                <h2 className="text-2xl font-bold mb-2">📖 قاموس المصطلحات</h2>
                <p className="text-sm text-dark-text/70 mb-4">
                    أضف مصطلحاتك الخاصة لضمان ترجمتها كما تريد بالضبط في كل مرة.
                </p>
                
                {/* Actions */}
                <div className="flex gap-3 mb-4">
                    <button 
                        onClick={handleExport}
                        disabled={terms.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-dark-card border border-dark-border hover:bg-white/5 transition disabled:opacity-50 text-xs font-bold"
                    >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span>تصدير (JSON)</span>
                    </button>
                    <button 
                        onClick={handleImportClick}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-dark-card border border-dark-border hover:bg-white/5 transition text-xs font-bold"
                    >
                        <UploadIcon className="h-3.5 w-3.5" />
                        <span>استيراد</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                </div>

                {/* Compact Input Form */}
                <form onSubmit={handleAdd} className="bg-dark-card/50 p-3 rounded-xl border border-dark-border grid grid-cols-12 gap-2">
                    <div className="col-span-6 md:col-span-5">
                        <input
                            type="text"
                            value={original}
                            onChange={(e) => setOriginal(e.target.value)}
                            placeholder="English Term"
                            className="w-full p-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                            dir="ltr"
                            required
                        />
                    </div>
                    <div className="col-span-6 md:col-span-5">
                        <input
                            type="text"
                            value={translation}
                            onChange={(e) => setTranslation(e.target.value)}
                            placeholder="الترجمة العربية"
                            className="w-full p-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                            required
                        />
                    </div>
                    <div className="col-span-12 md:col-span-2">
                        <button
                            type="submit"
                            className="w-full h-full min-h-[40px] flex items-center justify-center bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition duration-200 shadow-lg shadow-primary/20 active:scale-95"
                            disabled={!original.trim() || !translation.trim()}
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2 scrollbar-thin pb-4">
                {terms.length === 0 ? (
                    <p className="text-center text-dark-text/50 py-10 text-sm">القاموس فارغ حاليًا.</p>
                ) : (
                    terms.map(term => (
                        <div key={term.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border group hover:border-primary/30 transition-all">
                            <div className="flex-1 latin-text text-left text-sm font-semibold text-white truncate" dir="ltr">
                                {term.original}
                            </div>
                            <div className="mx-2 text-dark-text/30 text-xs">→</div>
                             <div className="flex-1 text-right text-sm font-semibold text-primary truncate">
                                {term.translation}
                            </div>
                            <button onClick={() => onRemoveTerm(term.id)} className="text-dark-text/30 hover:text-red-400 transition ml-3 p-1">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};