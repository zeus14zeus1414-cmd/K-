import React from 'react';
import { ModelName } from '../types';
import { CheckCircleIcon } from './Icons';

interface ModelOption {
    id: ModelName;
    name: string;
    description: string;
    details: string[];
}

const models: ModelOption[] = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'الأسرع والأكثر كفاءة للمهام اليومية والترجمة السريعة.',
        details: [
            'الحد اليومي: 250 طلب/يوم',
            'معدل الطلبات: 10 طلب/دقيقة',
            'الرموز المميزة: 250 ألف/دقيقة',
        ]
    },
    {
        id: 'gemini-flash-lite-latest',
        name: 'Gemini 2.5 Flash-Lite',
        description: 'الأخف وزنًا والأكثر اقتصادية، مثالي للكميات الكبيرة.',
        details: [
            'الحد اليومي: 1000 طلب/يوم',
            'معدل الطلبات: 15 طلب/دقيقة',
            'الرموز المميزة: 250 ألف/دقيقة',
        ]
    },
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro (Preview)',
        description: 'الجيل القادم من نماذج جوجل. أذكى نموذج حتى الآن للمهام المعقدة.',
        details: [
            'الحد اليومي: 50 طلب/يوم',
            'معدل الطلبات: 2 طلب/دقيقة',
            'قدرات استدلال فائقة',
            'مثالي للترجمة الأدبية العميقة',
        ]
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'نموذج متقدم بقدرات استيعاب وفهم أعلى، لجودة فائقة.',
        details: [
            'الحد اليومي: 50 طلب/يوم',
            'معدل الطلبات: 2 طلب/دقيقة',
            'الرموز المميزة: 50 ألف/دقيقة',
        ]
    },
     {
        id: 'cerebras/llama-3.1-70b',
        name: 'Cerebras LLaMA 3.1 70B',
        description: 'نموذج LLaMA 3.1 70B مُحسَّن بواسطة Cerebras، قوي وفعال.',
        details: [
            'الحد اليومي: 200 طلب/يوم',
            'معدل الطلبات: 5 طلب/دقيقة',
            'الرموز المميزة: 2048/طلب',
        ]
    },
    {
        id: 'cerebras/gpt-oss-120b',
        name: 'Cerebras GPT-OSS 120B',
        description: 'نموذج ضخم (120B) بقدرات استدلال متقدمة ونافذة سياق واسعة جدًا.',
        details: [
            'الحد اليومي: 100 طلب/يوم',
            'معدل الطلبات: 3 طلب/دقيقة',
            'الرموز المميزة: 65536/طلب',
            'مجهود استدلالي: متوسط',
        ]
    },
    {
        id: 'gpt-oss/custom',
        name: 'GPT-OSS / Custom',
        description: 'استخدم أي نموذج مخصص متوافق مع OpenAI API (مثل Groq, Together).',
        details: [
            'الحد اليومي: 1000 (افتراضي)',
            'معدل الطلبات: 20 (افتراضي)',
            'يعتمد الأداء على الخدمة التي تستخدمها',
            'يتطلب إعدادًا في قسم GPT-OSS',
        ]
    },
];

interface ModelSelectorProps {
    selectedModel: ModelName;
    onModelChange: (model: ModelName) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">🧠 إعداد نموذج الذكاء</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {models.map((model) => (
                    <div
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col h-full ${
                            selectedModel === model.id
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : 'border-dark-border bg-dark-bg hover:border-primary/50'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold latin-text">{model.name}</h3>
                                <p className="text-sm text-dark-text/70 mt-1">{model.description}</p>
                            </div>
                            {selectedModel === model.id && <CheckCircleIcon className="h-6 w-6 text-primary flex-shrink-0" />}
                        </div>
                        <div className="mt-4 pt-4 border-t border-dark-border flex-grow flex flex-col justify-end">
                             <ul className="space-y-1.5 text-sm list-disc list-inside pr-4">
                                {model.details.map((detail, index) => (
                                    <li key={index} className="text-dark-text/80">
                                        <span className="font-semibold text-primary">{detail.split(':')[0]}:</span>
                                        {detail.split(':')[1]}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};