import React, { createContext, useState, useCallback, useContext } from 'react';
import { LogEntry, LogLevel } from '../types';

interface LogContextType {
    logs: LogEntry[];
    addLog: (message: string, level?: LogLevel) => void;
    clearLogs: () => void;
}

const LogContext = createContext<LogContextType | null>(null);

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = useCallback((message: string, level: LogLevel = 'INFO') => {
        const newLog: LogEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            level,
            message,
        };
        setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 200)); // Keep last 200 logs
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
        addLog('Logs cleared.', 'WARN');
    }, [addLog]);

    return (
        <LogContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </LogContext.Provider>
    );
};

export const useLogger = (): LogContextType => {
    const context = useContext(LogContext);
    if (!context) {
        throw new Error('useLogger must be used within a LogProvider');
    }
    return context;
};
