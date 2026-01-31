
import React from 'react';
import { Notification } from '../types';
import { InfoIcon, WarningIcon, CheckCircleIcon, ErrorIcon } from './Icons';

interface NotificationPanelProps {
    notifications: Notification[];
    onDismiss: (id: number) => void;
}

const notificationStyles = {
    info: {
        classes: 'bg-primary/20 border-primary text-white',
        icon: <InfoIcon className="h-6 w-6 text-primary" />,
    },
    success: {
        classes: 'bg-green-500/20 border-green-500 text-white',
        icon: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
    },
    error: {
        classes: 'bg-red-500/20 border-red-500 text-white',
        icon: <ErrorIcon className="h-6 w-6 text-red-400" />,
    },
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onDismiss }) => {
    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm space-y-4 pointer-events-none">
            {notifications.map(notification => {
                const styles = notificationStyles[notification.type];
                return (
                    <div
                        key={notification.id}
                        className={`${styles.classes} border border-l-4 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in-right backdrop-blur-xl pointer-events-auto transition-all transform hover:scale-105`}
                        role="alert"
                    >
                        <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
                        <div className="flex-grow">
                            <p className="text-sm font-bold leading-relaxed">{notification.message}</p>
                        </div>
                        <button onClick={() => onDismiss(notification.id)} className="flex-shrink-0 -mt-1 -mr-1 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10">
                            &times;
                        </button>
                    </div>
                );
            })}
             <style>{`
                @keyframes fade-in-right {
                    from {
                        opacity: 0;
                        transform: translateX(20px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                .animate-fade-in-right {
                    animation: fade-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};
