import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useAppContext } from '../contexts/AppContext';
import { useLogger } from '../contexts/LogContext';
import { LogEntry } from '../types';

interface DevPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const LogLevelBadge: React.FC<{ level: LogEntry['level'] }> = ({ level }) => {
    const styles = {
        INFO: 'bg-blue-900 text-blue-300',
        SUCCESS: 'bg-green-900 text-green-300',
        WARN: 'bg-yellow-900 text-yellow-300',
        ERROR: 'bg-red-900 text-red-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[level]}`}>{level}</span>;
};


export const DevPanel: React.FC<DevPanelProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('logs');
    const { logs, clearLogs } = useLogger();
    const appState = useAppContext();

    const stats = useMemo(() => {
        const completed = appState.chapters.filter(c => c.status === 'completed').length;
        const failed = appState.chapters.filter(c => c.status === 'failed').length;
        const total = completed + failed;
        const errorRate = total > 0 ? ((failed / total) * 100).toFixed(2) : '0.00';
        return { completed, failed, total, errorRate };
    }, [appState.chapters]);

    const stateToInspect = {
        chapters: appState.chapters,
        archivedChapters: appState.archivedChapters,
        activeTabIndex: appState.activeTabIndex,
        dailyUsage: appState.dailyUsage,
        selectedModel: appState.selectedModel,
        isLoading: appState.isLoading,
        systemPrompt: appState.systemPrompt ? `${appState.systemPrompt.substring(0, 100)}...` : null,
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Developer Panel">
            <div className="flex flex-col h-[70vh]">
                <div className="flex-shrink-0 border-b border-dark-border">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('logs')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'logs' ? 'text-primary border-b-2 border-primary' : 'text-dark-text/60 hover:text-dark-text'}`}>
                            Logs
                        </button>
                        <button onClick={() => setActiveTab('stats')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-dark-text/60 hover:text-dark-text'}`}>
                            Stats
                        </button>
                        <button onClick={() => setActiveTab('state')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'state' ? 'text-primary border-b-2 border-primary' : 'text-dark-text/60 hover:text-dark-text'}`}>
                            State Inspector
                        </button>
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto mt-4">
                    {activeTab === 'logs' && (
                        <div>
                             <button onClick={clearLogs} className="mb-4 text-xs bg-red-500/10 text-red-500 px-3 py-1 rounded-md hover:bg-red-500/20">Clear Logs</button>
                            <div className="space-y-2 font-mono text-xs">
                                {logs.map(log => (
                                    <div key={log.id} className="flex items-start gap-3 p-2 rounded bg-dark-bg">
                                        <span className="text-dark-text/40">{log.timestamp}</span>
                                        <LogLevelBadge level={log.level} />
                                        <p className="flex-1 break-words">{log.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'stats' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">Session Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-dark-bg rounded-lg">
                                    <p className="text-sm text-dark-text/70">Successful Translations</p>
                                    <p className="text-2xl font-bold">{stats.completed}</p>
                                </div>
                                <div className="p-4 bg-dark-bg rounded-lg">
                                    <p className="text-sm text-dark-text/70">Failed Translations</p>
                                    <p className="text-2xl font-bold">{stats.failed}</p>
                                </div>
                                <div className="p-4 bg-dark-bg rounded-lg">
                                    <p className="text-sm text-dark-text/70">Total Processed</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <div className="p-4 bg-dark-bg rounded-lg">
                                    <p className="text-sm text-dark-text/70">Error Rate</p>
                                    <p className="text-2xl font-bold">{stats.errorRate}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'state' && (
                        <div>
                             <h3 className="text-lg font-bold mb-2">Current App State</h3>
                             <pre className="text-xs p-4 bg-dark-bg rounded-lg overflow-x-auto">
                                {JSON.stringify(stateToInspect, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};