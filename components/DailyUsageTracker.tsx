import React from 'react';
import { MODEL_LIMITS } from '../constants';
import { useAppContext } from '../contexts/AppContext';

export const DailyUsageTracker: React.FC = () => {
    const { dailyUsage, selectedModel } = useAppContext();
    const usage = dailyUsage[selectedModel] ?? 0;
    const limit = MODEL_LIMITS[selectedModel];
    
    // Avoid division by zero
    const percentage = limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;
    
    let colorClass = 'text-primary';
    if (percentage >= 90) colorClass = 'text-red-500';
    else if (percentage >= 75) colorClass = 'text-yellow-500';

    const cleanName = selectedModel.split('/').pop()?.replace('gemini-', '').replace('cerebras-', '').substring(0, 12) || 'Model';

    return (
        <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/5 cursor-help" title={`Usage: ${usage}/${limit}`}>
            <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] font-bold text-dark-text/40 uppercase tracking-wider">{cleanName}</span>
                <span className="text-[10px] font-mono text-dark-text/80">{usage}/{limit}</span>
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${percentage >= 100 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
        </div>
    );
};