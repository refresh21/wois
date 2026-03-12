let cachedVfs: Record<string, Uint8Array> | null = null;

export const getPdfFontsVfs = () => {
    if (cachedVfs) return cachedVfs;

    const { fontVfs } = require('./vfs_fonts');
    const decodedVfs: Record<string, Uint8Array> = {};

    for (const [key, value] of Object.entries(fontVfs)) {
        const binaryString = window.atob(value as string);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        decodedVfs[key] = bytes;
    }

    cachedVfs = decodedVfs;
    return decodedVfs;
};
