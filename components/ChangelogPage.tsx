
import React from 'react';
import { BookIcon, BrainIcon, SettingsIcon, CheckCircleIcon, ArchiveIcon } from './Icons';

export const ChangelogPage: React.FC = () => {
    return (
        <div className="p-8 bg-dark-card rounded-lg max-w-4xl mx-auto my-8 animate-fade-in-down">
            <h1 className="text-3xl font-bold mb-6 text-primary border-b border-dark-border pb-3">سجل التغييرات - Abyssal Translation</h1>
            <div className="space-y-10">

                {/* Version 4.5 */}
                <div className="relative border-l-2 border-primary/50 pl-6 ml-2">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-dark-card shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                    <h2 className="text-3xl font-bold latin-text flex items-center text-white gap-3">
                        <span className="bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">v4.5</span>
                        Visual Masterpiece Update
                    </h2>
                    <p className="text-primary/60 text-sm mt-1 font-mono">2025-02-23</p>
                    
                    <div className="mt-4 grid gap-4">
                        <div className="bg-dark-bg/50 p-5 rounded-2xl border border-primary/20 hover:border-primary/50 transition-all shadow-lg shadow-black/20">
                            <h3 className="font-bold text-lg flex items-center gap-2 mb-3 text-white">
                                🎨 واجهة Abyssal الجديدة
                            </h3>
                            <p className="text-dark-text/80 text-sm leading-relaxed mb-3">
                                تحول بصري كامل للموقع. تم إعادة تصميم كل زر، قائمة، وحقل إدخال ليكون "تحفة فنية". استخدام تدرجات لونية، تأثيرات زجاجية (Glassmorphism)، وتوهجات نيون تجعل العمل متعة بصرية.
                            </p>
                            <div className="flex gap-2 text-xs">
                                <span className="bg-white/5 px-2 py-1 rounded border border-white/10">Unique Buttons</span>
                                <span className="bg-white/5 px-2 py-1 rounded border border-white/10">Glow Effects</span>
                                <span className="bg-white/5 px-2 py-1 rounded border border-white/10">Premium UX</span>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-dark-bg/50 p-4 rounded-xl border border-dark-border hover:border-secondary/30 transition-all">
                                <h3 className="font-bold text-base flex items-center gap-2 mb-2 text-secondary">
                                    <ArchiveIcon className="h-4 w-4" />
                                    إدارة الفصول الذكية
                                </h3>
                                <ul className="list-disc list-inside text-dark-text/70 text-sm space-y-1">
                                    <li><strong>سلة المهملات الذكية:</strong> زر "مسح الكل" الآن يحذف كل الفصول ولكنه <u>يحتفظ بالفصل الأول</u> لكي لا تفقد مساحة عملك.</li>
                                    <li><strong>إصلاح الأرشفة:</strong> زر الأرشفة يعمل الآن بسلاسة دون فتح الفصل بالخطأ.</li>
                                    <li><strong>البحث السريع:</strong> خانة بحث جديدة للعثور على الفصول بالاسم.</li>
                                </ul>
                            </div>

                            <div className="bg-dark-bg/50 p-4 rounded-xl border border-dark-border hover:border-green-400/30 transition-all">
                                <h3 className="font-bold text-base flex items-center gap-2 mb-2 text-green-400">
                                    ⏱️ أدوات الإنتاجية
                                </h3>
                                <ul className="list-disc list-inside text-dark-text/70 text-sm space-y-1">
                                    <li><strong>مؤقت الجلسة:</strong> تتبع وقت عملك بدقة.</li>
                                    <li><strong>عداد الكلمات:</strong> عداد فوري للأحرف والكلمات في النص الأصلي والمترجم.</li>
                                    <li><strong>تحميل القوانين:</strong> زر لتحميل "ملف القوانين الافتراضي (V1.9)" لاستخدامه كمرجع.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Version 3.4 */}
                <div className="relative border-l-2 border-white/10 pl-6 ml-2 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-dark-border border-4 border-dark-card"></div>
                    <h2 className="text-xl font-semibold latin-text flex items-center text-dark-text">
                        <span className="bg-white/10 text-dark-text text-xs font-bold mr-3 px-2.5 py-1 rounded-full">v3.4</span>
                        Abyssal Identity
                    </h2>
                    <p className="text-dark-text/40 text-sm mt-1 font-mono">2025-02-22</p>
                     <ul className="list-disc list-inside mt-3 space-y-2 text-dark-text/70 text-sm">
                        <li>إطلاق الهوية الجديدة "Abyssal Translation".</li>
                        <li>إزالة التكامل مع Google Drive لتحسين السرعة والخصوصية.</li>
                        <li>دمج نافذة "التعليمات" مع الإعدادات لتسهيل الوصول.</li>
                    </ul>
                </div>

                {/* Version 3.3 */}
                <div className="relative border-l-2 border-white/10 pl-6 ml-2 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-dark-border border-4 border-dark-card"></div>
                    <h2 className="text-xl font-semibold latin-text flex items-center text-dark-text">
                        <span className="bg-white/10 text-dark-text text-xs font-bold mr-3 px-2.5 py-1 rounded-full">v3.3</span>
                        The Codex Update
                    </h2>
                    <p className="text-dark-text/40 text-sm mt-1 font-mono">2025-02-22</p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-dark-text/70 text-sm">
                        <li><strong>نظام الكودكس:</strong> ذاكرة حية للقصة (شخصيات، أماكن، رتب).</li>
                        <li><strong>المسح الذكي:</strong> استخراج المصطلحات تلقائياً من الفصول.</li>
                        <li><strong>ميزانية التفكير:</strong> دعم نماذج Thinking Models.</li>
                    </ul>
                </div>

                {/* Version 3.0 - 1.0 Summary */}
                <div className="relative border-l-2 border-white/5 pl-6 ml-2 opacity-40 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-dark-border border-4 border-dark-card"></div>
                    <h2 className="text-lg font-medium latin-text text-dark-text/60">
                        التاريخ القديم (Legacy Versions)
                    </h2>
                    <div className="mt-4 space-y-4">
                         <div>
                            <span className="font-bold text-dark-text/50">v3.0 - The Dark Identity:</span>
                            <span className="text-sm ml-2 text-dark-text/40">التصميم المظلم الأول، ونظام الفصول المتعددة.</span>
                        </div>
                        <div>
                            <span className="font-bold text-dark-text/50">v2.0 - Core Engine:</span>
                            <span className="text-sm ml-2 text-dark-text/40">دعم Gemini API، البث المباشر للترجمة (Streaming).</span>
                        </div>
                         <div>
                            <span className="font-bold text-dark-text/50">v1.0 - Genesis:</span>
                            <span className="text-sm ml-2 text-dark-text/40">الإصدار الأولي البسيط للترجمة المباشرة.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
