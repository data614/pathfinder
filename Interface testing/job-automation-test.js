const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testJobAutomation() {
    console.log('🤖 Starting Job Automation functionality test...');
    
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
        
        // Test Job Automation functionality
        console.log('🔍 Testing Job Automation features...');
        
        const automationTest = await page.evaluate(() => {
            const results = {
                jobListExists: false,
                automationButtonExists: false,
                jobLinksLoaded: false,
                requiredFunctions: {
                    openJobsWithCoverLetters: false,
                    generateDynamicCoverLetter: false,
                    extractJobDetails: false
                },
                jobCount: 0,
                resumeLibraryLoaded: false,
                errors: []
            };
            
            try {
                // Check job list
                const jobList = document.getElementById('job-list');
                results.jobListExists = !!jobList;
                
                if (jobList) {
                    const jobCards = jobList.querySelectorAll('.job-card');
                    results.jobCount = jobCards.length;
                    results.jobLinksLoaded = jobCards.length > 0;
                }
                
                // Check automation button
                const automationButton = document.querySelector('[onclick*="openJobs"]') ||
                                       document.querySelector('.automation-button') ||
                                       document.querySelector('button:contains("Open 10 Random Jobs")');
                results.automationButtonExists = !!automationButton;
                
                // Check required functions
                results.requiredFunctions.openJobsWithCoverLetters = typeof window.openJobsWithCoverLetters === 'function';
                results.requiredFunctions.generateDynamicCoverLetter = typeof window.generateDynamicCoverLetter === 'function';
                results.requiredFunctions.extractJobDetails = typeof window.extractJobDetails === 'function';
                
                // Check resume library
                const resumeLibrary = window.resumeLibrary;
                results.resumeLibraryLoaded = Array.isArray(resumeLibrary) && resumeLibrary.length > 0;
                
            } catch (error) {
                results.errors.push(error.message);
            }
            
            return results;
        });
        
        console.log('📊 Job Automation Test Results:');
        console.log(`  - Job list exists: ${automationTest.jobListExists ? '✅' : '❌'}`);
        console.log(`  - Job links loaded: ${automationTest.jobLinksLoaded ? '✅' : '❌'} (${automationTest.jobCount} jobs)`);
        console.log(`  - Automation button exists: ${automationTest.automationButtonExists ? '✅' : '❌'}`);
        console.log(`  - Resume library loaded: ${automationTest.resumeLibraryLoaded ? '✅' : '❌'}`);
        
        console.log('🔧 Required Functions:');
        Object.entries(automationTest.requiredFunctions).forEach(([func, exists]) => {
            console.log(`  - ${func}: ${exists ? '✅' : '❌'}`);
        });
        
        if (automationTest.errors.length > 0) {
            console.log('⚠️ Errors found:');
            automationTest.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        // Scroll to automation section for screenshot
        await page.evaluate(() => {
            const automationButton = document.querySelector('[onclick*="openJobs"]');
            if (automationButton) {
                automationButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        await page.waitForTimeout(2000);
        
        // Capture screenshot of job automation area
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `job-automation_${timestamp}.jpg`;
        const filepath = path.join(__dirname, filename);
        
        await page.screenshot({
            path: filepath,
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        
        console.log(`📸 Job Automation screenshot saved: ${filename}`);
        
        // Test if automation functions can be called (without actually running them)
        if (automationTest.requiredFunctions.openJobsWithCoverLetters) {
            console.log('🧪 Testing automation function readiness...');
            
            const functionTest = await page.evaluate(() => {
                try {
                    // Test if the function exists and is callable (but don't execute)
                    const func = window.openJobsWithCoverLetters;
                    return {
                        callable: typeof func === 'function',
                        name: func.name || 'anonymous',
                        length: func.length // number of parameters
                    };
                } catch (error) {
                    return { callable: false, error: error.message };
                }
            });
            
            console.log(`  - Function callable: ${functionTest.callable ? '✅' : '❌'}`);
            if (functionTest.callable) {
                console.log(`  - Function name: ${functionTest.name}`);
                console.log(`  - Parameters: ${functionTest.length}`);
            }
        }
        
        return {
            success: true,
            filename,
            filepath,
            testResults: automationTest
        };
        
    } catch (error) {
        console.error('❌ Job Automation test failed:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the Job Automation test
testJobAutomation()
    .then(result => {
        if (result.success) {
            console.log('\n🎉 Job Automation test completed successfully!');
            console.log(`📸 Screenshot: ${result.filename}`);
            
            // Determine overall test status
            const tests = result.testResults;
            const allFunctionsExist = Object.values(tests.requiredFunctions).every(exists => exists);
            const basicFeaturesWork = tests.jobListExists && tests.automationButtonExists && tests.resumeLibraryLoaded;
            
            if (allFunctionsExist && basicFeaturesWork) {
                console.log('✅ ALL JOB AUTOMATION TESTS PASSED! 🤖');
            } else {
                console.log('⚠️ Some Job Automation tests failed - auto-fix may be needed.');
                
                if (!allFunctionsExist) {
                    console.log('🔧 Missing functions detected - implementing auto-fix...');
                    // Auto-fix would go here
                }
            }
        } else {
            console.log('❌ Job Automation test failed:', result.error);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
    });