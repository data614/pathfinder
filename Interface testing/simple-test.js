const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshot() {
    console.log('🧪 Starting simple screenshot test...');
    
    const browser = await puppeteer.launch({
        headless: 'new'
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });
        
        // Navigate to the main page using file URL
        const filePath = path.resolve(__dirname, '../index.html');
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
        
        console.log(`📄 Navigating to: ${fileUrl}`);
        
        await page.goto(fileUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait a bit for any dynamic content
        await page.waitForTimeout(3000);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `main-page_${timestamp}.jpg`;
        const filepath = path.join(__dirname, filename);
        
        // Capture screenshot
        await page.screenshot({
            path: filepath,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        
        console.log(`📸 Screenshot saved: ${filename}`);
        
        // Extract text content
        const textContent = await page.evaluate(() => {
            const highlights = [];
            
            // Extract headings
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(h => {
                if (h.textContent.trim()) {
                    highlights.push({
                        type: 'heading',
                        text: h.textContent.trim()
                    });
                }
            });
            
            // Extract buttons
            const buttons = document.querySelectorAll('button, .btn');
            buttons.forEach(btn => {
                if (btn.textContent.trim()) {
                    highlights.push({
                        type: 'button', 
                        text: btn.textContent.trim()
                    });
                }
            });
            
            // Extract important elements
            const important = document.querySelectorAll('.result-title, .stat-number, .badge');
            important.forEach(el => {
                if (el.textContent.trim()) {
                    highlights.push({
                        type: 'data',
                        text: el.textContent.trim()
                    });
                }
            });
            
            return highlights;
        });
        
        console.log(`🔍 Found ${textContent.length} text highlights:`);
        textContent.forEach(item => {
            console.log(`  - ${item.type}: "${item.text}"`);
        });
        
        // Check for key elements
        const elementCheck = await page.evaluate(() => {
            return {
                hasJobList: !!document.getElementById('job-list'),
                hasHallOfFame: !!document.querySelector('.hall-of-fame'),
                hasAutomationButton: !!document.querySelector('[onclick*="openJobs"]'),
                totalElements: document.querySelectorAll('*').length,
                buttons: document.querySelectorAll('button, .btn').length
            };
        });
        
        console.log('📊 Element Analysis:');
        console.log(`  - Job List: ${elementCheck.hasJobList ? '✅' : '❌'}`);
        console.log(`  - Hall of Fame: ${elementCheck.hasHallOfFame ? '✅' : '❌'}`);
        console.log(`  - Automation Button: ${elementCheck.hasAutomationButton ? '✅' : '❌'}`);
        console.log(`  - Total Elements: ${elementCheck.totalElements}`);
        console.log(`  - Buttons: ${elementCheck.buttons}`);
        
        return {
            filename,
            filepath,
            textContent,
            elementCheck,
            success: true
        };
        
    } catch (error) {
        console.error('❌ Screenshot test failed:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the test
captureScreenshot()
    .then(result => {
        if (result.success) {
            console.log('🎉 Screenshot test completed successfully!');
            console.log(`📸 Screenshot file: ${result.filename}`);
        } else {
            console.log('❌ Screenshot test failed:', result.error);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
    });