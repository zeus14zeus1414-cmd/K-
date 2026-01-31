import { Chapter } from '../types';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const getChapterNumber = (title: string): string => {
    // Attempt to find "Chapter", "Ch", or "الفصل" followed by a number
    const specificMatch = title.match(/(?:chapter|ch|الفصل)\s*(\d+)/i);
    if (specificMatch && specificMatch[1]) {
        return specificMatch[1];
    }
    // Fallback to find any sequence of digits
    const numberMatch = title.match(/\d+/);
    if (numberMatch) {
        return numberMatch[0];
    }
    // Final fallback to a sanitized title if no number is found
    return title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
};

export const generateChaptersZipBlob = async (chapters: Chapter[]): Promise<Blob> => {
    if (!chapters || chapters.length === 0) {
        console.warn('No chapters provided to generate ZIP.');
        return new Blob();
    }

    const zip = new JSZip();

    chapters.forEach((chapter) => {
        if (chapter.translatedText) {
            const chapterIdentifier = getChapterNumber(chapter.originalTitle);
            const fileName = `Chapter-${chapterIdentifier}.txt`;
            zip.file(fileName, chapter.translatedText);
        }
    });

    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        return blob;
    } catch (error) {
        console.error('Error generating ZIP blob:', error);
        throw new Error('Could not generate ZIP file.');
    }
};

export const exportChaptersToZip = async (chapters: Chapter[], fileName: string): Promise<void> => {
    try {
        const blob = await generateChaptersZipBlob(chapters);
        if (blob.size > 0) {
            saveAs(blob, fileName);
        }
    } catch (error) {
        console.error('Failed to export chapters to ZIP:', error);
        throw error;
    }
};