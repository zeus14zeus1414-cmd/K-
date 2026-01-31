
import { useCallback } from 'react';
import { Term } from '../types';
import { usePersistedState } from './usePersistedState';

export const useTerminology = () => {
    const [terms, setTerms] = usePersistedState<Term[]>('customTerminology', []);

    const addTerm = useCallback((original: string, translation: string) => {
        if (!original.trim() || !translation.trim()) return;
        
        const exists = terms.some(term => term.original.toLowerCase() === original.trim().toLowerCase());
        if (exists) {
            // Optional: Update existing term instead of alerting?
            // For now, we keep the logic strict to avoid accidental overwrites, 
            // but maybe flash a warning.
            alert('هذا المصطلح موجود بالفعل.');
            return;
        }

        const newTerm: Term = {
            id: crypto.randomUUID(),
            original: original.trim(),
            translation: translation.trim(),
        };
        setTerms(prev => [...prev, newTerm]);
    }, [terms, setTerms]);

    const removeTerm = useCallback((id: string) => {
        setTerms(prev => prev.filter(term => term.id !== id));
    }, [setTerms]);

    const importTerms = useCallback((newTerms: Term[], merge: boolean = true) => {
        if (merge) {
            setTerms(prev => {
                // Create a map of existing terms for quick lookup
                const existingMap = new Map(prev.map(t => [t.original.toLowerCase(), t]));
                
                // Add or update terms
                newTerms.forEach(term => {
                    // If we want to overwrite, we can do it here. 
                    // Currently assuming "merge" means add new ones, ignore duplicates or maybe overwrite?
                    // Let's assume overwrite for imported terms for better UX
                    existingMap.set(term.original.toLowerCase(), { ...term, id: crypto.randomUUID() });
                });

                return Array.from(existingMap.values());
            });
        } else {
            // Replace completely
            setTerms(newTerms.map(t => ({ ...t, id: crypto.randomUUID() })));
        }
    }, [setTerms]);

    return { terms, addTerm, removeTerm, importTerms };
};
