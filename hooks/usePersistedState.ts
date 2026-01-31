// Fix: Import React to resolve 'Cannot find namespace React' error for types like React.Dispatch and React.SetStateAction.
import React, { useState, useEffect, useRef } from 'react';

const DEBOUNCE_DELAY = 300; // ms

export const usePersistedState = <T,>(key: string, initialState: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue) {
                return JSON.parse(storedValue);
            }
            return typeof initialState === 'function' ? (initialState as () => T)() : initialState;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return typeof initialState === 'function' ? (initialState as () => T)() : initialState;
        }
    });

    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.error(`Error setting localStorage key “${key}”:`, error);
            }
        }, DEBOUNCE_DELAY);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [key, state]);


    return [state, setState];
};
