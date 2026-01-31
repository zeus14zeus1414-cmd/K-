import mammoth from 'mammoth';

// Helper to extract text from a DOCX file
const readDocxFile = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error("Error reading docx file:", error);
        throw new Error("Could not read the .docx file. It may be corrupt or in an unsupported format.");
    }
};

// Helper to extract text from a TXT file
const readTxtFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

/**
 * Reads the text content from a File object, supporting .txt and .docx formats.
 * @param file The file to read.
 * @returns A promise that resolves with the text content of the file.
 */
export const readTextFromFile = async (file: File): Promise<string> => {
    const fileName = file.name;
    const fileType = file.type;

    if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
        return readTxtFile(file);
    }
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx')) {
        return readDocxFile(file);
    }
    throw new Error('Unsupported file type.');
};


// Main function to read a chapter file for the single-chapter upload feature
export const readChapterFile = async (file: File): Promise<{ title: string; content: string }> => {
    const fileName = file.name;
    const title = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    
    try {
        const content = await readTextFromFile(file);
        return { title, content };
    } catch {
         // Re-throw with a more user-friendly message for this specific context
        throw new Error('Unsupported file type. Please upload a .txt or .docx file.');
    }
};
