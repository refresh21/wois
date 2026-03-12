const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'log') {
            console.log(`PAGE LOG: ${msg.text()}`);
        }
    });

    await page.goto('http://localhost:3000/note/70c58cc8-e637-4d25-b034-846248248f19');
    await page.waitForTimeout(3000);

    // Expose pdfMake
    const pdfMakeInfo = await page.evaluate(() => {
        const w = window;
        const pm = w.pdfMake;
        if (!pm) return "No window.pdfMake";

        let vfsKeys = pm.vfs ? Object.keys(pm.vfs).slice(0, 5) : "No vfs";
        let virtualfsStore = pm.virtualfs && pm.virtualfs.storage ? Object.keys(pm.virtualfs.storage).slice(0, 5) : "No storage";

        return {
            vfsKeys,
            virtualfsStore,
            fonts: pm.fonts
        }
    });
    console.log("PDFMAKE INIT STATE:", JSON.stringify(pdfMakeInfo, null, 2));

    // Click export
    console.log("Clicking Export PDF...");
    const [download] = await Promise.all([
        page.waitForEvent('download').catch(e => "timeout"),
        page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Export PDF') || b.textContent.includes('PDF'));
            if (btn) btn.click();
        })
    ]);

    if (download === "timeout") {
        console.log("Download did not trigger within timeout!");
    } else if (download) {
        console.log("Download triggered:", await download.path());
    }

    await page.waitForTimeout(2000);
    await browser.close();
})();
