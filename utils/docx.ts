import { Chapter } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import saveAs from 'file-saver';

const createDocument = (chapters: Chapter[]): Document => {
    return new Document({
        creator: "Advanced Chapter Translator",
        title: "Translated Chapters",
        description: "A document containing translated chapters.",
        sections: chapters.map(chapter => {
            const translatedLines = chapter.translatedText?.split('\n') || [];
            const title = translatedLines[0] || chapter.originalTitle;
            const content = translatedLines.slice(1).join('\n').trim();

            return {
                properties: {},
                children: [
                    new Paragraph({
                        text: title,
                        heading: HeadingLevel.HEADING_1,
                        style: "heading1Style",
                    }),
                    ...content.split('\n').map(paragraph => new Paragraph({
                        children: [new TextRun(paragraph)],
                        style: "normalStyle",
                    })),
                    new Paragraph({ text: "", style: "spacerStyle" }), // Spacer between chapters
                ],
            };
        }),
        styles: {
            paragraphStyles: [
                {
                    id: "heading1Style", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                    run: { size: 32, bold: true, color: "333333" },
                    paragraph: { spacing: { after: 240 } },
                },
                {
                    id: "normalStyle", name: "Normal", quickFormat: true,
                    run: { size: 24 },
                    paragraph: { spacing: { after: 120 } },
                },
                {
                    id: "spacerStyle", name: "Spacer", basedOn: "Normal", next: "Normal",
                    paragraph: { spacing: { after: 480 } },
                }
            ],
        },
    });
};

export const generateDocxBlob = async (chapters: Chapter[]): Promise<Blob> => {
    if (!chapters || chapters.length === 0) {
        console.warn('No chapters provided to generate DOCX.');
        return new Blob();
    }
    const doc = createDocument(chapters);
    try {
        const blob = await Packer.toBlob(doc);
        return blob;
    } catch (error) {
        console.error('Error generating DOCX blob:', error);
        throw new Error('Could not generate DOCX blob.');
    }
};


export const exportChaptersToDocx = async (chapters: Chapter[], fileName: string): Promise<void> => {
   try {
        const blob = await generateDocxBlob(chapters);
        if (blob.size > 0) {
            saveAs(blob, fileName);
        }
    } catch (error) {
        console.error('Failed to export chapters to DOCX:', error);
        throw error;
    }
};