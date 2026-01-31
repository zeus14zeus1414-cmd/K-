import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-dark-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-fade-in-down"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-dark-bg transition-colors"
                        aria-label="Close modal"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
             <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translate(0, -20px) scale(0.95); }
                    to { opacity: 1; transform: translate(0, 0) scale(1); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};