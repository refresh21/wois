const fs = require('fs');
const https = require('https');
const path = require('path');

const fontsToDownload = [
    { name: 'Poppins-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf' },
    { name: 'Poppins-Medium.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Medium.ttf' },
    { name: 'Poppins-SemiBold.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf' },
    { name: 'Poppins-Bold.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf' },
];

const downloadFont = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data).toString('base64')));
        }).on('error', reject);
    });
};

async function buildVfs() {
    console.log('Downloading fonts...');
    const vfs = {};
    for (const font of fontsToDownload) {
        console.log(`Downloading ${font.name}...`);
        try {
            const base64 = await downloadFont(font.url);
            vfs[font.name] = base64;
            console.log(`Successfully downloaded and encoded ${font.name} (${base64.length} chars)`);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    const outputDir = path.join(__dirname, '..', 'src', 'lib', 'fonts');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'vfs_fonts.js');
    const content = `export const fontVfs = ${JSON.stringify(vfs, null, 2)};`;

    fs.writeFileSync(outputPath, content);
    console.log(`Generated VFS fonts file at ${outputPath}`);
}

buildVfs();
