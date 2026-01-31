
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text || !navigator.clipboard) {
        console.warn('Clipboard API not available.');
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text to clipboard: ', err);
        return false;
    }
};
