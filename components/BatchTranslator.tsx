
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { usePersistedState } from '../hooks/usePersistedState';
import { translateChapterStream as translateWithGemini } from '../services/geminiService';
import { SYSTEM_PROMPT, DEFAULT_EXTRACTION_PROMPT } from '../constants';
import { SparklesIcon, BrainIcon, StackIcon, BookIcon, FileIcon, KeyIcon, CheckCircleIcon, CloseIcon } from './Icons';
import { CodexCategory } from '../types';

type Provider = 'Gemini' | 'Together' | 'OpenAI' | 'Google';

export const BatchTranslator: React.FC = () => {
    const { 
        chapters, 
        updateTranslatedText, 
        apiKeys, 
        systemPrompt,
        folders,
        moveChaptersToFolder,
        addEntry,
        activeBook,
        activeBookId,
        extractionPrompt
    } = useAppContext();

    const [provider, setProvider] = usePersistedState<Provider>('batch_provider', 'Gemini');
    const [waitTime, setWaitTime] = usePersistedState<number>('batch_wait_time', 30);
    const [skipTranslated, setSkipTranslated] = usePersistedState<boolean>('batch_skip_translated', true);
    const [extractTerms, setExtractTerms] = usePersistedState<boolean>('batch_extract_terms', false);
    const [glossaryKeysText, setGlossaryKeysText] = usePersistedState<string>('batch_glossary_keys', '');
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const stopRequested = useRef(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // --- Statistics Calculations ---
    const sourceFolder = folders.find(f => f.name === 'المصدر');
    const translatedFolder = folders.find(f => f.name === 'المترجمة');

    const sourceChaptersCount = chapters.filter(c => c.folderId === sourceFolder?.id).length;
    const translatedChaptersCount = chapters.filter(c => c.folderId === translatedFolder?.id).length;
    const providerKeysCount = apiKeys.keys.length;
    const glossaryKeysCount = glossaryKeysText.split('\n').filter(k => k.trim()).length;
    const totalTermsCount = activeBook?.entries.length || 0;

    // Scroll to bottom of logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Translation Helpers ---

    const translateWithGoogle = async (text: string): Promise<string> => {
        const url = 'https://translate.googleapis.com/translate_a/single';
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'en',
            tl: 'ar',
            dt: 't',
            q: text
        });
        try {
            const response = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error(`Google Error: ${response.status}`);
            const data = await response.json();
            return data[0].map((seg: any) => seg[0]).join('');
        } catch (e: any) {
            throw e;
        }
    };

    // --- Real Codex Extraction ---
    const extractCodexTermsWithGemini = async (englishText: string, arabicText: string, apiKey: string) => {
        // Use custom prompt from context or default, and inject text
        const basePrompt = extractionPrompt || DEFAULT_EXTRACTION_PROMPT;
        const prompt = basePrompt
            .replace('{{ENGLISH_TEXT}}', englishText.substring(0, 4000))
            .replace('{{ARABIC_TEXT}}', arabicText.substring(0, 4000));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            
            if (!response.ok) throw new Error("Codex Extraction Failed");
            
            const data = await response.json();
            let text = data.candidates[0].content.parts[0].text;
            // Clean Markdown
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(text);
            return json;
        } catch (e) {
            throw e;
        }
    };

    // --- Helper for Natural Sort ---
    const getChapterNumber = (title: string): number => {
        const match = title.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999999;
    };

    // --- MAIN LOOP ---

    const startBatch = async () => {
        if (chapters.length === 0) {
            addLog("❌ لا توجد فصول للترجمة.");
            return;
        }

        const appGeminiKeys = apiKeys.keys;
        const glossaryKeys = glossaryKeysText.split('\n').map(k => k.trim()).filter(k => k);

        // Validation
        if (provider === 'Gemini' && appGeminiKeys.length === 0) {
            alert('يرجى إضافة مفاتيح Gemini في الإعدادات أولاً.');
            return;
        }
        if (extractTerms && glossaryKeys.length === 0) {
            if (!confirm("لا توجد مفاتيح مسرد (Glossary Keys). هل تريد المتابعة بدون استخراج؟")) return;
            setExtractTerms(false);
        }

        if (!translatedFolder) {
            alert("تحذير: مجلد 'المترجمة' غير موجود. لن يتم نقل الفصول تلقائياً.");
        }

        setIsRunning(true);
        stopRequested.current = false;
        setLogs([]); 
        addLog("🚀 بدء الترجمة الجماعية...");
        addLog(`🔧 المزود: ${provider} | وقت الانتظار: ${waitTime}ث`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;
        let termsCount = 0;

        // 1. Filter: Only process chapters NOT in "Translated" folder
        const rawCandidates = chapters.filter(c => c.folderId !== translatedFolder?.id);
        
        // 2. Sort: Natural Sort (Numerical) to ensure 45 -> 46 -> 47
        const targetChapters = rawCandidates.sort((a, b) => {
            const numA = getChapterNumber(a.originalTitle);
            const numB = getChapterNumber(b.originalTitle);
            
            if (numA !== numB) {
                return numA - numB;
            }
            return a.originalTitle.localeCompare(b.originalTitle);
        });
        
        if (targetChapters.length === 0) {
            addLog("⚠️ جميع الفصول موجودة بالفعل في مجلد 'المترجمة'.");
            setIsRunning(false);
            return;
        }

        setProgress({ current: 0, total: targetChapters.length });

        for (let i = 0; i < targetChapters.length; i++) {
            if (stopRequested.current) {
                addLog("🛑 تم إيقاف الترجمة يدوياً.");
                break;
            }

            const chapter = targetChapters[i];
            setProgress({ current: i + 1, total: targetChapters.length });

            // Check if this is a Source Chapter (Raw untranslated source)
            // Even if the user put content in 'translatedText' via the editor, if it's in the Source folder,
            // we treat it as raw material that needs processing.
            const isSourceChapter = sourceFolder && chapter.folderId === sourceFolder.id;

            // Check if user wants to skip translated ones (if text exists AND NOT in Source folder)
            // If it IS in source folder, we assume it's a new draft that needs translation/moving.
            if (skipTranslated && !isSourceChapter && chapter.translatedText && chapter.translatedText.length > 50) {
                addLog(`⏭️ تخطي: ${chapter.originalTitle} (يحتوي على ترجمة)`);
                skippedCount++;
                continue;
            }

            // Fallback check: If pure empty content
            if (!chapter.originalContent && !chapter.translatedText) {
                addLog(`⚠️ تخطي: ${chapter.originalTitle} (لا يوجد محتوى)`);
                skippedCount++;
                continue;
            }

            addLog(`🔄 معالجة: ${chapter.originalTitle}...`);

            // Use originalContent if available, otherwise fallback to translatedText (e.g. if user pasted source there)
            const textToTranslate = chapter.originalContent || chapter.translatedText || "";

            let translatedText = "";
            let translationSuccess = false;

            try {
                // Provider Logic
                if (provider === 'Google') {
                    translatedText = await translateWithGoogle(textToTranslate);
                    translationSuccess = true;
                } else if (provider === 'Gemini') {
                    let fullText = "";
                    await new Promise<void>((resolve, reject) => {
                        translateWithGemini(
                            chapter.originalTitle,
                            textToTranslate,
                            'gemini-2.5-flash', 
                            systemPrompt || SYSTEM_PROMPT,
                            0.7,
                            0,
                            (chunk) => { fullText += chunk; },
                            () => {} 
                        ).then(() => {
                            translatedText = fullText;
                            translationSuccess = true;
                            resolve();
                        }).catch(reject);
                    });
                }

                if (translationSuccess && translatedText) {
                    // 1. Update Text
                    updateTranslatedText(chapter.id, translatedText);
                    
                    // 2. Move to Translated Folder (This effectively "deletes" it from Source list view)
                    if (translatedFolder) {
                        moveChaptersToFolder([chapter.id], translatedFolder.id);
                        addLog(`📂 تم النقل إلى مجلد "المترجمة".`);
                    }

                    addLog(`✅ تمت الترجمة بنجاح.`);
                    successCount++;

                    // 3. Real Codex Extraction
                    if (extractTerms && glossaryKeys.length > 0 && activeBookId) {
                        try {
                            const gKey = glossaryKeys[i % glossaryKeys.length];
                            addLog(`🧠 تحليل الكودكس (Codex Extraction)...`);
                            
                            const extractedItems = await extractCodexTermsWithGemini(textToTranslate, translatedText, gKey);
                            
                            let added = 0;
                            if (Array.isArray(extractedItems)) {
                                extractedItems.forEach((item: any) => {
                                    if (item.name && item.translation) {
                                        // Check duplicates in active book
                                        const exists = activeBook?.entries.some(e => e.name.toLowerCase() === item.name.toLowerCase());
                                        if (!exists) {
                                            addEntry(
                                                (item.category as CodexCategory) || 'other',
                                                item.name,
                                                item.translation,
                                                item.description || ''
                                            );
                                            added++;
                                        }
                                    }
                                });
                            }
                            addLog(`✨ تمت إضافة ${added} مصطلح للكودكس.`);
                            termsCount += added;
                        } catch (e: any) {
                            addLog(`⚠️ فشل تحليل الكودكس: ${e.message}`);
                        }
                    }

                } else {
                    throw new Error("Empty response");
                }

            } catch (error: any) {
                addLog(`❌ فشل: ${error.message}`);
                failCount++;
            }

            // Wait time
            if (i < targetChapters.length - 1 && !stopRequested.current) {
                addLog(`⏳ انتظار ${waitTime} ثانية...`);
                await sleep(waitTime * 1000);
            }
        }

        addLog("--------------------------------");
        addLog(`🎉 اكتملت الدفعة.`);
        addLog(`تمت: ${successCount} | فشلت: ${failCount} | تم التخطي: ${skippedCount}`);
        setIsRunning(false);
    };

    return (
        <div className="h-full w-full bg-[#050505] text-[#e4e4e7] overflow-y-auto scrollbar-thin relative p-4 md:p-8 custom-selection">
             <style>{`
                .custom-selection ::selection { background: rgba(212, 175, 55, 0.3); color: white; }
                .latin-text { font-family: 'Segoe UI', sans-serif; }
            `}</style>

            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#d4af37]/5 to-transparent pointer-events-none z-0" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                
                {/* Header */}
                <header className="text-center space-y-2">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] via-[#fce274] to-[#b8860b] drop-shadow-[0_0_25px_rgba(212,175,55,0.3)] tracking-tight">
                        الترجمة الجماعية الذكية
                    </h1>
                    <p className="text-[#d4af37]/60 text-sm">نقل تلقائي • كودكس حي • تحكم كامل</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT: Stats & Config (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* 1. Statistics Panel (Enhanced) */}
                        <div className="bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <StackIcon className="w-16 h-16 text-[#d4af37]" />
                            </div>
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                                <BrainIcon className="w-4 h-4 text-[#d4af37]" />
                                حالة المكتبة
                            </h3>
                            
                            <div className="space-y-3 font-mono text-xs">
                                <div className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-blue-500/20">
                                    <span className="text-blue-400 flex items-center gap-2"><FileIcon className="w-3 h-3" /> فصول المصدر (EN)</span>
                                    <span className="text-white font-bold">{sourceChaptersCount}</span>
                                </div>
                                <div className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-green-500/20">
                                    <span className="text-green-400 flex items-center gap-2"><CheckCircleIcon className="w-3 h-3" /> فصول المترجمة (AR)</span>
                                    <span className="text-white font-bold">{translatedChaptersCount}</span>
                                </div>
                                <div className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-[#d4af37]/20">
                                    <span className="text-[#d4af37] flex items-center gap-2"><KeyIcon className="w-3 h-3" /> مفاتيح المزود</span>
                                    <span className="text-white font-bold">{providerKeysCount}</span>
                                </div>
                                <div className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-purple-500/20">
                                    <span className="text-purple-400 flex items-center gap-2"><SparklesIcon className="w-3 h-3" /> مفاتيح المسرد</span>
                                    <span className="text-white font-bold">{glossaryKeysCount}</span>
                                </div>
                                <div className="flex justify-between items-center bg-[#111] p-2 rounded-lg border border-white/10">
                                    <span className="text-zinc-400 flex items-center gap-2"><BookIcon className="w-3 h-3" /> إجمالي المصطلحات</span>
                                    <span className="text-white font-bold">{totalTermsCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Settings */}
                        <div className="bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-white font-bold mb-4 border-b border-white/5 pb-2">إعدادات الدفعة</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-400 mb-1 block">وقت الانتظار (ثانية)</label>
                                    <input 
                                        type="number" 
                                        value={waitTime}
                                        onChange={(e) => setWaitTime(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#d4af37] outline-none transition-colors text-center font-mono font-bold"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-white/5">
                                    <span className="text-xs text-zinc-300">تخطي المترجم مسبقاً</span>
                                    <button 
                                        onClick={() => setSkipTranslated(!skipTranslated)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${skipTranslated ? 'bg-[#d4af37]' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-3 h-3 bg-black rounded-full transition-transform ${skipTranslated ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-white/5">
                                    <span className="text-xs text-zinc-300">استخراج الكودكس (Gemini)</span>
                                    <button 
                                        onClick={() => setExtractTerms(!extractTerms)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${extractTerms ? 'bg-[#d4af37]' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-3 h-3 bg-black rounded-full transition-transform ${extractTerms ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3. Glossary Keys (Conditional) */}
                        {extractTerms && (
                            <div className="bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl p-5 shadow-lg animate-fade-in-down">
                                <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-xs">
                                    <SparklesIcon className="w-3 h-3 text-[#d4af37]" />
                                    مفاتيح استخراج الكودكس (كل مفتاح في سطر)
                                </h3>
                                <textarea 
                                    value={glossaryKeysText}
                                    onChange={(e) => setGlossaryKeysText(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full h-24 bg-[#111] border border-white/10 rounded-xl p-3 text-[10px] text-[#d4af37] font-mono focus:border-[#d4af37] outline-none resize-none"
                                />
                            </div>
                        )}

                        {/* 4. Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={startBatch}
                                disabled={isRunning}
                                className="bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
                            >
                                {isRunning ? 'جاري العمل...' : 'بدء المعالجة'}
                            </button>
                            <button 
                                onClick={() => { stopRequested.current = true; }}
                                disabled={!isRunning}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-sm"
                            >
                                إيقاف
                            </button>
                        </div>

                    </div>

                    {/* RIGHT: Console & Logs (8 cols) */}
                    <div className="lg:col-span-8 h-[600px] lg:h-auto bg-[#080808] border border-white/10 rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
                        {/* Header */}
                        <div className="bg-[#0a0a0a] border-b border-white/10 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
                                </div>
                                <span className="text-xs font-mono text-zinc-500 ml-2">Console Output - Realtime</span>
                            </div>
                            <div className="text-xs font-mono text-[#d4af37]">
                                Processing Queue: {progress.current} / {progress.total}
                            </div>
                        </div>

                        {/* Terminal Body */}
                        <div className="flex-grow p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-1.5 scrollbar-thin scrollbar-thumb-[#d4af37]/20">
                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 select-none opacity-50">
                                    <StackIcon className="w-16 h-16 mb-4" />
                                    <p>جاهز لبدء الترجمة...</p>
                                    <p className="text-[10px] mt-2">سيتم نقل الفصول المترجمة تلقائياً إلى تبويب "المترجمة".</p>
                                </div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className={`break-words border-l-2 pl-2 py-1 ${
                                    log.includes('❌') ? 'text-red-400 border-red-500/50 bg-red-500/5' : 
                                    log.includes('✅') ? 'text-green-400 border-green-500/50 bg-green-500/5' : 
                                    log.includes('⚠️') ? 'text-yellow-400 border-yellow-500/50' : 
                                    log.includes('🚀') ? 'text-[#d4af37] border-[#d4af37] font-bold py-2' :
                                    log.includes('📂') ? 'text-blue-400 border-blue-500/50' :
                                    'text-zinc-300 border-zinc-700'
                                }`}>
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>

                        {/* Progress Bar */}
                        {isRunning && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#111]">
                                <div 
                                    className="h-full bg-[#d4af37] transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
