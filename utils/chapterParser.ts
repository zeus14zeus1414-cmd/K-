import { Chapter } from '../types';

/**
 * Parses a single block of text into multiple chapters based on a regex pattern.
 * @param text The full text content from a .txt or .docx file.
 * @returns An array of Chapter objects.
 */
export const parseChaptersFromText = (text: string): Chapter[] => {
    if (!text.trim()) {
        return [];
    }

    // Regex to split the text by lines that look like chapter titles.
    // The positive lookahead (?=...) keeps the delimiter (the title line) at the beginning of each split part.
    // It looks for "Chapter X", "Ch X", "#XChapter", or the Arabic equivalent "الفصل X".
    const chapterSplitRegex = /(?=^\s*(?:chapter|ch|الفصل)\s*\d+|^\s*\[?#\d+\s*chapter)/im;

    const chunks = text.split(chapterSplitRegex).filter(chunk => chunk.trim() !== '');

    if (chunks.length === 0) {
        // If no chapter titles were found, treat the whole file as a single chapter.
        return [{
            id: crypto.randomUUID(),
            originalTitle: 'Chapter 1', // Default title
            originalContent: text.trim(),
            translatedText: null,
            status: 'idle',
        }];
    }

    return chunks.map((chunk, index) => {
        const lines = chunk.trim().split('\n');
        // The first line is assumed to be the title.
        const title = lines[0]?.trim() || `Chapter ${index + 1}`;
        // The rest of the lines are the content.
        const content = lines.slice(1).join('\n').trim();

        return {
            id: crypto.randomUUID(),
            originalTitle: title,
            originalContent: content,
            translatedText: null,
            status: 'idle',
        };
    });
};
