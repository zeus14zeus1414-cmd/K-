
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { 
    FileIcon, SearchIcon, MaximizeIcon, MinimizeIcon, 
    ArrowRightIcon, PlusIcon, TrashIcon, BookOpenIcon, 
    CloseIcon, TypeIcon, DownloadIcon, UploadIcon, UndoIcon, RedoIcon,
    ListCheckIcon, CheckCircleIcon, 
    FolderIcon, FolderOpenIcon, ChevronDownIcon, ChevronRightIcon,
    ArrowsRightLeftIcon as NavIcon, EditIcon, ImportIcon, CopyIcon 
} from './Icons';
import { parseChaptersFromText } from '../utils/chapterParser';
import { usePersistedState } from '../hooks/usePersistedState';
import { copyTextToClipboard } from '../utils/clipboard';

declare global {
    interface Window {
        CodeMirror: any;
    }
}

interface ZeusEditorProps {
    onExit?: () => void;
}

const FONTS = [
    { name: 'افتراضي (Geeza Pro)', value: 'Geeza Pro' },
    { name: 'تجوال (Tajawal)', value: "'Tajawal', sans-serif" },
    { name: 'أميري (Amiri)', value: "'Amiri', serif" },
    { name: 'كايرو (Cairo)', value: "'Cairo', sans-serif" },
    { name: 'كو في (Kufi)', value: "'Noto Kufi Arabic', sans-serif" },
    { name: 'تايمز (Times)', value: "'Times New Roman', serif" },
    { name: 'عريض (Arial)', value: "Arial, sans-serif" },
];

const COLORS = [
    { name: 'أخضر', value: '#4ade80' },
    { name: 'أزرق', value: '#60a5fa' },
    { name: 'أحمر', value: '#f87171' },
    { name: 'أصفر', value: '#fbbf24' },
    { name: 'بنفسجي', value: '#c084fc' },
    { name: 'وردي', value: '#f472b6' },
    { name: 'برتقالي', value: '#fb923c' },
    { name: 'أبيض', value: '#ffffff' },
];

const QUOTES_MAP: Record<string, string[]> = {
    'standard': ['"', '"'],
    'single': ["'", "'"],
    'smart': ['“', '”'],
    'guillemets': ['«', '»']
};

const ToolButton = ({ onClick, icon, label, active = false, danger = false }: any) => (
    <button
        onClick={onClick}
        className={`
            flex-shrink-0 p-2 md:p-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden
            ${active 
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)] border border-primary/50' 
                : danger 
                    ? 'text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(248,113,113,0.2)]' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }
        `}
        title={label}
    >
        {icon}
    </button>
);

const Toast = ({ message, visible }: { message: string, visible: boolean }) => {
    if (!visible) return null;
    return (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-toast-in w-max max-w-[90vw]">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-full shadow-2xl flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-white font-bold text-xs md:text-sm tracking-wide truncate">{message}</span>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: any) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in ring-1 ring-white/5">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors">إلغاء</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-500/20">تأكيد الحذف</button>
                </div>
            </div>
        </div>
    );
};

const RenameModal = ({ isOpen, currentName, onSave, onCancel }: any) => {
    const [name, setName] = useState(currentName);
    
    useEffect(() => {
        if (isOpen) setName(currentName);
    }, [isOpen, currentName]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#18181b] border border-primary/20 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-full animate-scale-in ring-1 ring-primary/10">
                <div className="flex items-center gap-2 mb-4">
                    <EditIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold text-white">إعادة تسمية الفصل</h3>
                </div>
                <input 
                    autoFocus
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none mb-6 transition-all"
                    placeholder="اسم الفصل الجديد..."
                />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors">إلغاء</button>
                    <button 
                        onClick={() => onSave(name)} 
                        disabled={!name.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

const ImportModal = ({ isOpen, onCancel, onConfirm, folders }: { isOpen: boolean, onCancel: () => void, onConfirm: (folderId: string | undefined) => void, folders: any[] }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in p-4">
            <div className="bg-[#18181b] border border-white/10 p-8 rounded-[32px] shadow-[0_0_100px_rgba(var(--color-primary),0.2)] max-w-lg w-full animate-scale-in ring-1 ring-white/5 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px]"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-[50px]"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                            <FolderIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">اختر وجهة الاستيراد</h3>
                            <p className="text-zinc-400 text-xs mt-0.5">أين تريد حفظ الفصول المستوردة؟</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                        <button 
                            onClick={() => onConfirm(undefined)}
                            className="group relative p-4 bg-zinc-900 border border-white/5 hover:border-white/20 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl text-left"
                        >
                            <div className="mb-2 bg-zinc-800 w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                <FileIcon className="h-4 w-4 text-zinc-400 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white block">القائمة الرئيسية</span>
                            <span className="text-[10px] text-zinc-500">(غير مصنف)</span>
                        </button>

                        {folders.map(f => (
                            <button 
                                key={f.id}
                                onClick={() => onConfirm(f.id)}
                                className={`group relative p-4 bg-zinc-900 border border-white/5 hover:border-primary/50 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl text-left ${f.name === 'المصدر' || f.name === 'المترجمة' ? 'ring-1 ring-primary/20 bg-primary/5' : ''}`}
                            >
                                <div className="mb-2 bg-zinc-800 w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                    <FolderOpenIcon className={`h-4 w-4 ${f.name === 'المصدر' ? 'text-blue-400' : f.name === 'المترجمة' ? 'text-green-400' : 'text-zinc-400'}`} />
                                </div>
                                <span className="text-sm font-bold text-zinc-300 group-hover:text-white block truncate">{f.name}</span>
                                {f.name === 'المصدر' && <span className="text-[9px] text-blue-400 font-bold block mt-1">English Source</span>}
                                {f.name === 'المترجمة' && <span className="text-[9px] text-green-400 font-bold block mt-1">Translated</span>}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-bold transition-all border border-white/5">
                            إلغاء الأمر
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const createCustomOverlay = (type: string, startChar: string, endChar: string, hideQuotes: boolean) => {
    return {
        token: function(stream: any) {
            if (stream.match(startChar, true)) {
                return hideQuotes ? "quote-hidden" : `formatting-${type}`;
            }
            if (stream.match(endChar, true)) {
                return hideQuotes ? "quote-hidden" : `formatting-${type}`;
            }
            const str = stream.string;
            const pos = stream.pos;
            const lastStart = str.lastIndexOf(startChar, pos);
            const nextEnd = str.indexOf(endChar, pos);
            if (lastStart !== -1 && nextEnd !== -1 && lastStart < pos && pos < nextEnd) {
                while (stream.pos < nextEnd) {
                    stream.next();
                }
                return `content-${type}`;
            }
            stream.next();
            return null;
        }
    };
};

export const ZeusEditor: React.FC<ZeusEditorProps> = ({ onExit }) => {
    const { 
        activeChapter, 
        updateTranslatedText, 
        chapters, 
        setChapters,
        setActiveTabIndex,
        addNewChapter,
        updateChapter,
        removeChapter,
        folders,
        toggleFolder,
        createFolder,
        deleteFolder,
        moveChaptersToFolder 
    } = useAppContext();

    const [cmEditor, setCmEditor] = useState<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [stats, setStats] = useState({ words: 0, lines: 0 });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [chapterSearch, setChapterSearch] = useState('');
    const [sortType, setSortType] = useState<'modified' | 'alpha' | 'numeric'>('numeric');
    
    // PERSISTENT FOLDER STATE
    const [expandedFolders, setExpandedFolders] = usePersistedState<Record<string, boolean>>('zeusExpandedFolders', { 'all': true, 'uncategorized': true });
    
    const [toast, setToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [renameModal, setRenameModal] = useState({ isOpen: false, chapterId: '', currentName: '' });
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [findText, setFindText] = useState(() => localStorage.getItem('zeusFindText') || '');
    const [replaceText, setReplaceText] = useState(() => localStorage.getItem('zeusReplaceText') || '');
    
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null);

    const [listTab, setListTab] = useState<'translated' | 'english'>('translated');

    const activeChapterRef = useRef(activeChapter);
    const saveTimeoutRef = useRef<any>(null);

    const settingsRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [config, setConfig] = useState({
        navigationEnabled: false,
        fontSize: 18,
        lineHeight: 1.8,
        fontFamily: 'Geeza Pro',
        theme: 'dark',
        markdownEnabled: true,
        markdownQuote: 'standard',
        markdownHideQuotes: false,
        markdownSize: 100,
        dialogueEnabled: true,
        dialogueQuote: 'single',
        dialogueColor: '#4ade80',
        dialogueHideQuotes: false,
        dialogueSize: 100,
    });

    useEffect(() => {
        activeChapterRef.current = activeChapter;
    }, [activeChapter]);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
    };

    const cleanTitle = (title: string) => {
        if (!title) return '';
        let name = title.replace(/^.*[\\/]/, '');
        name = name.replace(/\.(txt|docx)$/i, '');
        return name;
    };

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            createFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreatingFolder(false);
            showToast('تم إنشاء المجلد');
        }
    };

    const handleNewChapter = () => {
        if (listTab === 'translated') {
            const tFolder = folders.find(f => f.name === 'المترجمة');
            addNewChapter(tFolder?.id);
        } else {
            addNewChapter(undefined);
        }
    };

    const sortedChapters = useMemo(() => {
        let result = [...chapters];
        
        if (listTab === 'translated') {
            const tFolder = folders.find(f => f.name === 'المترجمة');
            result = result.filter(c => 
                (c.translatedText && c.translatedText.trim().length > 0) || 
                (activeChapter && c.id === activeChapter.id) ||
                (tFolder && c.folderId === tFolder.id) ||
                (!c.originalContent && !c.translatedText)
            );
        }

        if (chapterSearch) {
            result = result.filter(c => c.originalTitle.toLowerCase().includes(chapterSearch.toLowerCase()));
        }
        const getNum = (s: string) => {
            const match = s.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        };
        if (sortType === 'alpha') {
            result.sort((a, b) => a.originalTitle.localeCompare(b.originalTitle));
        } else if (sortType === 'numeric') {
            result.sort((a, b) => getNum(a.originalTitle) - getNum(b.originalTitle));
        }
        return result;
    }, [chapters, chapterSearch, sortType, listTab, activeChapter, folders]);

    const groupedChapters = useMemo(() => {
        return {
            all: sortedChapters,
            folders: folders.map(folder => ({
                ...folder,
                items: sortedChapters.filter(c => c.folderId === folder.id)
            })),
            root: sortedChapters.filter(c => !c.folderId)
        };
    }, [folders, sortedChapters]);

    const navigateChapter = useCallback((direction: 'next' | 'prev') => {
        if (!activeChapter) return;
        const currentIndex = sortedChapters.findIndex(c => c.id === activeChapter.id);
        if (currentIndex === -1) return;

        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (nextIndex >= 0 && nextIndex < sortedChapters.length) {
            const nextChapter = sortedChapters[nextIndex];
            const originalIndex = chapters.findIndex(c => c.id === nextChapter.id);
            setActiveTabIndex(originalIndex);
            showToast(`تم الانتقال: ${cleanTitle(nextChapter.originalTitle)}`);
        }
    }, [activeChapter, sortedChapters, chapters, setActiveTabIndex]);

    const toggleLocalFolder = (id: string) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const handleCopyContent = async () => {
        if (cmEditor) {
            const content = cmEditor.getValue();
            if (content) {
                const success = await copyTextToClipboard(content);
                if (success) showToast('تم نسخ محتوى الفصل!');
            }
        }
    };

    useEffect(() => {
        const savedConfig = localStorage.getItem('zeusEditorConfig_v3');
        if (savedConfig) setConfig(JSON.parse(savedConfig));

        if (textareaRef.current && !cmEditor && window.CodeMirror) {
            const editor = window.CodeMirror.fromTextArea(textareaRef.current, {
                lineNumbers: false,
                direction: "rtl",
                lineWrapping: true,
                viewportMargin: Infinity,
                theme: 'default'
            });

            editor.on("change", (instance: any) => {
                const val = instance.getValue();
                setStats({ 
                    words: val.trim() ? val.trim().split(/\s+/).length : 0, 
                    lines: instance.lineCount() 
                });
                
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                
                saveTimeoutRef.current = setTimeout(() => {
                    const currentChapter = activeChapterRef.current;
                    if (currentChapter && currentChapter.translatedText !== val) {
                        updateTranslatedText(currentChapter.id, val);
                        showToast('تم الحفظ تلقائياً');
                    }
                }, 1000); 
            });
            setCmEditor(editor);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('zeusEditorConfig_v3', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        if (cmEditor && activeChapter) {
            localStorage.setItem('zeusLastActiveChapterId', activeChapter.id);
            const currentEditorContent = cmEditor.getValue();
            const newContent = activeChapter.translatedText || "";
            if (currentEditorContent !== newContent) {
                cmEditor.setValue(newContent);
                cmEditor.clearHistory(); 
                cmEditor.scrollTo(0, 0);
            }
        } else if (cmEditor && !activeChapter) {
            cmEditor.setValue("");
        }
    }, [activeChapter?.id, cmEditor]); 

    useEffect(() => {
        if (!config.navigationEnabled) return;
        let touchStartX = 0;
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };
        const handleTouchEnd = (e: TouchEvent) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            if (Math.abs(touchEndY - touchStartY) > 50) return;
            const diff = touchEndX - touchStartX;
            if (Math.abs(diff) > 80) {
                if (diff > 0) navigateChapter('prev');
                else navigateChapter('next');
            }
        };
        const container = document.getElementById('zeus-editor-container');
        if (container) {
            container.addEventListener('touchstart', handleTouchStart, { passive: true });
            container.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
        return () => {
            if (container) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [config.navigationEnabled, navigateChapter]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsOpen && settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setSettingsOpen(false);
            }
            if (searchOpen && searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [settingsOpen, searchOpen]);

    useEffect(() => {
        if (!config.navigationEnabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) {
                if (e.key === 'ArrowRight') navigateChapter('next');
                if (e.key === 'ArrowLeft') navigateChapter('prev');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [config.navigationEnabled, navigateChapter]);

    useEffect(() => {
        if (!cmEditor) return;
        
        const wrapper = cmEditor.getWrapperElement();
        wrapper.style.setProperty('--cm-font-family', config.fontFamily);
        wrapper.style.setProperty('--cm-font-size', `${config.fontSize}px`);
        wrapper.style.setProperty('--cm-line-height', config.lineHeight);
        document.documentElement.style.setProperty('--dialogue-color', config.dialogueColor);
        document.documentElement.style.setProperty('--markdown-size', `${config.markdownSize}%`);
        document.documentElement.style.setProperty('--dialogue-size', `${config.dialogueSize}%`);
        wrapper.classList.remove('theme-dark', 'theme-midnight', 'theme-ocean', 'theme-sepia');
        wrapper.classList.add(`theme-${config.theme}`);

        const timer = setTimeout(() => {
            cmEditor.refresh();
        }, 50); 

        return () => clearTimeout(timer);
    }, [config, cmEditor]);

    useEffect(() => {
        if (!cmEditor) return;
        
        const timer = setTimeout(() => {
            cmEditor.setOption("mode", "text/plain");
            cmEditor.addOverlay({
                token: (stream: any) => {
                    if (stream.match(/\[.*?\]/)) return "system-text";
                    while (stream.next() != null && !stream.match(/\[.*?\]/, false)) {}
                    return null;
                }
            });
            if (config.markdownEnabled) {
                const q = QUOTES_MAP[config.markdownQuote];
                cmEditor.addOverlay(createCustomOverlay('markdown', q[0], q[1], config.markdownHideQuotes));
            }
            if (config.dialogueEnabled) {
                const q = QUOTES_MAP[config.dialogueQuote];
                cmEditor.addOverlay(createCustomOverlay('dialogue', q[0], q[1], config.dialogueHideQuotes));
            }
        }, 10);

        return () => clearTimeout(timer);
    }, [config.markdownEnabled, config.markdownQuote, config.markdownHideQuotes, config.dialogueEnabled, config.dialogueQuote, config.dialogueHideQuotes, cmEditor]);

    const handleImportClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setPendingImportFiles(Array.from(files));
        setImportModalOpen(true);
        e.target.value = '';
    }

    const processImport = async (targetFolderId: string | undefined) => {
        if (!pendingImportFiles || pendingImportFiles.length === 0) return;
        setImportModalOpen(false);
        showToast('جاري الاستيراد إلى الوجهة المحددة...');

        const file = pendingImportFiles[0];
        if (!file) {
             showToast('حدث خطأ: الملف غير موجود.');
             return;
        }
        
        const targetFolder = folders.find(f => f.id === targetFolderId);
        const isSourceFolder = targetFolder?.name === 'المصدر';

        if (file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                const newChapters: any[] = [];
                zip.forEach((path, entry) => {
                    if (!entry.dir && entry.name.toLowerCase().endsWith('.txt')) {
                        const safeTitle = entry.name.split('/').pop() || entry.name;
                        newChapters.push(entry.async('string').then(text => ({
                            id: crypto.randomUUID(),
                            folderId: targetFolderId, 
                            originalTitle: safeTitle, 
                            translatedText: isSourceFolder ? '' : text,
                            originalContent: isSourceFolder ? text : '',
                            status: isSourceFolder ? 'idle' : 'completed'
                        })));
                    }
                });
                const loaded = await Promise.all(newChapters);
                if (loaded.length > 0) {
                    setChapters(prev => [...prev, ...loaded]);
                    showToast(`تم استيراد ${loaded.length} فصل!`);
                }
            } catch (err) {
                console.error(err);
                alert("فشل قراءة ملف ZIP.");
            }
        } else {
            const newChapters: any[] = [];
            const fileList = pendingImportFiles;
            for (const f of fileList) {
                const text = await f.text();
                const parsed = parseChaptersFromText(text);
                
                if (parsed.length > 1) {
                    const finalChapters = parsed.map(c => {
                        if (isSourceFolder) {
                            return { ...c, folderId: targetFolderId }; 
                        } else {
                            return {
                                ...c,
                                folderId: targetFolderId,
                                translatedText: c.originalContent, 
                                originalContent: '',
                                status: 'completed' as const
                            };
                        }
                    });
                    newChapters.push(...finalChapters);
                } else {
                    newChapters.push({
                        id: crypto.randomUUID(),
                        folderId: targetFolderId,
                        originalTitle: f.name,
                        translatedText: isSourceFolder ? '' : text,
                        originalContent: isSourceFolder ? text : '',
                        status: isSourceFolder ? 'idle' : 'completed'
                    });
                }
            }
            if (newChapters.length > 0) {
                setChapters(prev => [...prev, ...newChapters]);
                showToast(`تم استيراد ${newChapters.length} فصل!`);
            }
        }
        setPendingImportFiles(null);
    };

    const handleExport = async () => {
        const zip = new JSZip();
        chapters.forEach(c => {
            const content = c.translatedText || c.originalContent || "";
            if (content) zip.file(`${cleanTitle(c.originalTitle)}.txt`, content);
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, "Zeus_Export.zip");
        showToast('تم تصدير الملفات');
    };

    const confirmBulkDelete = () => {
        if (selectedFiles.size === 0) return;
        setConfirmModal({
            isOpen: true,
            title: 'حذف الفصول',
            message: `هل أنت متأكد من حذف ${selectedFiles.size} فصل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm: () => {
                setChapters(prev => {
                    const remaining = prev.filter(c => !selectedFiles.has(c.id));
                    if (activeChapter && selectedFiles.has(activeChapter.id)) {
                        setTimeout(() => {
                            if (remaining.length > 0) setActiveTabIndex(0);
                            else addNewChapter();
                        }, 50);
                    }
                    return remaining;
                });
                setSelectedFiles(new Set());
                setSelectionMode(false);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                showToast('تم الحذف بنجاح');
            }
        });
    };

    const confirmSingleDelete = (chapterId: string, title: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف الفصل',
            message: `هل أنت متأكد من حذف فصل "${cleanTitle(title)}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm: () => {
                removeChapter(chapterId);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                showToast('تم الحذف بنجاح');
            }
        });
    }

    const handleRenameChapter = (newName: string) => {
        if (renameModal.chapterId && newName.trim()) {
            updateChapter(renameModal.chapterId, 'originalTitle', newName);
            setRenameModal({ isOpen: false, chapterId: '', currentName: '' });
            showToast('تم تغيير الاسم');
        }
    };
    
    const handleMoveSelected = (folderId: string | undefined) => {
        if (selectedFiles.size === 0) return;
        moveChaptersToFolder(Array.from(selectedFiles), folderId);
        setSelectedFiles(new Set());
        setSelectionMode(false);
        showToast('تم نقل الفصول بنجاح');
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedFiles(newSet);
    };

    const selectAll = () => {
        if (selectedFiles.size === sortedChapters.length) setSelectedFiles(new Set());
        else setSelectedFiles(new Set(sortedChapters.map(c => c.id)));
    };

    const handleFindReplace = () => {
        if (!findText || !cmEditor) return;
        const cursor = cmEditor.getCursor();
        const text = cmEditor.getValue();
        try {
            const newText = text.replace(new RegExp(findText, 'g'), replaceText);
            cmEditor.setValue(newText);
            cmEditor.setCursor(cursor);
            localStorage.setItem('zeusFindText', findText);
            localStorage.setItem('zeusReplaceText', replaceText);
            showToast('تم الاستبدال');
        } catch (e) {
            showToast('خطأ في صيغة البحث (Regex)');
        }
    };

    const renderChapterRow = (c: any) => (
        <div 
            key={c.id} 
            onClick={() => {
                if (selectionMode) toggleSelection(c.id);
                else {
                    setActiveTabIndex(chapters.indexOf(c));
                    showToast(`تم الفتح: ${cleanTitle(c.originalTitle)}`);
                }
            }}
            className={`
                group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all duration-200 mb-1 relative
                ${activeChapter?.id === c.id ? 'bg-primary/10 border-primary/30 shadow-[inset_0_0_20px_rgba(var(--color-primary),0.1)]' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}
                ${selectedFiles.has(c.id) ? 'bg-white/5 border-white/10' : ''}
            `}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {selectionMode ? (
                    <div className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-all ${selectedFiles.has(c.id) ? 'bg-primary border-primary scale-110' : 'border-zinc-600'}`}>
                        {selectedFiles.has(c.id) && <CheckCircleIcon className="h-3 w-3 text-white" />}
                    </div>
                ) : (
                    <FileIcon className={`h-4 w-4 flex-shrink-0 transition-colors ${activeChapter?.id === c.id ? 'text-primary' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                )}
                <span className={`text-xs md:text-sm font-bold truncate ${activeChapter?.id === c.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{cleanTitle(c.originalTitle)}</span>
            </div>

            {!selectionMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm rounded-lg px-1 absolute left-2 top-1/2 -translate-y-1/2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setRenameModal({ isOpen: true, chapterId: c.id, currentName: c.originalTitle }); }}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        title="إعادة تسمية"
                    >
                        <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); confirmSingleDelete(c.id, c.originalTitle); }}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="حذف"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );

    const renderFolderSection = (
        id: string, 
        title: string, 
        items: any[], 
        isOpen: boolean, 
        onToggle: () => void,
        icon: React.ReactNode,
        isVirtual: boolean = false
    ) => (
        <div className="rounded-xl overflow-hidden border border-white/5 bg-black/20 mb-2 transition-all duration-300">
            <div 
                className={`
                    flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors group
                    ${isOpen ? 'bg-white/5' : ''}
                `}
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isOpen ? <ChevronDownIcon className="h-3 w-3 flex-shrink-0 text-zinc-500" /> : <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-zinc-500 rtl:rotate-180" />}
                    <div className={`${isVirtual ? 'text-secondary' : 'text-primary'} flex-shrink-0`}>{icon}</div>
                    <span className="text-xs md:text-sm font-bold text-zinc-300 truncate group-hover:text-white">{title}</span>
                    <span className="text-[9px] text-zinc-600 bg-white/5 px-1.5 rounded-full flex-shrink-0">{items.length}</span>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                    {id !== 'all' && (
                         <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                addNewChapter(id === 'uncategorized' ? undefined : id); 
                            }}
                            className="p-1 hover:bg-primary hover:text-white text-zinc-500 rounded-lg transition-colors" 
                            title="إضافة فصل هنا"
                        >
                            <PlusIcon className="h-3 w-3" />
                        </button>
                    )}
                    
                    {!isVirtual && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteFolder(id); }}
                            className="p-1 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-colors" 
                            title="حذف المجلد"
                        >
                            <TrashIcon className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>
            
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden bg-black/10`}
                style={{ maxHeight: isOpen ? '5000px' : '0px', opacity: isOpen ? 1 : 0 }}
            >
                <div className="border-r-2 border-white/5 mr-2 mb-1 space-y-0.5 pt-1 pb-1 pr-1">
                    {items.map(c => renderChapterRow(c))}
                    {items.length === 0 && (
                        <div className="text-[10px] text-zinc-700 p-2 text-center italic">لا توجد فصول</div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div id="zeus-editor-container" className={`zeus-editor-wrapper bg-[#09090b] flex flex-col relative transition-all duration-300 ${fullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
            <Toast message={toast.message} visible={toast.visible} />
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
            />
            <RenameModal 
                isOpen={renameModal.isOpen}
                currentName={renameModal.currentName}
                onSave={handleRenameChapter}
                onCancel={() => setRenameModal(p => ({ ...p, isOpen: false }))}
            />
            <ImportModal 
                isOpen={importModalOpen}
                onCancel={() => { setImportModalOpen(false); setPendingImportFiles(null); }}
                onConfirm={processImport}
                folders={folders}
            />

            <div className={`
                absolute top-6 left-0 right-0 z-40 flex justify-center pointer-events-none transition-all duration-500
                ${fullscreen ? 'opacity-0 hover:opacity-100 -translate-y-4 hover:translate-y-0' : 'translate-y-0'}
            `}>
                <div className="
                    pointer-events-auto mx-4 max-w-full overflow-x-auto scrollbar-none
                    bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl
                    flex items-center gap-1.5 p-2 ring-1 ring-white/5
                ">
                    <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 flex-shrink-0">
                        <ToolButton icon={<BookOpenIcon className="h-5 w-5" />} label="المكتبة" active={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
                        <ToolButton icon={<CopyIcon className="h-5 w-5" />} label="نسخ المحتوى" onClick={handleCopyContent} />
                        <ToolButton icon={<UndoIcon className="h-5 w-5" />} label="تراجع" onClick={() => cmEditor?.undo()} />
                        <ToolButton icon={<RedoIcon className="h-5 w-5" />} label="إعادة" onClick={() => cmEditor?.redo()} />
                        <ToolButton icon={<SearchIcon className="h-5 w-5" />} label="بحث" active={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setSettingsOpen(false); }} />
                        <ToolButton icon={<TypeIcon className="h-5 w-5" />} label="تنسيق" active={settingsOpen} onClick={() => { setSettingsOpen(!settingsOpen); setSearchOpen(false); }} />
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 flex-shrink-0">
                        <ToolButton icon={fullscreen ? <MinimizeIcon className="h-5 w-5" /> : <MaximizeIcon className="h-5 w-5" />} label="ملء الشاشة" onClick={() => setFullscreen(!fullscreen)} />
                        <ToolButton 
                            icon={<ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />} 
                            label="خروج" 
                            danger 
                            onClick={onExit}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden pt-24 pb-12">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 h-full relative z-0">
                    <textarea ref={textareaRef} className="hidden" />
                </div>
            </div>

            <div className="absolute bottom-0 w-full h-10 bg-zinc-900/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-6 text-[11px] text-zinc-500 font-mono select-none z-30">
                <div className="flex gap-6">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Words: {stats.words}</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Lines: {stats.lines}</span>
                </div>
                <div className="truncate max-w-[200px] text-zinc-400 font-bold">{cleanTitle(activeChapter?.originalTitle || 'No File')}</div>
            </div>

            {sidebarOpen && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)}></div>}
            
            <div ref={sidebarRef} className={`absolute inset-y-0 right-0 w-[85vw] max-w-[320px] md:max-w-[380px] bg-[#09090b] border-l border-white/10 transform transition-transform duration-300 z-50 flex flex-col shadow-2xl ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                    <h3 className="font-bold text-xl md:text-2xl text-white tracking-tight font-serif flex items-center gap-2">
                         <BookOpenIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                         المكتبة
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => setSelectionMode(!selectionMode)} className={`p-2 rounded-xl transition-colors ${selectionMode ? 'bg-primary text-white shadow-lg' : 'text-zinc-500 hover:bg-white/5'}`}><ListCheckIcon className="h-5 w-5" /></button>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl"><CloseIcon className="h-5 w-5" /></button>
                    </div>
                </div>
                
                <div className="p-3 md:p-5 border-b border-white/10 space-y-3 md:space-y-4 bg-black/20">
                    
                    {/* View Toggle Tabs */}
                    <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5 mb-2">
                        <button 
                            onClick={() => setListTab('translated')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${listTab === 'translated' ? 'bg-primary text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            فصول مترجمة
                        </button>
                        <button 
                            onClick={() => setListTab('english')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${listTab === 'english' ? 'bg-primary text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            فصول إنجليزية
                        </button>
                    </div>

                    <div className="relative">
                        <input 
                            value={chapterSearch}
                            onChange={(e) => setChapterSearch(e.target.value)}
                            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2.5 px-9 text-xs md:text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600" 
                            placeholder="بحث في المكتبة..." 
                        />
                        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setIsCreatingFolder(true)} className="flex items-center justify-center gap-2 py-2 md:py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all">
                            <FolderIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-secondary" /> مجلد جديد
                        </button>
                        <button onClick={handleNewChapter} className="flex items-center justify-center gap-2 py-2 md:py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all">
                            <PlusIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> فصل جديد
                        </button>
                    </div>
                    
                    {isCreatingFolder && (
                         <form onSubmit={handleCreateFolder} className="flex gap-2 animate-fade-in-down p-2 bg-zinc-900 rounded-xl border border-primary/30">
                            <input 
                                autoFocus
                                type="text" 
                                value={newFolderName} 
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder="اسم المجلد..."
                                className="flex-1 bg-transparent border-none text-xs md:text-sm text-white focus:outline-none placeholder:text-zinc-600 min-w-0"
                            />
                            <button type="submit" className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold flex-shrink-0">إنشاء</button>
                            <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-2 text-zinc-500 hover:text-white flex-shrink-0"><CloseIcon className="h-4 w-4" /></button>
                        </form>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div className="flex gap-1">
                            <button onClick={() => setSortType('numeric')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${sortType === 'numeric' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-zinc-600 hover:text-zinc-400'}`}>123</button>
                            <button onClick={() => setSortType('alpha')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${sortType === 'alpha' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-zinc-600 hover:text-zinc-400'}`}>ABC</button>
                        </div>
                        {selectionMode && (
                            <div className="flex gap-2 md:gap-3 items-center animate-fade-in">
                                <button onClick={selectAll} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">الكل</button>
                                <button onClick={confirmBulkDelete} disabled={selectedFiles.size === 0} className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors bg-red-500/10 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-red-500/20">حذف ({selectedFiles.size})</button>
                            </div>
                        )}
                    </div>

                    {selectionMode && selectedFiles.size > 0 && (
                        <div className="pt-2 animate-fade-in-down">
                            <label className="text-[10px] text-zinc-500 mb-2 block font-bold uppercase tracking-wider">نقل المحدد إلى:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleMoveSelected(undefined)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 truncate border border-white/5 transition-colors">
                                    الرئيسية
                                </button>
                                {folders.map(f => (
                                    <button key={f.id} onClick={() => handleMoveSelected(f.id)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 truncate border border-white/5 transition-colors text-right min-w-0">
                                        📁 {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                    {renderFolderSection(
                        'all', 
                        'جميع الفصول', 
                        groupedChapters.all, 
                        expandedFolders['all'], 
                        () => toggleLocalFolder('all'),
                        <BookOpenIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />,
                        true
                    )}

                    {groupedChapters.folders.map(folder => (
                        renderFolderSection(
                            folder.id, 
                            folder.name, 
                            folder.items, 
                            expandedFolders[folder.id] || false,
                            () => toggleLocalFolder(folder.id),
                            <FolderOpenIcon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${folder.name === 'المصدر' ? 'text-blue-400' : folder.name === 'المترجمة' ? 'text-green-400' : ''}`} />
                        )
                    ))}

                    {groupedChapters.root.length > 0 && renderFolderSection(
                        'uncategorized', 
                        'غير مصنف', 
                        groupedChapters.root, 
                        expandedFolders['uncategorized'], 
                        () => toggleLocalFolder('uncategorized'),
                        <FileIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />,
                        true
                    )}
                </div>

                <div className="p-3 md:p-5 border-t border-white/10 grid grid-cols-2 gap-3 bg-zinc-900/80 backdrop-blur">
                    <label className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all text-xs font-bold text-zinc-300 shadow-sm hover:shadow-md">
                        <UploadIcon className="h-4 w-4" /> استيراد
                        <input type="file" className="hidden" multiple onChange={handleImportClick} accept=".txt,.zip" />
                    </label>
                    <button onClick={handleExport} className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-bold text-zinc-300 shadow-sm hover:shadow-md">
                        <DownloadIcon className="h-4 w-4" /> تصدير ZIP
                    </button>
                </div>
            </div>

            {settingsOpen && (
                <div ref={settingsRef} className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-[#09090b]/95 backdrop-blur-3xl border border-white/10 rounded-b-[32px] md:rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-50 animate-fade-in-down overflow-hidden ring-1 ring-white/10 max-h-[85vh] flex flex-col mx-2 md:mx-0">
                    <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5 flex-shrink-0">
                        <div>
                            <h3 className="font-bold text-2xl md:text-3xl text-white tracking-tight font-serif mb-1">إعدادات المحرر</h3>
                            <p className="text-zinc-400 text-sm">تخصيص تجربة القراءة والكتابة</p>
                        </div>
                        <button onClick={() => setSettingsOpen(false)} className="p-3 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"><CloseIcon className="h-6 w-6" /></button>
                    </div>
                    
                    <div className="p-4 md:p-8 space-y-8 overflow-y-auto scrollbar-thin flex-1">
                        <div className="space-y-4">
                             <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <NavIcon className="h-4 w-4 text-primary" /> تفعيل التنقل السريع
                                </h4>
                                <button onClick={() => setConfig(p => ({...p, navigationEnabled: !p.navigationEnabled}))} className={`text-xs px-4 py-1.5 rounded-full font-bold border transition-all ${config.navigationEnabled ? 'bg-primary text-white border-primary' : 'bg-transparent border-white/20 text-zinc-500'}`}>
                                    {config.navigationEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            {config.navigationEnabled && (
                                <p className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl leading-relaxed">
                                    يمكنك الآن التنقل بين الفصول باستخدام: <br/>
                                    • لوحة المفاتيح: <b>Alt + سهم يمين/يسار</b><br/>
                                    • اللمس: <b>سحب الشاشة يمين/يسار</b>
                                </p>
                            )}
                        </div>
                        
                        <div className="w-full h-[1px] bg-white/10"></div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                                <span className="w-8 h-[1px] bg-primary/50"></span> الخطوط والنص
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-400">نوع الخط</label>
                                    <div className="relative">
                                        <select 
                                            value={config.fontFamily} 
                                            onChange={e => setConfig(p => ({...p, fontFamily: e.target.value}))}
                                            className="w-full bg-zinc-900/50 p-3 md:p-4 rounded-2xl border border-white/10 text-sm text-zinc-200 outline-none focus:border-primary/50 transition-colors appearance-none font-bold"
                                        >
                                            {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-400">ارتفاع السطر ({config.lineHeight})</label>
                                    <div className="flex items-center gap-4 bg-zinc-900/50 p-2 pr-4 rounded-2xl border border-white/10 h-[50px] md:h-[54px]">
                                        <input type="range" min="1.2" max="2.5" step="0.1" value={config.lineHeight} onChange={e => setConfig(p => ({...p, lineHeight: Number(e.target.value)}))} className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-3">
                                    <label className="text-xs font-bold text-zinc-400">حجم الخط الرئيسي ({config.fontSize}px)</label>
                                    <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/10">
                                        <span className="text-sm font-bold text-zinc-500">A</span>
                                        <input type="range" min="14" max="36" value={config.fontSize} onChange={e => setConfig(p => ({...p, fontSize: Number(e.target.value)}))} className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                        <span className="text-xl font-bold text-white">A</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-emerald-500/50"></span> تنسيق الحوار
                                </h4>
                                <button onClick={() => setConfig(p => ({...p, dialogueEnabled: !p.dialogueEnabled}))} className={`text-xs px-4 py-1.5 rounded-full font-bold border transition-all ${config.dialogueEnabled ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent border-white/20 text-zinc-500'}`}>
                                    {config.dialogueEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {config.dialogueEnabled && (
                                <div className="bg-zinc-900/30 p-4 md:p-6 rounded-3xl border border-white/5 space-y-6 animate-fade-in">
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                        {Object.keys(QUOTES_MAP).map(q => (
                                            <button key={q} onClick={() => setConfig(p => ({...p, dialogueQuote: q}))} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold border transition-all whitespace-nowrap shadow-sm ${config.dialogueQuote === q ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
                                                {QUOTES_MAP[q][0]}نص{QUOTES_MAP[q][1]}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-3 justify-between">
                                        {COLORS.map(c => (
                                            <button key={c.value} onClick={() => setConfig(p => ({...p, dialogueColor: c.value}))} className={`w-8 h-8 rounded-full border-2 transition-transform shadow-lg ${config.dialogueColor === c.value ? 'border-white scale-110 ring-2 ring-white/20' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c.value }} />
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                         <div className="flex justify-between">
                                            <label className="text-xs font-bold text-zinc-500">حجم الحوار</label>
                                            <span className="text-xs font-mono text-emerald-400">{config.dialogueSize}%</span>
                                         </div>
                                         <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-white/5">
                                            <input type="range" min="80" max="150" step="5" value={config.dialogueSize} onChange={e => setConfig(p => ({...p, dialogueSize: Number(e.target.value)}))} className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                         </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-zinc-900 rounded-2xl border border-white/5">
                                        <span className="text-xs text-zinc-400 font-bold ml-2">إخفاء علامات التنسيق (مثل «»)</span>
                                         <button onClick={() => setConfig(p => ({...p, dialogueHideQuotes: !p.dialogueHideQuotes}))} className={`w-12 h-7 rounded-full transition-colors relative shadow-inner ${config.dialogueHideQuotes ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                                            <span className={`absolute top-1 left-1 w-5 h-5 bg-black rounded-full transition-transform shadow-md ${config.dialogueHideQuotes ? 'translate-x-5' : ''}`}></span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                         <div className="space-y-4 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-white/50"></span> الخط العريض (Bold)
                                </h4>
                                <button onClick={() => setConfig(p => ({...p, markdownEnabled: !p.markdownEnabled}))} className={`text-xs px-4 py-1.5 rounded-full font-bold border transition-all ${config.markdownEnabled ? 'bg-white text-black border-white' : 'bg-transparent border-white/20 text-zinc-500'}`}>
                                    {config.markdownEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {config.markdownEnabled && (
                                <div className="bg-zinc-900/30 p-4 md:p-6 rounded-3xl border border-white/5 space-y-6 animate-fade-in">
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                        {Object.keys(QUOTES_MAP).map(q => (
                                            <button key={q} onClick={() => setConfig(p => ({...p, markdownQuote: q}))} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-bold border transition-all whitespace-nowrap shadow-sm ${config.markdownQuote === q ? 'bg-white/20 text-white border-white/50' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
                                                {QUOTES_MAP[q][0]}نص{QUOTES_MAP[q][1]}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                         <div className="flex justify-between">
                                            <label className="text-xs font-bold text-zinc-500">حجم الخط العريض</label>
                                            <span className="text-xs font-mono text-white">{config.markdownSize}%</span>
                                         </div>
                                         <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-2xl border border-white/5">
                                            <input type="range" min="80" max="150" step="5" value={config.markdownSize} onChange={e => setConfig(p => ({...p, markdownSize: Number(e.target.value)}))} className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white" />
                                         </div>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-zinc-900 rounded-2xl border border-white/5">
                                        <span className="text-xs text-zinc-400 font-bold ml-2">إخفاء علامات التنسيق (مثل **)</span>
                                         <button onClick={() => setConfig(p => ({...p, markdownHideQuotes: !p.markdownHideQuotes}))} className={`w-12 h-7 rounded-full transition-colors relative shadow-inner ${config.markdownHideQuotes ? 'bg-white' : 'bg-zinc-700'}`}>
                                            <span className={`absolute top-1 left-1 w-5 h-5 bg-black rounded-full transition-transform shadow-md ${config.markdownHideQuotes ? 'translate-x-5' : ''}`}></span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {searchOpen && (
                <div ref={searchRef} className="absolute top-24 left-1/2 -translate-x-1/2 w-96 max-w-[90vw] bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-fade-in-down ring-1 ring-white/5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><SearchIcon className="h-4 w-4 text-primary" /> بحث واستبدال</h3>
                    <div className="space-y-3">
                        <div className="relative">
                            <input 
                                value={findText}
                                onChange={e => setFindText(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none text-white placeholder:text-zinc-600" 
                                placeholder="بحث عن..." 
                            />
                        </div>
                        <div className="flex justify-center text-zinc-600"><ArrowRightIcon className="h-4 w-4 rotate-90" /></div>
                        <div className="relative">
                            <input 
                                value={replaceText}
                                onChange={e => setReplaceText(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none text-white placeholder:text-zinc-600" 
                                placeholder="استبدال بـ..." 
                            />
                        </div>
                    </div>
                    <button onClick={handleFindReplace} className="w-full mt-6 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-primary/20 transition-all active:scale-95">استبدال الكل</button>
                </div>
            )}

            <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-thin::-webkit-scrollbar { width: 4px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translate(-50%, -10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};
