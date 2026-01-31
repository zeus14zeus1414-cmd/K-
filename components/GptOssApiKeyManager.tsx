import React, { useState } from 'react';
import { TrashIcon, PlusIcon } from './Icons';

interface GptOssApiKeyManagerProps {
    keys: string[];
    onAddKey: (key: string) => void;
    onRemoveKey: (key: string) => void;
    baseUrl: string;
    onBaseUrlChange: (url: string) => void;
    modelName: string;
    onModelNameChange: (name: string) => void;
}

const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

export const GptOssApiKeyManager: React.FC<GptOssApiKeyManagerProps> = ({ keys, onAddKey, onRemoveKey, baseUrl, onBaseUrlChange, modelName, onModelNameChange }) => {
    const [newKey, setNewKey] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        onAddKey(newKey);
        setNewKey('');
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">🐙 إدارة GPT-OSS (متوافق مع OpenAI)</h2>
            <p className="text-sm text-dark-text/70 mb-5">
                أضف مفاتيحك ورابط الخدمة للاتصال بأي نموذج متوافق مع OpenAI API. سيتم التبديل بين المفاتيح تلقائيًا.
            </p>
            
            <div className="space-y-3 mb-6 p-4 bg-dark-bg rounded-2xl border border-dark-border">
                <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => onBaseUrlChange(e.target.value)}
                    placeholder="رابط API الأساسي (e.g., https://api.example.com/v1)"
                    className="w-full p-3 bg-dark-card/50 border border-dark-border rounded-lg text-sm focus:ring-primary focus:border-primary latin-text"
                    dir="ltr"
                    required
                />
                <input
                    type="text"
                    value={modelName}
                    onChange={(e) => onModelNameChange(e.target.value)}
                    placeholder="اسم النموذج (e.g., llama3-70b-8192)"
                    className="w-full p-3 bg-dark-card/50 border border-dark-border rounded-lg text-sm focus:ring-primary focus:border-primary latin-text"
                    dir="ltr"
                    required
                />
            </div>
            
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-dark-bg rounded-2xl border border-dark-border">
                <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="أدخل مفتاح API جديد"
                    className="flex-1 p-3 bg-dark-card/50 border border-dark-border rounded-lg text-sm focus:ring-primary focus:border-primary latin-text"
                    dir="ltr"
                    required
                />
                <button
                    type="submit"
                    className="flex items-center justify-center bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-5 rounded-lg transition duration-200 shadow-sm disabled:opacity-50"
                    disabled={!newKey.trim()}
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    <span>إضافة مفتاح</span>
                </button>
            </form>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {keys.length === 0 ? (
                    <div className="text-center text-dark-text/50 py-4">
                        <p className="font-semibold">لا توجد مفاتيح محفوظة.</p>
                        <p className="text-xs mt-1">أضف مفتاحًا ورابطًا واسم نموذج لبدء الاستخدام.</p>
                    </div>
                ) : (
                    keys.map(key => (
                        <div key={key} className="flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-dark-border">
                            <div className="flex-1 latin-text text-left font-mono" dir="ltr">
                                <span className="font-semibold text-dark-text">{maskKey(key)}</span>
                            </div>
                            <button onClick={() => onRemoveKey(key)} className="text-dark-text/40 hover:text-red-400 transition duration-150 ml-4">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};