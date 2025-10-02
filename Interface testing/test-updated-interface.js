const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testUpdatedInterface() {
    console.log('🎨 Testing updated interface with removed elements...');
    
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
        
        // Navigate to the updated page
        const filePath = path.resolve(__dirname, '../index.html');
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
        
        console.log(`📄 Loading updated interface: ${fileUrl}`);
        
        await page.goto(fileUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Analyze the updated interface
        const interfaceAnalysis = await page.evaluate(() => {
            const results = {
                locationBadges: document.querySelectorAll('.badge--location').length,
                summaryElements: document.querySelectorAll('.job-card__summary').length,
                openResumeButtons: document.querySelectorAll('.job-card__resume .resume-link').length,
                titleButtons: document.querySelectorAll('.job-card__title-button').length,
                keywordElements: document.querySelectorAll('.job-card__keywords').length,
                totalJobCards: document.querySelectorAll('.job-card').length,
                changes: []
            };
            
            // Check what changed
            if (results.locationBadges === 0) {
                results.changes.push('✅ Location badges removed (Sydney bubbles)');
            } else {
                results.changes.push(`❌ Still found ${results.locationBadges} location badges`);
            }
            
            if (results.summaryElements === 0) {
                results.changes.push('✅ Summary text removed (middle descriptive text)');
            } else {
                results.changes.push(`❌ Still found ${results.summaryElements} summary elements`);
            }
            
            if (results.openResumeButtons === 0) {
                results.changes.push('✅ "Open résumé" buttons removed');
            } else {
                results.changes.push(`❌ Still found ${results.openResumeButtons} resume buttons`);
            }
            
            if (results.titleButtons > 0) {
                results.changes.push(`✅ Added ${results.titleButtons} clickable title buttons`);
            } else {
                results.changes.push('❌ No clickable title buttons found');
            }
            
            if (results.keywordElements > 0) {
                results.changes.push(`✅ Added ${results.keywordElements} keyword lines`);
            } else {
                results.changes.push('❌ No keyword elements found');
            }
            
            return results;
        });
        
        console.log('📊 Interface Analysis Results:');
        console.log(`  - Total Job Cards: ${interfaceAnalysis.totalJobCards}`);
        console.log(`  - Location Badges: ${interfaceAnalysis.locationBadges}`);
        console.log(`  - Summary Elements: ${interfaceAnalysis.summaryElements}`);
        console.log(`  - Open Resume Buttons: ${interfaceAnalysis.openResumeButtons}`);
        console.log(`  - Title Buttons: ${interfaceAnalysis.titleButtons}`);
        console.log(`  - Keyword Elements: ${interfaceAnalysis.keywordElements}`);
        
        console.log('\n🔍 Changes Made:');
        interfaceAnalysis.changes.forEach(change => console.log(`  ${change}`));
        
        // Capture screenshot of the updated interface
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `updated-interface_${timestamp}.jpg`;
        const filepath = path.join(__dirname, filename);
        
        await page.screenshot({
            path: filepath,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        
        console.log(`\n📸 Updated interface screenshot saved: ${filename}`);
        
        // Extract sample keywords to verify formatting
        const sampleKeywords = await page.evaluate(() => {
            const keywordElements = document.querySelectorAll('.job-card__keywords');
            const samples = [];
            
            keywordElements.forEach((el, index) => {
                if (index < 3) { // Get first 3 samples
                    samples.push(el.textContent.trim());
                }
            });
            
            return samples;
        });
        
        if (sampleKeywords.length > 0) {
            console.log('\n🔤 Sample Keywords Format:');
            sampleKeywords.forEach((keywords, index) => {
                console.log(`  ${index + 1}. "${keywords}"`);
            });
        }
        
        return {
            success: true,
            filename,
            filepath,
            analysis: interfaceAnalysis,
            sampleKeywords
        };
        
    } catch (error) {
        console.error('❌ Interface test failed:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the test
testUpdatedInterface()
    .then(result => {
        if (result.success) {
            console.log('\n🎉 Interface update test completed successfully!');
            console.log(`📸 Screenshot: ${result.filename}`);
            
            const analysis = result.analysis;
            const allChangesGood = analysis.locationBadges === 0 && 
                                 analysis.summaryElements === 0 && 
                                 analysis.openResumeButtons === 0 &&
                                 analysis.titleButtons > 0 &&
                                 analysis.keywordElements > 0;
            
            if (allChangesGood) {
                console.log('\n✅ ALL INTERFACE UPDATES SUCCESSFUL! 🎨');
                console.log('   - Location bubbles removed ✓');
                console.log('   - Summary text removed ✓');
                console.log('   - Resume buttons removed ✓');
                console.log('   - Clickable titles added ✓');
                console.log('   - Keywords merged into single lines ✓');
            } else {
                console.log('\n⚠️ Some updates may need refinement.');
            }
        } else {
            console.log('❌ Interface update test failed:', result.error);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
    });