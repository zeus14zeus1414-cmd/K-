
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from './contexts/AppContext';
import { ChapterInputCard } from './components/ChapterInputCard';
import { TranslationOutput } from './components/TranslationOutput';
import { DailyUsageTracker } from './components/DailyUsageTracker';
import { SessionTimer } from './components/SessionTimer';
import { ArchiveManager } from './components/ArchiveManager';
import { NotificationPanel } from './components/NotificationPanel';
import { SettingsView } from './components/SettingsModal'; 
import { ChangelogPage } from './components/ChangelogPage';
import { ChapterList } from './components/ChapterList';
import { DevPanel } from './components/DevPanel';
import { CodexManager } from './components/CodexManager';
import { TerminologyManager } from './components/TerminologyManager';
import { ZeusEditor } from './components/ZeusEditor'; 
import { AdvancedTranslator } from './components/AdvancedTranslator'; 
import { BatchTranslator } from './components/BatchTranslator'; 
import { 
    ArrowRightIcon, SettingsIcon, ZeusLogoIcon, ArchiveIcon, 
    CloseIcon, FileIcon, MaximizeIcon, MinimizeIcon, BookIcon, 
    BookOpenIcon, HomeIcon, TranslateIcon, EditIcon, SparklesIcon,
    StackIcon
} from './components/Icons';

type AppView = 'home' | 'translator' | 'editor' | 'codex' | 'settings' | 'terminology' | 'archive' | 'changelog' | 'advanced' | 'batch';

const App: React.FC = () => {
    const {
        chapters,
        archivedChapters,
        activeChapter,
        setActiveTabIndex,
        isLoading,
        notifications,
        removeNotification,
        translationProgress,
        handleStartTranslation,
        handleFileImport,
        activeTabIndex,
        
        books,
        activeBookId,
        setActiveBookId,
        createBook,
        deleteBook,
        addEntry,
        removeEntry,
        analyzeChapter, 
        selectedModel,
        isAnalyzing,
        
        terms,
        addTerm,
        removeTerm,
        importTerms
    } = useAppContext();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentView, setCurrentView] = useState<AppView>('home');
    const [showDevPanel, setShowDevPanel] = useState(false);
    const [headerClicks, setHeaderClicks] = useState(0);
    const [zenMode, setZenMode] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (headerClicks >= 7) {
            setShowDevPanel(true);
            setHeaderClicks(0);
        }
    }, [headerClicks]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (currentView === 'home' || currentView === 'editor' || currentView === 'advanced' || currentView === 'batch') return; 

            if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                if (activeTabIndex < chapters.length - 1) setActiveTabIndex(activeTabIndex + 1);
            }
            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeTabIndex > 0) setActiveTabIndex(activeTabIndex - 1);
            }
            if (e.altKey && e.key === 'z') {
                e.preventDefault();
                setZenMode(prev => !prev);
            }
            if (e.ctrlKey && e.key === 'Enter' && currentView === 'translator') {
                const readyCount = chapters.filter(c => (c.originalContent || '').trim() && (c.status === 'idle' || c.status === 'failed')).length;
                if (readyCount > 0 && !isLoading) {
                    e.preventDefault();
                    handleStartTranslation();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTabIndex, chapters.length, setActiveTabIndex, isLoading, handleStartTranslation, chapters, currentView]);
    
    const handleHeaderClick = () => {
        setHeaderClicks(c => c + 1);
        setTimeout(() => setHeaderClicks(0), 2000);
    };

    const readyCount = chapters.filter(c => (c.originalContent || '').trim() && (c.status === 'idle' || c.status === 'failed')).length;
    const hasContentToTranslate = readyCount > 0;

    const DashboardCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; colorClass: string; onClick: () => void }> = ({ title, desc, icon, colorClass, onClick }) => (
        <div 
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-3xl p-6 cursor-pointer border border-white/5 bg-dark-card/40 hover:bg-dark-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
                ${colorClass}
            `}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150 group-hover:scale-125 duration-500">
                {icon}
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="mb-4 text-white/90 group-hover:text-white transition-colors">
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "h-10 w-10 mb-4" })}
                    <h3 className="text-2xl font-bold mb-2">{title}</h3>
                    <p className="text-sm text-white/50 group-hover:text-white/70 leading-relaxed max-w-[80%]">{desc}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                    <span>فتح الأداة</span>
                    <ArrowRightIcon className="h-3 w-3 rtl:rotate-180" />
                </div>
            </div>
        </div>
    );

    const renderHome = () => (
        <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8 animate-fade-in-down">
            <div className="text-center mb-12">
                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-6 shadow-[0_0_40px_rgba(var(--color-primary),0.2)]">
                    <ZeusLogoIcon className="h-20 w-20 text-primary drop-shadow-lg" />
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
                    ZEUS <span className="text-primary">Translator</span>
                </h1>
                <p className="text-lg text-dark-text/50 max-w-2xl mx-auto">
                    محرك ترجمة احترافي مدعوم بالذكاء الاصطناعي. صُمم خصيصاً لترجمة الروايات بسياق عميق وأدوات تحرير متقدمة.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
                <DashboardCard 
                    title="مترجم زيوس المتقدم" 
                    desc="أداة الترجمة المتكاملة الجديدة. تصميم ذهبي فاخر، ترجمة متدفقة، وتحكم كامل في محرك الذكاء الاصطناعي."
                    icon={<SparklesIcon />}
                    colorClass="hover:border-[#d4af37]/50 hover:shadow-[#d4af37]/20 border border-[#d4af37]/20 bg-[#d4af37]/5"
                    onClick={() => setCurrentView('advanced')}
                />

                <DashboardCard 
                    title="الترجمة الجماعية" 
                    desc="ترجمة مجلدات كاملة دفعة واحدة. دعم التكرار التلقائي، وقت الانتظار، واستخراج المصطلحات."
                    icon={<StackIcon />}
                    colorClass="hover:border-green-500/50 hover:shadow-green-500/10 border border-green-500/20 bg-green-500/5"
                    onClick={() => setCurrentView('batch')}
                />

                <DashboardCard 
                    title="المترجم السريع" 
                    desc="واجهة الترجمة الكلاسيكية. تدعم تقسيم الفصول، النماذج المتعددة، والتنقية التلقائية."
                    icon={<TranslateIcon />}
                    colorClass="hover:border-primary/50 hover:shadow-primary/10"
                    onClick={() => setCurrentView('translator')}
                />
                
                <DashboardCard 
                    title="محرر زيوس (Editor)" 
                    desc="محرر الفصول المتكامل. تجربة كتابة غامرة مع أدوات تنسيق متقدمة، وضع ملء الشاشة، والبحث والاستبدال السريع."
                    icon={<EditIcon />}
                    colorClass="hover:border-green-500/50 hover:shadow-green-500/10"
                    onClick={() => setCurrentView('editor')}
                />

                <DashboardCard 
                    title="الكودكس (الذاكرة)" 
                    desc="إدارة ذاكرة القصة. أضف الشخصيات، الأماكن، والمصطلحات ليتم استخدامها تلقائياً أثناء الترجمة."
                    icon={<BookIcon />}
                    colorClass="hover:border-purple-500/50 hover:shadow-purple-500/10"
                    onClick={() => setCurrentView('codex')}
                />

                <DashboardCard 
                    title="القاموس العام" 
                    desc="قاعدة بيانات للمصطلحات الثابتة التي يجب تطبيقها في كل المشاريع."
                    icon={<BookOpenIcon />}
                    colorClass="hover:border-orange-500/50 hover:shadow-orange-500/10"
                    onClick={() => setCurrentView('terminology')} 
                />

                <DashboardCard 
                    title="المحفوظات" 
                    desc="الوصول إلى الفصول المترجمة سابقاً وتصديرها كملفات Word أو Zip."
                    icon={<ArchiveIcon />}
                    colorClass="hover:border-blue-500/50 hover:shadow-blue-500/10"
                    onClick={() => setCurrentView('archive')}
                />

                <DashboardCard 
                    title="الإعدادات" 
                    desc="تخصيص المفاتيح (API Keys)، المظهر، وتعليمات النظام (System Prompt)."
                    icon={<SettingsIcon />}
                    colorClass="hover:border-gray-500/50 hover:shadow-gray-500/10"
                    onClick={() => setCurrentView('settings')}
                />
            </div>
            
            <div className="mt-12 text-center text-xs text-dark-text/30 font-mono">
                v4.6 - ZEUS Core Engine
            </div>
        </div>
    );

    const getViewTitle = () => {
        switch(currentView) {
            case 'translator': return 'Translator';
            case 'advanced': return 'Advanced Zeus';
            case 'batch': return 'Batch Translator'; 
            case 'editor': return 'Zeus Editor';
            case 'codex': return 'Codex';
            case 'settings': return 'Settings';
            case 'terminology': return 'Terminology';
            case 'archive': return 'Archive';
            case 'changelog': return 'Changelog';
            default: return '';
        }
    };

    // --- FULLSCREEN VIEWS ---

    if (currentView === 'editor') {
        return (
            <div className="h-screen w-screen overflow-hidden">
                <ZeusEditor onExit={() => setCurrentView('home')} />
            </div>
        );
    }

    if (currentView === 'advanced') {
        return (
            <div className="h-screen w-screen overflow-hidden bg-[#050505]">
                <div className="absolute top-4 right-4 z-50">
                    <button 
                        onClick={() => setCurrentView('home')} 
                        className="bg-black/50 backdrop-blur-md p-3 rounded-full text-white/50 hover:text-white border border-white/10 hover:border-[#d4af37]/50 transition-all shadow-lg"
                        title="خروج"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                <AdvancedTranslator />
            </div>
        );
    }

    // --- MAIN RENDER ---
    return (
        <>
            {/* Always mounted Batch Translator (Background Process) */}
            <div className={`fixed inset-0 z-50 bg-[#050505] transition-opacity duration-300 ${currentView === 'batch' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Close Button specifically for Batch View */}
                <div className="absolute top-4 right-4 z-[60]">
                    <button 
                        onClick={() => setCurrentView('home')} 
                        className="bg-black/50 backdrop-blur-md p-3 rounded-full text-white/50 hover:text-white border border-white/10 hover:border-[#d4af37]/50 transition-all shadow-lg"
                        title="خروج (الترجمة ستستمر)"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                <BatchTranslator />
            </div>

            {/* Main Application Layout (Hidden when Batch/Editor/Advanced is active) */}
            <div className={`h-screen w-screen bg-mesh text-dark-text font-sans flex flex-col overflow-hidden selection:bg-primary/30 selection:text-white transition-all duration-500 ${currentView === 'batch' ? 'hidden' : 'block'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".txt,.docx,.json" />
                <NotificationPanel notifications={notifications} onDismiss={removeNotification} />
                <DevPanel isOpen={showDevPanel} onClose={() => setShowDevPanel(false)} />
                
                <header className={`flex-shrink-0 glass border-b border-white/10 z-40 transition-all duration-300 ${zenMode && currentView !== 'home' ? '-mt-16 opacity-0' : 'h-16 opacity-100'}`}>
                    <div className="h-full px-3 md:px-4 flex items-center justify-between max-w-screen-2xl mx-auto">
                        <div className="flex items-center gap-3">
                            {(currentView === 'translator') && (
                                <button 
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="lg:hidden p-2 -ml-2 text-dark-text/70 hover:text-primary transition-colors"
                                >
                                    <FileIcon className="h-6 w-6" />
                                </button>
                            )}

                            <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={currentView === 'home' ? handleHeaderClick : () => setCurrentView('home')}>
                                <ZeusLogoIcon className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:text-primary-dark transition-colors drop-shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" />
                                <div className="flex flex-col">
                                    <h1 className="text-base md:text-lg font-bold latin-text leading-none tracking-tight text-white group-hover:text-primary transition-colors">ZEUS</h1>
                                    {currentView !== 'home' && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <HomeIcon className="h-3 w-3 text-dark-text/50" />
                                            <span className="text-[10px] md:text-[10px] text-dark-text/50 font-bold uppercase tracking-wider">
                                                {getViewTitle()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-3">
                           <SessionTimer />
                           <DailyUsageTracker />
                           
                           {currentView !== 'home' && (
                               <>
                                   <div className="h-5 w-px bg-white/10 mx-1 md:mx-2"></div>
                                   <button 
                                        onClick={() => setCurrentView('home')} 
                                        className="p-2 rounded-lg hover:bg-white/5 text-dark-text/70 hover:text-primary transition-all hidden md:flex items-center gap-2" 
                                        title="الرئيسية"
                                    >
                                        <HomeIcon className="h-5 w-5"/>
                                    </button>
                                   <button 
                                        onClick={() => setZenMode(true)} 
                                        className="p-2 rounded-lg hover:bg-white/5 text-dark-text/70 hover:text-primary transition-all hidden lg:block" 
                                        title="وضع التركيز (Alt+Z)"
                                    >
                                        <MaximizeIcon className="h-5 w-5"/>
                                    </button>
                               </>
                           )}
                        </div>
                    </div>
                </header>
                
                {currentView === 'home' ? (
                    <div className="flex-grow overflow-y-auto scrollbar-thin">
                        {renderHome()}
                    </div>
                ) : (
                    <main className="flex-grow flex overflow-hidden relative max-w-screen-2xl mx-auto w-full">
                        {(currentView === 'translator') && (
                            <>
                                <aside className={`hidden lg:flex flex-col border-l border-white/10 bg-dark-bg/50 backdrop-blur-sm z-10 transition-all duration-300 ${zenMode ? '-ml-[280px] w-0 opacity-0' : 'w-[280px] opacity-100'}`}>
                                    <ChapterList onImportChapters={() => fileInputRef.current?.click()} />
                                </aside>

                                <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                                    <div className={`absolute top-0 bottom-0 right-0 w-[85vw] max-w-[320px] bg-dark-bg border-l border-white/10 shadow-2xl transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                                            <h2 className="font-bold text-lg">ملفات الفصول</h2>
                                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><CloseIcon className="h-5 w-5" /></button>
                                        </div>
                                        <div className="h-full overflow-hidden">
                                            <ChapterList onImportChapters={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <section className="flex-grow flex flex-col min-w-0 relative transition-all duration-300">
                            {zenMode && (
                                 <button 
                                    onClick={() => setZenMode(false)}
                                    className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-md border border-white/10 text-white/50 hover:text-white hover:bg-primary/20 p-2 rounded-full transition-all shadow-xl hover:scale-110"
                                    title="خروج من وضع التركيز"
                                >
                                    <MinimizeIcon className="h-5 w-5" />
                                </button>
                            )}

                            <div className="flex-grow relative overflow-hidden">
                                {currentView === 'codex' && (
                                    <div className="h-full w-full p-4">
                                        <CodexManager 
                                            books={books}
                                            activeBookId={activeBookId}
                                            onSetActiveBook={setActiveBookId}
                                            onCreateBook={createBook}
                                            onDeleteBook={deleteBook}
                                            entries={books.find(b => b.id === activeBookId)?.entries || []} 
                                            onAddEntry={addEntry} 
                                            onRemoveEntry={removeEntry} 
                                            onExtract={analyzeChapter} 
                                            activeChapter={activeChapter} 
                                            selectedModel={selectedModel} 
                                            isExtracting={isAnalyzing} 
                                        />
                                    </div>
                                )}

                                {currentView === 'settings' && (
                                    <div className="h-full w-full p-4 md:p-8 overflow-hidden">
                                        <SettingsView onShowChangelog={() => setCurrentView('changelog')} />
                                    </div>
                                )}

                                {currentView === 'terminology' && (
                                    <div className="h-full w-full p-4 md:p-8">
                                        <div className="h-full w-full bg-dark-bg/30 rounded-2xl border border-dark-border shadow-2xl p-6">
                                            <TerminologyManager terms={terms} onAddTerm={addTerm} onRemoveTerm={removeTerm} importTerms={importTerms} />
                                        </div>
                                    </div>
                                )}

                                {currentView === 'archive' && (
                                    <div className="h-full w-full p-4 md:p-8">
                                        <ArchiveManager chapters={archivedChapters} />
                                    </div>
                                )}

                                {currentView === 'changelog' && (
                                    <div className="h-full w-full p-4 md:p-8 overflow-y-auto">
                                        <ChangelogPage />
                                    </div>
                                )}

                                {currentView === 'translator' && (
                                    activeChapter ? (
                                        <div className="absolute inset-0 flex">
                                            <>
                                                <div className="flex-1 h-full overflow-hidden border-l border-white/5 bg-dark-bg/30 flex flex-col w-1/2">
                                                    <ChapterInputCard />
                                                </div>
                                                <div className="flex-1 h-full overflow-hidden bg-black/20 flex flex-col w-1/2">
                                                    <TranslationOutput />
                                                </div>
                                            </>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                                            <div>
                                                <div className="h-28 w-28 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10 shadow-[0_0_50px_rgba(var(--color-primary),0.1)]">
                                                    <ZeusLogoIcon className="h-14 w-14 text-primary" />
                                                </div>
                                                <h3 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">مساحة العمل جاهزة</h3>
                                                <p className="text-dark-text/50 mb-8 max-w-md mx-auto leading-relaxed">
                                                    اختر فصلاً من القائمة الجانبية أو قم باستيراد ملف نصي لبدء العمل.
                                                </p>
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()} 
                                                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white hover:brightness-110 font-bold transition shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                                                >
                                                    استيراد ملف جديد
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>
                    </main>
                )}

                {currentView === 'translator' && activeChapter && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full max-w-[90%] md:max-w-lg px-2">
                         <div className="bg-dark-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-2 pl-3 flex items-center gap-4 pointer-events-auto transition-all hover:scale-[1.01] hover:border-primary/30 ring-1 ring-white/5">
                            <div className="flex-grow min-w-0 flex flex-col justify-center">
                                {isLoading ? (
                                    <div className="w-full pr-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-primary font-bold animate-pulse">جاري الترجمة...</span>
                                            <span className="text-primary font-mono">{Math.round(translationProgress)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" style={{ width: `${translationProgress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs font-bold text-white">الإجراءات</p>
                                        <p className="text-[10px] text-dark-text/50 truncate">
                                            {hasContentToTranslate ? `${readyCount} فصل جاهز للمعالجة` : 'لا يوجد محتوى جديد'}
                                        </p>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={handleStartTranslation}
                                disabled={!hasContentToTranslate || isLoading}
                                className={`
                                    h-10 px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap
                                    ${isLoading 
                                        ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                        : !hasContentToTranslate
                                            ? 'bg-white/5 text-white/40'
                                            : 'bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white shadow-lg shadow-primary/25 active:scale-95'
                                    }
                                `}
                                title="اختصار: Ctrl + Enter"
                            >
                                <span>ترجمة</span>
                                {!isLoading && <ArrowRightIcon className="h-3.5 w-3.5 rtl:rotate-180" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default App;
