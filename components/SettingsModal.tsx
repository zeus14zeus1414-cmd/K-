
import React, { useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { SystemPromptUploader } from './SystemPromptUploader';
import { ApiKeyManager } from './ApiKeyManager';
import { CerebrasApiKeyManager } from './CerebrasApiKeyManager';
import { GptOssApiKeyManager } from './GptOssApiKeyManager';
import { useAppContext } from '../contexts/AppContext';
import { BrainIcon, SunIcon, ArrowRightIcon, ArrowsRightLeftIcon, KeyIcon, FileTextIcon, TrashIcon } from './Icons';
import { AppTheme } from '../types';
import { DEFAULT_EXTRACTION_PROMPT } from '../constants';

// Extended Theme Definitions
const THEMES: AppTheme[] = [
    { id: 'zeus-gold', name: 'ZEUS (Default)', primary: '212 175 55', secondary: '250 204 21', previewColor: '#d4af37' },
    { id: 'shadow-labs', name: 'Abyssal Legacy', primary: '139 92 246', secondary: '236 72 153', previewColor: '#8b5cf6' },
    { id: 'ocean-depths', name: 'Ocean Depths', primary: '14 165 233', secondary: '99 102 241', previewColor: '#0ea5e9' },
    { id: 'neon-forest', name: 'Neon Forest', primary: '16 185 129', secondary: '132 204 22', previewColor: '#10b981' },
    { id: 'solar-flare', name: 'Solar Flare', primary: '245 158 11', secondary: '234 88 12', previewColor: '#f59e0b' },
    { id: 'cyber-rose', name: 'Cyber Rose', primary: '244 63 94', secondary: '139 92 246', previewColor: '#f43f5e' },
    { id: 'royal-blood', name: 'Royal Blood', primary: '217 70 239', secondary: '79 70 229', previewColor: '#d946ef' },
    { id: 'monochrome', name: 'Monochrome', primary: '228 228 231', secondary: '113 113 122', previewColor: '#e4e4e7' },
    { id: 'midnight-purple', name: 'Midnight Purple', primary: '88 28 135', secondary: '192 38 211', previewColor: '#581c87' },
    { id: 'mint-chip', name: 'Mint Chip', primary: '52 211 153', secondary: '59 130 246', previewColor: '#34d399' },
    { id: 'crimson-tide', name: 'Crimson Tide', primary: '220 38 38', secondary: '251 146 60', previewColor: '#dc2626' },
    { id: 'deep-space', name: 'Deep Space', primary: '99 102 241', secondary: '168 85 247', previewColor: '#6366f1' },
];

// Helper: Convert "R G B" string to Hex "#RRGGBB"
const rgbToHex = (rgbStr: string): string => {
    const [r, g, b] = rgbStr.split(' ').map(Number);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Helper: Convert Hex "#RRGGBB" to "R G B" string
const hexToRgb = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
};

const ThemeSelector: React.FC = () => {
    const { currentTheme, setTheme, swapThemeColors } = useAppContext();
    const [isCustomMode, setIsCustomMode] = useState(currentTheme.id === 'custom');

    // Initialization for inputs
    const [customPrimary, setCustomPrimary] = useState(rgbToHex(currentTheme.primary));
    const [customSecondary, setCustomSecondary] = useState(rgbToHex(currentTheme.secondary));

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const theme = THEMES.find(t => t.id === selectedId);
        if (theme) {
            setIsCustomMode(false);
            setTheme(theme);
            setCustomPrimary(rgbToHex(theme.primary));
            setCustomSecondary(rgbToHex(theme.secondary));
        }
    };

    const applyCustomTheme = (newPrimaryHex: string, newSecondaryHex: string) => {
        setTheme({
            id: 'custom',
            name: 'Custom',
            primary: hexToRgb(newPrimaryHex),
            secondary: hexToRgb(newSecondaryHex),
            previewColor: newPrimaryHex
        });
        setIsCustomMode(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <SunIcon className="h-5 w-5" />
                    تخصيص المظهر
                </h3>
                <button 
                    onClick={swapThemeColors}
                    className="flex items-center gap-2 px-3 py-1.5 bg-dark-card border border-dark-border hover:bg-white/5 rounded-lg text-xs font-bold transition-all text-dark-text/80 hover:text-primary active:scale-95"
                    title="عكس الألوان الحالية (الأساسي ↔ الثانوي)"
                >
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span>عكس الألوان</span>
                </button>
            </div>

            {/* Dropdown for Presets */}
            <div className="bg-dark-card/50 p-4 rounded-xl border border-dark-border">
                <label className="text-sm font-semibold text-dark-text/70 mb-2 block">اختر مظهر جاهز:</label>
                <div className="relative">
                    <select 
                        value={isCustomMode ? '' : currentTheme.id}
                        onChange={handlePresetChange}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-sm appearance-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-white outline-none"
                    >
                        {isCustomMode && <option value="" disabled>-- مخصص (Custom) --</option>}
                        {THEMES.map(theme => (
                            <option key={theme.id} value={theme.id}>
                                {theme.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentTheme.previewColor }}></div>
                    </div>
                </div>
            </div>

            {/* Custom Color Creator */}
            <div className="bg-dark-card/50 p-4 rounded-xl border border-dark-border">
                <label className="text-sm font-semibold text-dark-text/70 mb-3 block">أو اصنع لونك الخاص:</label>
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <div className="text-xs text-dark-text/50 mb-1">اللون الأساسي</div>
                        <div className="flex gap-2 items-center bg-dark-bg p-2 rounded-lg border border-dark-border">
                            <input 
                                type="color" 
                                value={customPrimary} 
                                onChange={(e) => {
                                    setCustomPrimary(e.target.value);
                                    applyCustomTheme(e.target.value, customSecondary);
                                }}
                                className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
                            />
                            <span className="text-xs font-mono text-dark-text">{customPrimary}</span>
                        </div>
                    </div>
                    <div className="flex-1">
                         <div className="text-xs text-dark-text/50 mb-1">اللون الثانوي</div>
                         <div className="flex gap-2 items-center bg-dark-bg p-2 rounded-lg border border-dark-border">
                            <input 
                                type="color" 
                                value={customSecondary} 
                                onChange={(e) => {
                                    setCustomSecondary(e.target.value);
                                    applyCustomTheme(customPrimary, e.target.value);
                                }}
                                className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
                            />
                            <span className="text-xs font-mono text-dark-text">{customSecondary}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const AiControl: React.FC = () => {
    const { temperature, setTemperature, thinkingBudget, setThinkingBudget, selectedModel } = useAppContext();
    const creativityLabel = temperature > 0.8 ? "إبداعية عالية" : temperature > 0.4 ? "متوازنة" : "دقيقة ومباشرة";
    
    const isReasoningModel = selectedModel === 'gemini-3-pro-preview' || selectedModel.includes('gemini-2.5');

    return (
        <div className="space-y-4">
            {/* Temperature Control */}
            <div className="bg-dark-card/50 p-4 rounded-xl border border-dark-border/50">
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="temperature" className="font-semibold text-sm text-dark-text/90">
                        الإبداع (Temperature)
                    </label>
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">{temperature.toFixed(2)}</span>
                </div>
                <input
                    id="temperature"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary hover:accent-secondary transition-colors"
                />
                <p className="text-xs text-dark-text/50 mt-2">
                    الحالة: <span className="font-bold text-secondary">{creativityLabel}</span>
                </p>
            </div>

            {/* Reasoning Budget Control (Only for supported models) */}
            {isReasoningModel && (
                <div className="bg-dark-card/50 p-4 rounded-xl border border-dark-border/50">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="thinkingBudget" className="font-semibold text-sm flex items-center gap-2 text-dark-text/90">
                            التفكير (Budget)
                            <span className="text-[9px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Beta</span>
                        </label>
                        <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-1 rounded-md border border-secondary/20">{thinkingBudget} tok</span>
                    </div>
                    <input
                        id="thinkingBudget"
                        type="range"
                        min="0"
                        max="16384"
                        step="1024"
                        value={thinkingBudget}
                        onChange={(e) => setThinkingBudget(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-secondary"
                    />
                    <div className="flex justify-between text-[10px] text-dark-text/40 mt-1 font-mono">
                        <span>Off</span>
                        <span>8k</span>
                        <span>16k</span>
                    </div>
                </div>
            )}
        </div>
    );
};

interface SettingsViewProps {
    onShowChangelog: () => void;
}

type Tab = 'general' | 'keys' | 'appearance' | 'instructions';

const TabButton: React.FC<{ 
    id: Tab; 
    active: boolean; 
    label: string; 
    icon: React.ReactNode; 
    onClick: () => void 
}> = ({ id, active, label, icon, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            w-full flex flex-col md:flex-row items-center md:gap-3 px-2 py-3 md:px-4 md:py-3 rounded-xl transition-all duration-200 group
            ${active 
                ? 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary font-bold md:border-r-4 md:border-b-0 border-b-4 border-primary' 
                : 'text-dark-text/60 hover:bg-white/5 hover:text-dark-text'
            }
        `}
    >
        <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
        <span className="text-[10px] md:text-sm mt-1 md:mt-0">{label}</span>
        {active && <ArrowRightIcon className="mr-auto h-4 w-4 text-primary opacity-50 rtl:rotate-180 hidden md:block" />}
    </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowChangelog }) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const { 
        selectedModel, 
        setSelectedModel, 
        systemPrompt, 
        setSystemPrompt, 
        uploadedFileName, 
        setUploadedFileName,
        apiKeys,
        cerebrasApiKeys,
        gptOssConfig,
        extractionPrompt,
        setExtractionPrompt
    } = useAppContext();

    const handlePromptUpload = (text: string, fileName: string) => {
        setSystemPrompt(text);
        setUploadedFileName(fileName);
    };

    const handlePromptChange = (text: string) => {
        setSystemPrompt(text);
        setUploadedFileName(null);
    }

    const handlePromptClear = () => {
        setSystemPrompt(null);
        setUploadedFileName(null);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-8 animate-fade-in-right">
                        {/* Header */}
                        <div className="pb-4 border-b border-dark-border">
                            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
                                إعدادات الذكاء والمعالجة
                            </h2>
                            <p className="text-dark-text/50 text-xs md:text-sm mt-1">تخصيص سلوك المترجم واختيار النموذج المناسب.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Main Column */}
                            <div className="lg:col-span-8 space-y-6">
                                <section className="space-y-3">
                                    <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
                                </section>
                            </div>

                            {/* Sidebar Column */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-dark-bg/30 p-4 rounded-2xl border border-dark-border sticky top-0">
                                    <h3 className="text-lg font-bold mb-4 text-white">🎛️ ضوابط التوليد</h3>
                                    <AiControl />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'instructions':
                return (
                    <div className="space-y-8 animate-fade-in-right">
                        <div className="pb-4 border-b border-dark-border">
                            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
                                إدارة التعليمات (Prompts)
                            </h2>
                            <p className="text-dark-text/50 text-xs md:text-sm mt-1">تخصيص الأوامر التي يتم إرسالها للذكاء الاصطناعي.</p>
                        </div>

                        {/* 1. Translation Prompt */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                    📜 تعليمات الترجمة (System Prompt)
                                </h3>
                                <span className="text-xs text-dark-text/40 bg-dark-bg px-2 py-1 rounded border border-dark-border hidden md:inline">
                                    يدعم .txt, .docx
                                </span>
                            </div>
                            <div className="h-[300px] md:h-[400px]">
                                <SystemPromptUploader 
                                    currentPrompt={systemPrompt}
                                    onPromptChange={handlePromptChange}
                                    onPromptUpload={handlePromptUpload} 
                                    onPromptClear={handlePromptClear}
                                    uploadedFileName={uploadedFileName}
                                />
                            </div>
                        </section>

                        <hr className="border-dark-border/50" />

                        {/* 2. Extraction Prompt */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                                    🧠 تعليمات استخراج المصطلحات (Codex)
                                </h3>
                                <button 
                                    onClick={() => setExtractionPrompt(DEFAULT_EXTRACTION_PROMPT)} 
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                                >
                                    <TrashIcon className="h-3 w-3" /> استعادة الافتراضي
                                </button>
                            </div>
                            <p className="text-xs text-dark-text/60">
                                استخدم هذا الحقل لتخصيص كيفية استخراج الذكاء الاصطناعي للأسماء والمصطلحات من النص.
                                <br />
                                <b>المتغيرات المتاحة:</b> {'{{ENGLISH_TEXT}}'}, {'{{ARABIC_TEXT}}'}
                            </p>
                            <textarea 
                                value={extractionPrompt}
                                onChange={(e) => setExtractionPrompt(e.target.value)}
                                className="w-full h-[250px] bg-dark-bg/50 border border-dark-border rounded-lg p-4 text-sm focus:outline-none focus:border-secondary resize-none font-mono leading-relaxed text-dark-text/90 scrollbar-thin"
                                placeholder="أدخل تعليمات الاستخراج هنا..."
                                dir="ltr"
                            />
                        </section>
                    </div>
                );
            case 'keys':
                return (
                    <div className="space-y-8 animate-fade-in-right">
                        <div className="pb-4 border-b border-dark-border">
                            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
                                إدارة مفاتيح API
                            </h2>
                            <p className="text-dark-text/50 text-xs md:text-sm mt-1">إضافة وإدارة المفاتيح الخاصة بنماذج الذكاء المختلفة.</p>
                        </div>
                        
                        <div className="grid gap-8">
                            <section>
                                <ApiKeyManager 
                                    keys={apiKeys.keys} 
                                    onAddKey={apiKeys.addKey} 
                                    onRemoveKey={apiKeys.removeKey} 
                                />
                            </section>
                            <hr className="border-dark-border opacity-50" />
                            <section>
                                <CerebrasApiKeyManager
                                     keys={cerebrasApiKeys.keys}
                                     onAddKey={cerebrasApiKeys.addKey}
                                     onRemoveKey={cerebrasApiKeys.removeKey}
                                />
                            </section>
                             <hr className="border-dark-border opacity-50" />
                            <section>
                                <GptOssApiKeyManager 
                                    keys={gptOssConfig.keys}
                                    onAddKey={gptOssConfig.addKey}
                                    onRemoveKey={gptOssConfig.removeKey}
                                    baseUrl={gptOssConfig.baseUrl}
                                    onBaseUrlChange={gptOssConfig.setBaseUrl}
                                    modelName={gptOssConfig.modelName}
                                    onModelNameChange={gptOssConfig.setModelName}
                                />
                            </section>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-8 animate-fade-in-right">
                         <div className="pb-4 border-b border-dark-border">
                            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary">
                                المظهر والتخصيص
                            </h2>
                            <p className="text-dark-text/50 text-xs md:text-sm mt-1">اختر النمط اللوني الذي يريح عينيك أو اصنع نمطك الخاص.</p>
                        </div>
                        <ThemeSelector />
                        
                        <div className="bg-dark-card/30 p-6 rounded-2xl border border-dark-border flex items-center justify-center min-h-[200px]">
                            <div className="text-center">
                                <h4 className="text-xl font-bold mb-2 text-white">معاينة الألوان</h4>
                                <div className="flex gap-4 justify-center mt-4">
                                    <button className="bg-primary text-white px-6 py-2 rounded-lg shadow-lg shadow-primary/30">Primary</button>
                                    <button className="bg-secondary text-white px-6 py-2 rounded-lg shadow-lg shadow-secondary/30">Secondary</button>
                                    <button className="bg-dark-bg border border-primary text-primary px-6 py-2 rounded-lg">Outline</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-dark-bg-main overflow-hidden rounded-2xl border border-dark-border shadow-2xl">
            
            {/* 1. Responsive Sidebar / Topbar */}
            <aside className="w-full md:w-64 flex-shrink-0 bg-dark-bg/80 backdrop-blur-xl border-b md:border-b-0 md:border-l border-dark-border flex flex-row md:flex-col justify-between z-10 overflow-x-auto md:overflow-visible">
                <div className="flex-1 flex flex-col">
                    <div className="p-4 md:p-6 pb-2 hidden md:block">
                            <h1 className="text-xl font-bold latin-text tracking-tight text-white mb-1">ZEUS</h1>
                            <p className="text-xs text-dark-text/40">Translation Core v4.6</p>
                    </div>
                    <nav className="p-2 md:p-3 flex md:flex-col gap-1 md:space-y-1">
                        <TabButton 
                            id="general" 
                            active={activeTab === 'general'} 
                            onClick={() => setActiveTab('general')} 
                            label="الذكاء" 
                            icon={<BrainIcon className="h-5 w-5" />} 
                        />
                        <TabButton 
                            id="instructions" 
                            active={activeTab === 'instructions'} 
                            onClick={() => setActiveTab('instructions')} 
                            label="التعليمات" 
                            icon={<FileTextIcon className="h-5 w-5" />} 
                        />
                        <TabButton 
                            id="keys" 
                            active={activeTab === 'keys'} 
                            onClick={() => setActiveTab('keys')} 
                            label="مفاتيح API" 
                            icon={<KeyIcon className="h-5 w-5" />} 
                        />
                            <TabButton 
                            id="appearance" 
                            active={activeTab === 'appearance'} 
                            onClick={() => setActiveTab('appearance')} 
                            label="المظهر" 
                            icon={<SunIcon className="h-5 w-5" />} 
                        />
                    </nav>
                </div>

                <div className="p-4 border-t border-dark-border/50 bg-white/5 hidden md:block">
                    <button onClick={onShowChangelog} className="w-full text-xs text-center text-dark-text/40 hover:text-primary transition underline py-2">
                        عرض سجل التغييرات
                    </button>
                </div>
            </aside>

            {/* 2. Content Area */}
            <main className="flex-grow relative bg-mesh overflow-hidden flex flex-col">
                {/* Decorative Top Bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>
                
                {/* Scrollable Content */}
                <div className="flex-grow p-4 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border hover:scrollbar-thumb-primary/50">
                    {renderContent()}
                </div>
            </main>
            
            <style>{`
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-right { animation: fade-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};
