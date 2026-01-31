
import React, { useState, useEffect } from 'react';
import { ClockIcon } from './Icons';

export const SessionTimer: React.FC = () => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m ${secs}s`;
    };

    return (
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5 select-none" title="Session Duration">
            <ClockIcon className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-[10px] font-mono text-dark-text/70 font-bold min-w-[50px] text-center">
                {formatTime(seconds)}
            </span>
        </div>
    );
};
