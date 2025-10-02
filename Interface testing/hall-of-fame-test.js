const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testHallOfFame() {
    console.log('🏆 Starting Hall of Fame functionality test...');
    
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
        
        // Navigate to main page
        const filePath = path.resolve(__dirname, '../index.html');
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
        
        console.log(`📄 Loading: ${fileUrl}`);
        
        await page.goto(fileUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Test Hall of Fame section
        console.log('🔍 Testing Hall of Fame section...');
        
        const hallOfFameTest = await page.evaluate(() => {
            const results = {
                sectionExists: false,
                addButtonExists: false,
                analyzeButtonExists: false,
                placeholderExists: false,
                functionsExist: false,
                sectionContent: '',
                errors: []
            };
            
            try {
                // Check if Hall of Fame section exists
                const hallOfFameSection = document.querySelector('.hall-of-fame');
                results.sectionExists = !!hallOfFameSection;
                
                if (hallOfFameSection) {
                    results.sectionContent = hallOfFameSection.textContent.trim();
                    
                    // Check for Add Success button
                    const addButton = hallOfFameSection.querySelector('.btn-add-success') || 
                                    document.querySelector('[onclick*="showAddSuccessModal"]');
                    results.addButtonExists = !!addButton;
                    
                    // Check for Analyze button  
                    const analyzeButton = hallOfFameSection.querySelector('.btn-analyze') ||
                                        document.querySelector('[onclick*="analyzeSuccessPatterns"]');
                    results.analyzeButtonExists = !!analyzeButton;
                    
                    // Check for placeholder content
                    const placeholder = hallOfFameSection.querySelector('.success-placeholder');
                    results.placeholderExists = !!placeholder;
                }
                
                // Check if JavaScript functions exist
                results.functionsExist = !!(
                    typeof window.showAddSuccessModal === 'function' &&
                    typeof window.analyzeSuccessPatterns === 'function'
                );
                
            } catch (error) {
                results.errors.push(error.message);
            }
            
            return results;
        });
        
        console.log('📊 Hall of Fame Test Results:');
        console.log(`  - Section exists: ${hallOfFameTest.sectionExists ? '✅' : '❌'}`);
        console.log(`  - Add button exists: ${hallOfFameTest.addButtonExists ? '✅' : '❌'}`);
        console.log(`  - Analyze button exists: ${hallOfFameTest.analyzeButtonExists ? '✅' : '❌'}`);
        console.log(`  - Placeholder exists: ${hallOfFameTest.placeholderExists ? '✅' : '❌'}`);
        console.log(`  - Functions exist: ${hallOfFameTest.functionsExist ? '✅' : '❌'}`);
        
        if (hallOfFameTest.errors.length > 0) {
            console.log('⚠️ Errors found:');
            hallOfFameTest.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        // Scroll to Hall of Fame section for screenshot
        await page.evaluate(() => {
            const hallOfFame = document.querySelector('.hall-of-fame');
            if (hallOfFame) {
                hallOfFame.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        await page.waitForTimeout(2000);
        
        // Capture screenshot focused on Hall of Fame
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `hall-of-fame_${timestamp}.jpg`;
        const filepath = path.join(__dirname, filename);
        
        // Get Hall of Fame section bounds for cropped screenshot
        const hallOfFameBounds = await page.evaluate(() => {
            const element = document.querySelector('.hall-of-fame');
            if (element) {
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                };
            }
            return null;
        });
        
        if (hallOfFameBounds) {
            // Capture cropped screenshot of Hall of Fame section
            await page.screenshot({
                path: filepath,
                type: 'jpeg',
                quality: 90,
                clip: {
                    x: Math.max(0, hallOfFameBounds.x - 20),
                    y: Math.max(0, hallOfFameBounds.y - 20),
                    width: Math.min(hallOfFameBounds.width + 40, 1920),
                    height: Math.min(hallOfFameBounds.height + 40, 1080)
                }
            });
        } else {
            // Fallback to full page screenshot
            await page.screenshot({
                path: filepath,
                type: 'jpeg',
                quality: 90,
                fullPage: true
            });
        }
        
        console.log(`📸 Hall of Fame screenshot saved: ${filename}`);
        
        // Test button functionality (simulate click)
        if (hallOfFameTest.addButtonExists) {
            console.log('🧪 Testing Add Success Modal...');
            
            try {
                // Test if modal can be triggered (just check for function call)
                const modalTest = await page.evaluate(() => {
                    try {
                        if (typeof window.showAddSuccessModal === 'function') {
                            // Don't actually call it, just verify it exists
                            return { success: true, message: 'Function available' };
                        } else {
                            return { success: false, message: 'Function not found' };
                        }
                    } catch (error) {
                        return { success: false, message: error.message };
                    }
                });
                
                console.log(`  - Modal function test: ${modalTest.success ? '✅' : '❌'} ${modalTest.message}`);
                
            } catch (error) {
                console.log(`  - Modal test failed: ❌ ${error.message}`);
            }
        }
        
        return {
            success: true,
            filename,
            filepath,
            testResults: hallOfFameTest,
            bounds: hallOfFameBounds
        };
        
    } catch (error) {
        console.error('❌ Hall of Fame test failed:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the Hall of Fame test
testHallOfFame()
    .then(result => {
        if (result.success) {
            console.log('\n🎉 Hall of Fame test completed successfully!');
            console.log(`📸 Screenshot: ${result.filename}`);
            
            // Determine overall test status
            const tests = result.testResults;
            const allTestsPassed = tests.sectionExists && tests.addButtonExists && 
                                 tests.analyzeButtonExists && tests.functionsExist;
            
            if (allTestsPassed) {
                console.log('✅ ALL HALL OF FAME TESTS PASSED! 🏆');
            } else {
                console.log('⚠️ Some Hall of Fame tests failed - auto-fix may be needed.');
            }
        } else {
            console.log('❌ Hall of Fame test failed:', result.error);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
    });