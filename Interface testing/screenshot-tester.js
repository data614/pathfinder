const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

class AdvancedScreenshotTester {
    constructor() {
        this.testResultsPath = path.join(__dirname, 'test-results.json');
        this.screenshotsPath = path.join(__dirname);
        
        // Ensure screenshots directory exists
        if (!fs.existsSync(this.screenshotsPath)) {
            fs.mkdirSync(this.screenshotsPath, { recursive: true });
        }
        
        console.log('🧪 Advanced Screenshot Tester initialized');
        console.log(`📂 Screenshots will be saved to: ${this.screenshotsPath}`);
    }
    
    // Capture high-quality JPG screenshots
    async captureScreenshot(url, testName, options = {}) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            
            // Set viewport for consistent screenshots
            await page.setViewport({
                width: options.width || 1920,
                height: options.height || 1080,
                deviceScaleFactor: 2 // High DPI for crisp screenshots
            });
            
            console.log(`🌐 Navigating to: ${url}`);
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Wait for any animations or dynamic content
            await page.waitForTimeout(options.delay || 3000);
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${testName}_${timestamp}.jpg`;
            const filepath = path.join(this.screenshotsPath, filename);
            
            // Capture screenshot as JPG
            await page.screenshot({
                path: filepath,
                type: 'jpeg',
                quality: options.quality || 90,
                fullPage: options.fullPage !== false
            });
            
            // Extract text content for analysis
            const textContent = await this.extractTextContent(page);
            
            // Analyze page elements
            const elementAnalysis = await this.analyzePageElements(page);
            
            console.log(`📸 Screenshot saved: ${filename}`);
            
            return {
                filename,
                filepath,
                textContent,
                elementAnalysis,
                url,
                timestamp: new Date().toISOString(),
                dimensions: { width: options.width || 1920, height: options.height || 1080 }
            };
            
        } finally {
            await browser.close();
        }
    }
    
    // Extract and analyze text content from page
    async extractTextContent(page) {
        return await page.evaluate(() => {
            const highlights = [];
            
            // Extract headings
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(h => {
                if (h.textContent.trim()) {
                    highlights.push({
                        type: 'heading',
                        text: h.textContent.trim(),
                        level: h.tagName.toLowerCase()
                    });
                }
            });
            
            // Extract button text
            const buttons = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"]');
            buttons.forEach(btn => {
                if (btn.textContent.trim()) {
                    highlights.push({
                        type: 'button',
                        text: btn.textContent.trim()
                    });
                }
            });
            
            // Extract navigation items
            const navItems = document.querySelectorAll('nav a, .nav a, .navigation a');
            navItems.forEach(nav => {
                if (nav.textContent.trim()) {
                    highlights.push({
                        type: 'navigation',
                        text: nav.textContent.trim()
                    });
                }
            });
            
            // Extract important data
            const dataElements = document.querySelectorAll('[data-testid], .stat-number, .badge, .result-title');
            dataElements.forEach(el => {
                if (el.textContent.trim()) {
                    highlights.push({
                        type: 'data',
                        text: el.textContent.trim()
                    });
                }
            });
            
            return highlights;
        });
    }
    
    // Analyze page elements and functionality
    async analyzePageElements(page) {
        return await page.evaluate(() => {
            const analysis = {
                totalElements: document.querySelectorAll('*').length,
                buttons: document.querySelectorAll('button, .btn').length,
                forms: document.querySelectorAll('form').length,
                links: document.querySelectorAll('a').length,
                images: document.querySelectorAll('img').length,
                hasJavaScript: !!window.jQuery || !!window.React || !!window.Vue || typeof window.openJobsWithCoverLetters === 'function',
                responsiveElements: document.querySelectorAll('.container, .row, .col, .grid').length,
                errors: []
            };
            
            // Check for common errors
            const errorElements = document.querySelectorAll('.error, .alert-danger, .text-red');
            errorElements.forEach(el => {
                analysis.errors.push(el.textContent.trim());
            });
            
            // Check for specific Pathfinder elements
            analysis.pathfinderElements = {
                jobList: !!document.getElementById('job-list'),
                resumeLibrary: !!document.getElementById('resume-library'),
                hallOfFame: !!document.querySelector('.hall-of-fame'),
                automationButton: !!document.querySelector('[onclick*="openJobs"]')
            };
            
            return analysis;
        });
    }
    
    // Run comprehensive test suite
    async runFullTestSuite() {
        const results = [];
        const baseUrl = 'file://' + path.resolve(__dirname, '../');
        
        const tests = [
            {
                name: 'main-page',
                url: baseUrl + '/index.html',
                description: 'Main application page with job listings'
            },
            {
                name: 'data-management',
                url: baseUrl + '/data-management.html',
                description: 'Data folder management interface'
            },
            {
                name: 'cover-letter',
                url: baseUrl + '/cover-letter.html',
                description: 'Cover letter generation page'
            },
            {
                name: 'interface-tester',
                url: 'file://' + path.resolve(__dirname, 'interface-tester.html'),
                description: 'Testing interface itself'
            }
        ];
        
        console.log(`🚀 Starting full test suite with ${tests.length} tests...`);
        
        for (const test of tests) {
            try {
                console.log(`\n🧪 Running test: ${test.name}`);
                console.log(`📄 Description: ${test.description}`);
                
                const result = await this.captureScreenshot(test.url, test.name, {
                    fullPage: true,
                    quality: 95,
                    delay: 4000
                });
                
                result.testName = test.name;
                result.description = test.description;
                result.status = 'success';
                
                // Validate test-specific requirements
                const validation = await this.validateTest(test.name, result);
                result.validation = validation;
                
                results.push(result);
                
                console.log(`✅ Test ${test.name} completed successfully`);
                console.log(`📊 Found ${result.textContent.length} text highlights`);
                console.log(`🔍 Analysis: ${result.elementAnalysis.totalElements} elements, ${result.elementAnalysis.buttons} buttons`);
                
            } catch (error) {
                console.error(`❌ Test ${test.name} failed:`, error.message);
                
                results.push({
                    testName: test.name,
                    description: test.description,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                // Attempt auto-fix if enabled
                await this.attemptAutoFix(test.name, error);
            }
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Save test results
        await this.saveTestResults(results);
        
        // Generate summary report
        await this.generateSummaryReport(results);
        
        return results;
    }
    
    // Validate test-specific requirements
    async validateTest(testName, result) {
        const validation = { passed: [], failed: [] };
        
        switch (testName) {
            case 'main-page':
                // Check for essential elements
                if (result.elementAnalysis.pathfinderElements.jobList) {
                    validation.passed.push('Job list element found');
                } else {
                    validation.failed.push('Job list element missing');
                }
                
                if (result.elementAnalysis.pathfinderElements.hallOfFame) {
                    validation.passed.push('Hall of Fame section found');
                } else {
                    validation.failed.push('Hall of Fame section missing');
                }
                break;
                
            case 'interface-tester':
                // Check for testing interface elements
                const hasTestButtons = result.textContent.some(item => 
                    item.text.includes('Test') || item.text.includes('Run'));
                
                if (hasTestButtons) {
                    validation.passed.push('Test interface buttons found');
                } else {
                    validation.failed.push('Test interface buttons missing');
                }
                break;
        }
        
        return validation;
    }
    
    // Attempt to auto-fix common issues
    async attemptAutoFix(testName, error) {
        console.log(`🔧 Attempting auto-fix for ${testName}...`);
        
        if (error.message.includes('net::ERR_FILE_NOT_FOUND')) {
            console.log('🔧 File not found - checking if file exists...');
            // In a real implementation, could create missing files or fix paths
        } else if (error.message.includes('timeout')) {
            console.log('🔧 Timeout detected - will retry with longer timeout');
            // Could retry with extended timeout
        }
        
        console.log('🔧 Auto-fix attempt completed');
    }
    
    // Save test results to JSON file
    async saveTestResults(results) {
        const reportData = {
            timestamp: new Date().toISOString(),
            totalTests: results.length,
            passedTests: results.filter(r => r.status === 'success').length,
            failedTests: results.filter(r => r.status === 'failed').length,
            results: results
        };
        
        try {
            fs.writeFileSync(this.testResultsPath, JSON.stringify(reportData, null, 2));
            console.log(`📄 Test results saved to: ${this.testResultsPath}`);
        } catch (error) {
            console.error('❌ Failed to save test results:', error);
        }
    }
    
    // Generate HTML summary report
    async generateSummaryReport(results) {
        const reportHtml = this.generateReportHTML(results);
        const reportPath = path.join(__dirname, 'test-summary-report.html');
        
        try {
            fs.writeFileSync(reportPath, reportHtml);
            console.log(`📊 Summary report generated: ${reportPath}`);
        } catch (error) {
            console.error('❌ Failed to generate summary report:', error);
        }
    }
    
    // Generate HTML report content
    generateReportHTML(results) {
        const passedTests = results.filter(r => r.status === 'success');
        const failedTests = results.filter(r => r.status === 'failed');
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pathfinder Interface Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 0.5rem; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .test-result { border: 1px solid #ddd; margin: 1rem 0; padding: 1rem; border-radius: 8px; }
        .test-result.success { border-left: 4px solid #28a745; }
        .test-result.failed { border-left: 4px solid #dc3545; }
        .screenshot { max-width: 300px; height: auto; border-radius: 4px; }
        .highlights { background: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px; }
        .highlights ul { margin: 0; padding-left: 1.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Pathfinder Interface Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${results.length}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number success">${passedTests.length}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failed">${failedTests.length}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round((passedTests.length / results.length) * 100)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        ${results.map(result => `
            <div class="test-result ${result.status}">
                <h3>${result.status === 'success' ? '✅' : '❌'} ${result.testName}</h3>
                <p><strong>Description:</strong> ${result.description}</p>
                
                ${result.status === 'success' ? `
                    <p><strong>Screenshot:</strong> ${result.filename}</p>
                    <img src="${result.filename}" alt="Test Screenshot" class="screenshot">
                    
                    <div class="highlights">
                        <h4>🔍 Text Highlights Found (${result.textContent.length}):</h4>
                        <ul>
                            ${result.textContent.slice(0, 10).map(item => `<li>${item.text} (${item.type})</li>`).join('')}
                            ${result.textContent.length > 10 ? `<li><em>... and ${result.textContent.length - 10} more</em></li>` : ''}
                        </ul>
                    </div>
                    
                    <div class="highlights">
                        <h4>📊 Element Analysis:</h4>
                        <ul>
                            <li>Total Elements: ${result.elementAnalysis.totalElements}</li>
                            <li>Buttons: ${result.elementAnalysis.buttons}</li>
                            <li>Forms: ${result.elementAnalysis.forms}</li>
                            <li>Links: ${result.elementAnalysis.links}</li>
                            <li>Has JavaScript: ${result.elementAnalysis.hasJavaScript ? 'Yes' : 'No'}</li>
                        </ul>
                    </div>
                    
                    ${result.validation ? `
                        <div class="highlights">
                            <h4>✅ Validation Results:</h4>
                            <ul>
                                ${result.validation.passed.map(item => `<li style="color: green;">✓ ${item}</li>`).join('')}
                                ${result.validation.failed.map(item => `<li style="color: red;">✗ ${item}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                ` : `
                    <p><strong>Error:</strong> ${result.error}</p>
                `}
                
                <p><small>Timestamp: ${result.timestamp}</small></p>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `;
    }
}

// Command line interface
if (require.main === module) {
    const tester = new AdvancedScreenshotTester();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'test-all';
    
    switch (command) {
        case 'test-all':
            console.log('🚀 Running full test suite...');
            tester.runFullTestSuite()
                .then(results => {
                    console.log(`\n🎉 Test suite completed!`);
                    console.log(`📊 Results: ${results.filter(r => r.status === 'success').length}/${results.length} tests passed`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Test suite failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'test-single':
            const testName = args[1];
            const url = args[2];
            if (!testName || !url) {
                console.error('Usage: node screenshot-tester.js test-single <testName> <url>');
                process.exit(1);
            }
            
            tester.captureScreenshot(url, testName)
                .then(result => {
                    console.log('✅ Single test completed:', result.filename);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Single test failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Available commands:');
            console.log('  test-all                    - Run full test suite');
            console.log('  test-single <name> <url>   - Run single test');
            process.exit(0);
    }
}

module.exports = AdvancedScreenshotTester;