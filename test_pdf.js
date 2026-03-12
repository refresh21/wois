const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    let downloadTriggered = false;
    page.on('download', (download) => {
        downloadTriggered = true;
        console.log(`DOWNLOAD SUCCESSFUL: ${download.suggestedFilename()}`);
    });

    page.on('pageerror', (err) => {
        console.log(`PAGE ERROR: ${err.message}`);
    });

    try {
        console.log("Navigating...");
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);

        console.log("Clicking note link...");
        await page.evaluate(() => {
            const memoryLinks = Array.from(document.querySelectorAll('a'));
            const memoryLink = memoryLinks.find(el => el.textContent.includes('Memory'));
            if (memoryLink) memoryLink.click();
        });

        await page.waitForTimeout(2000);

        console.log("Clicking recent note...");
        await page.evaluate(() => {
            const cards = document.querySelectorAll('.memory-card');
            if (cards.length > 0) cards[0].click();
        });

        await page.waitForTimeout(2000);

        console.log("Clicking Export PDF...");
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const exportBtn = buttons.find(b => b.textContent.includes('Export PDF') || b.textContent.includes('PDF İndir'));
            if (exportBtn) exportBtn.click();
        });

        await page.waitForTimeout(3000);

        if (downloadTriggered) {
            console.log("SUCCESS: PDF Export triggered without errors.");
        } else {
            console.log("FAILED: PDF Export did not trigger a download event. Check page errors.");
        }
    } catch (e) {
        console.error("Test script failed:", e);
    } finally {
        await browser.close();
    }
})();
