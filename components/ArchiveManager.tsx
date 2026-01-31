
import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { 
    DownloadIcon, UploadIcon, ZipIcon, 
    SettingsIcon, BookIcon, KeyIcon, 
    FileIcon, FolderIcon, BrainIcon,
    CheckCircleIcon, WarningIcon, SpinnerIcon
} from './Icons';
import { useAppContext } from '../contexts/AppContext';

// Keys used in localStorage (Must match hooks/usePersistedState keys)
const PERSISTENCE_KEYS = [
    'savedChapters',
    'archivedChapters',
    'chapterFolders',
    'geminiApiKeys_v2',
    'cerebrasApiKeys_v1',
    'gptOssApiKeys_v1', 'gptOssBaseUrl_v1', 'gptOssModelName_v1',
    'systemPrompt',
    'extractionPrompt',
    'promptFileName',
    'ai_temperature',
    'ai_thinking_budget',
    'app_theme_v2',
    'selectedModel',
    'zeusEditorConfig_v3',
    'zeusExpandedFolders',
    'codexBooks',
    'activeCodexBookId',
    'customTerminology',
    'dailyTranslationUsage',
    'batch_provider', 'batch_wait_time', 'batch_skip_translated', 'batch_extract_terms', 'batch_glossary_keys',
    'zeusLastActiveChapterId', 'zeusFindText', 'zeusReplaceText'
];

export const ArchiveManager: React.FC<{ chapters?: any }> = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');

    const handleExport = async () => {
        setStatus('processing');
        setStatusMsg('جاري تجميع البيانات...');
        
        try {
            const zip = new JSZip();
            const backupData: Record<string, any> = {};
            let itemsCount = 0;

            PERSISTENCE_KEYS.forEach(key => {
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        backupData[key] = JSON.parse(raw);
                        itemsCount++;
                    } catch (e) {
                        backupData[key] = raw;
                    }
                }
            });

            // Add metadata
            const meta = {
                timestamp: new Date().toISOString(),
                version: '4.6',
                itemCount: itemsCount,
                appName: 'ZeusTranslator'
            };
            
            zip.file("zeus_data.json", JSON.stringify(backupData, null, 2));
            zip.file("metadata.json", JSON.stringify(meta, null, 2));

            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `ZEUS_BACKUP_${new Date().toISOString().split('T')[0]}.zip`);
            
            setStatus('success');
            setStatusMsg('تم تصدير النسخة الاحتياطية بنجاح!');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setStatusMsg('فشل التصدير: ' + error.message);
        }
    };

    const handleImportClick = () => {
        if (confirm("تحذير: استعادة النسخة الاحتياطية سيقوم بمسح جميع البيانات الحالية واستبدالها ببيانات النسخة.\n\nهل أنت متأكد من المتابعة؟")) {
            fileInputRef.current?.click();
        }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        setStatusMsg('جاري استعادة البيانات...');

        try {
            const zip = await JSZip.loadAsync(file);
            
            // Check for valid backup file
            if (!zip.file("zeus_data.json")) {
                throw new Error("ملف النسخة الاحتياطية غير صالح (مفقود zeus_data.json)");
            }

            const content = await zip.file("zeus_data.json")?.async("string");
            if (!content) throw new Error("فشل قراءة ملف البيانات");

            const data = JSON.parse(content);

            // Clear current storage strictly for known keys to avoid junk
            PERSISTENCE_KEYS.forEach(key => localStorage.removeItem(key));

            // Restore data
            let restoredCount = 0;
            Object.keys(data).forEach(key => {
                if (PERSISTENCE_KEYS.includes(key)) {
                    const value = data[key];
                    localStorage.setItem(key, JSON.stringify(value));
                    restoredCount++;
                }
            });

            setStatus('success');
            setStatusMsg(`تمت الاستعادة بنجاح (${restoredCount} عنصر)! جاري إعادة التشغيل...`);
            
            // Reload to apply changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setStatusMsg('فشل الاستعادة: ' + error.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh] animate-fade-in-down">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                
                {/* Export Card */}
                <div 
                    onClick={handleExport}
                    className="group relative overflow-hidden bg-[#0a0a0a] border border-[#d4af37]/20 hover:border-[#d4af37] rounded-3xl p-8 cursor-pointer transition-all duration-300 hover:shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col items-center justify-center text-center gap-6 active:scale-95"
                >
                    <div className="w-24 h-24 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#d4af37]/20 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                        <DownloadIcon className="w-10 h-10 text-[#d4af37]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-[#d4af37] transition-colors">تصدير نسخة احتياطية</h2>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                            حفظ كل شيء (الفصول، المفاتيح، الإعدادات، الكودكس) في ملف ZIP واحد مشفر.
                        </p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Import Card */}
                <div 
                    onClick={handleImportClick}
                    className="group relative overflow-hidden bg-[#0a0a0a] border border-blue-500/20 hover:border-blue-500 rounded-3xl p-8 cursor-pointer transition-all duration-300 hover:shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col items-center justify-center text-center gap-6 active:scale-95"
                >
                    <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <UploadIcon className="w-10 h-10 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-500 transition-colors">استعادة نسخة</h2>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                            استرجاع كافة بياناتك من ملف ZIP سابق. سيتم استبدال البيانات الحالية.
                        </p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".zip" />
                </div>

                {/* Status Overlay */}
                {status !== 'idle' && (
                    <div className="col-span-1 md:col-span-2 mt-4 animate-fade-in-down">
                        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-3 text-center ${
                            status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            status === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}>
                            {status === 'processing' && <SpinnerIcon className="w-8 h-8 animate-spin text-primary" />}
                            {status === 'success' && <CheckCircleIcon className="w-8 h-8" />}
                            {status === 'error' && <WarningIcon className="w-8 h-8" />}
                            <span className="font-bold text-lg">{statusMsg}</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
