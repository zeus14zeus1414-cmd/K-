
export type ModelName = 'gemini-2.5-flash' | 'gemini-flash-lite-latest' | 'gemini-2.5-pro' | 'gemini-3-pro-preview' | 'cerebras/llama-3.1-70b' | 'cerebras/gpt-oss-120b' | 'gpt-oss/custom';

export type ChapterStatus = 'idle' | 'translating' | 'completed' | 'failed';

export interface Folder {
    id: string;
    name: string;
    isOpen: boolean;
}

export interface Chapter {
    id: string;
    folderId?: string; // New field for folder organization
    originalTitle: string;
    originalContent: string;
    translatedText: string | null;
    status: ChapterStatus;
}

export interface DailyUsage {
    date: string;
    counts: { [key in ModelName]?: number };
}

export type NotificationType = 'info' | 'success' | 'error';

export interface Notification {
    id: number;
    message: string;
    type: NotificationType;
}

export interface Term {
    id: string;
    original: string;
    translation: string;
}

export type CodexCategory = 'character' | 'location' | 'item' | 'rank' | 'other';

export interface CodexEntry {
    id: string;
    category: CodexCategory;
    name: string; // Original English Name
    translation: string; // Arabic Translation
    description: string; // Context/Description
    lastUpdated: string; // Date string
}

export interface CodexBook {
    id: string;
    name: string;
    entries: CodexEntry[];
}

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
}

export interface AppTheme {
    id: string;
    name: string;
    primary: string;   // RGB values: "R G B"
    secondary: string; // RGB values: "R G B"
    previewColor: string; // Hex for UI preview
}
