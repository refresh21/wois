export function sanitizeFilename(filename: string): string {
    const turkishChars: { [key: string]: string } = {
        'ı': 'i', 'İ': 'I', 'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
    };

    let sanitized = filename;
    
    // Replace Turkish characters
    Object.keys(turkishChars).forEach(char => {
        sanitized = sanitized.replace(new RegExp(char, 'g'), turkishChars[char]);
    });

    // Replace spaces and special characters with underscores, keep alphanumeric and dots/hyphens
    sanitized = sanitized.replace(/\s+/g, '_');
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    return sanitized;
}
