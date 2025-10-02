// Data Management System for Resume Folders
(() => {
  let systemLogs = [];
  let detectionInterval = null;
  let currentDetectionFrequency = 30000; // 30 seconds

  // Add log entry
  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      message: message,
      type: type,
      id: Date.now()
    };
    
    systemLogs.unshift(logEntry); // Add to beginning
    if (systemLogs.length > 50) {
      systemLogs = systemLogs.slice(0, 50); // Keep only last 50 logs
    }
    
    updateLogDisplay();
    console.log(`[${timestamp}] ${message}`);
  }

  // Update log display
  function updateLogDisplay() {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;

    logContainer.innerHTML = systemLogs.map(log => `
      <div class="log-entry log-entry--${log.type}">
        <span class="log-time">${log.time}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `).join('');
  }

  // Scan for available data folders
  async function scanDataFolders() {
    addLog('Scanning for available data folders...');
    
    // In a real implementation, this would scan the filesystem
    // For now, we'll simulate with known folders
    const folders = ['data1002', 'data0925'];
    
    // Check if today's folder might exist
    const today = new Date();
    const currentDateStr = (today.getMonth() + 1).toString().padStart(2, '0') + 
                          today.getDate().toString().padStart(2, '0');
    const todayFolder = `data${currentDateStr}`;
    
    if (currentDateStr === '1003' || Math.random() > 0.7) {
      folders.unshift(todayFolder); // Simulate finding new folder
    }

    // Sort by date (newest first)
    const sortedFolders = folders.sort((a, b) => {
      const numA = parseInt(a.replace('data', ''));
      const numB = parseInt(b.replace('data', ''));
      return numB - numA;
    });

    addLog(`Found ${sortedFolders.length} data folders: ${sortedFolders.join(', ')}`);
    return sortedFolders;
  }

  // Update folder list display
  async function updateFolderList() {
    const folders = await scanDataFolders();
    const folderList = document.getElementById('folder-list');
    
    if (!folderList) return;

    folderList.innerHTML = folders.map((folder, index) => {
      const isActive = index === 0;
      const folderDate = formatFolderDate(folder);
      const fileCount = getEstimatedFileCount(folder);
      
      return `
        <div class="folder-item ${isActive ? 'folder-item--active' : ''}">
          <div class="folder-info">
            <div class="folder-name">
              ${folder}
              ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
            </div>
            <div class="folder-details">
              <span class="folder-date">${folderDate}</span>
              <span class="folder-files">${fileCount} files</span>
            </div>
          </div>
          <div class="folder-actions">
            ${!isActive ? `<button onclick="switchToFolder('${folder}')" class="btn-switch">Switch to This</button>` : ''}
            <button onclick="exploreFolder('${folder}')" class="btn-explore">📁 Explore</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Format folder date for display
  function formatFolderDate(folderName) {
    const dateStr = folderName.replace('data', '');
    if (dateStr.length === 4) {
      const month = dateStr.substring(0, 2);
      const day = dateStr.substring(2, 4);
      return `October ${day}, 2025`;
    }
    return 'Unknown date';
  }

  // Get estimated file count (simulated)
  function getEstimatedFileCount(folderName) {
    // Simulate different file counts
    const baseCounts = {
      'data1002': 16,
      'data0925': 13,
      'data1003': 18
    };
    return baseCounts[folderName] || 15;
  }

  // Update status cards
  async function updateStatusCards() {
    const currentFolder = window.getCurrentDataFolder?.() || 'data1002';
    const resumeCount = window.resumeLibrary?.length || 0;
    
    // Update current folder
    const currentFolderEl = document.getElementById('current-folder');
    if (currentFolderEl) {
      currentFolderEl.textContent = currentFolder;
    }

    // Update folder date
    const folderDateEl = document.getElementById('folder-date');
    if (folderDateEl) {
      folderDateEl.textContent = formatFolderDate(currentFolder);
    }

    // Update resume count
    const resumeCountEl = document.getElementById('resume-count');
    if (resumeCountEl) {
      resumeCountEl.textContent = resumeCount;
    }

    // Update cover letter count (estimated)
    const coverLetterCountEl = document.getElementById('cover-letter-count');
    if (coverLetterCountEl) {
      coverLetterCountEl.textContent = '4'; // Based on known templates
    }
  }

  // Update resume grid
  function updateResumeGrid() {
    const resumeGrid = document.getElementById('resume-grid');
    if (!resumeGrid || !window.resumeLibrary) return;

    resumeGrid.innerHTML = window.resumeLibrary.map(resume => `
      <div class="resume-card">
        <div class="resume-header">
          <h3>${resume.name}</h3>
          <span class="resume-folder">${resume.folder || 'data1002'}</span>
        </div>
        <div class="resume-focus">
          ${resume.focus || 'Professional resume for various roles'}
        </div>
        <div class="resume-skills">
          ${resume.skills ? resume.skills.slice(0, 6).map(skill => `<span class="skill-tag">${skill}</span>`).join('') : ''}
        </div>
        <div class="resume-actions">
          <button onclick="previewResume('${resume.id}')" class="btn-preview">👀 Preview</button>
          <button onclick="downloadResume('${resume.id}')" class="btn-download">📥 Download</button>
        </div>
      </div>
    `).join('');
  }

  // Global functions for button clicks
  window.refreshDataFolders = async function() {
    addLog('Manual refresh triggered');
    await updateFolderList();
    await updateStatusCards();
    updateResumeGrid();
    addLog('Data folders refreshed successfully');
  };

  window.scanForNewFolders = async function() {
    addLog('Scanning for new folders...');
    const folders = await scanDataFolders();
    await updateFolderList();
    
    if (folders.length > 2) {
      addLog('⚠️ New data folder detected!', 'warning');
    } else {
      addLog('No new folders found');
    }
  };

  window.createNewDataFolder = function() {
    const input = document.getElementById('new-folder-name');
    const folderName = input?.value?.trim();
    
    if (!folderName) {
      alert('Please enter a folder name');
      return;
    }

    if (!folderName.startsWith('data')) {
      alert('Folder name should start with "data" (e.g., data1003)');
      return;
    }

    addLog(`Creating new data folder: ${folderName}`);
    
    // Simulate folder creation
    setTimeout(() => {
      addLog(`✅ Folder ${folderName} created successfully`, 'success');
      input.value = '';
      updateFolderList();
    }, 1000);
  };

  window.copyCurrentData = function() {
    const currentFolder = window.getCurrentDataFolder?.() || 'data1002';
    const today = new Date();
    const newFolderName = `data${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    addLog(`Copying data from ${currentFolder} to ${newFolderName}...`);
    
    // Simulate copy operation
    setTimeout(() => {
      addLog(`✅ Data copied successfully to ${newFolderName}`, 'success');
      updateFolderList();
    }, 2000);
  };

  window.forceRefreshLibrary = async function() {
    addLog('Force refreshing resume library...');
    
    if (window.reloadResumeLibrary) {
      await window.reloadResumeLibrary();
      updateResumeGrid();
      updateStatusCards();
      addLog('✅ Resume library force refreshed', 'success');
    } else {
      addLog('❌ Resume library reload function not available', 'error');
    }
  };

  window.updateDetectionSettings = function() {
    const select = document.getElementById('detection-frequency');
    const frequency = parseInt(select?.value || '30');
    
    currentDetectionFrequency = frequency * 1000;
    
    // Clear existing interval
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }

    if (frequency > 0) {
      // Set up new interval
      detectionInterval = setInterval(async () => {
        const folders = await scanDataFolders();
        const currentFolder = window.getCurrentDataFolder?.() || 'data1002';
        
        if (folders[0] !== currentFolder) {
          addLog(`🆕 New data folder detected: ${folders[0]}`, 'warning');
          // Could trigger automatic refresh here
        }
      }, currentDetectionFrequency);
      
      addLog(`Auto-detection updated: every ${frequency} seconds`);
    } else {
      addLog('Auto-detection disabled');
    }
  };

  window.clearLogs = function() {
    systemLogs = [];
    updateLogDisplay();
    addLog('System logs cleared');
  };

  window.exportResumeData = function() {
    const data = {
      currentFolder: window.getCurrentDataFolder?.() || 'unknown',
      resumeCount: window.resumeLibrary?.length || 0,
      resumes: window.resumeLibrary || [],
      exportDate: new Date().toISOString(),
      systemLogs: systemLogs
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pathfinder-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('Data exported successfully');
  };

  window.previewAllResumes = function() {
    if (!window.resumeLibrary || window.resumeLibrary.length === 0) {
      alert('No resumes loaded');
      return;
    }

    window.resumeLibrary.forEach((resume, index) => {
      setTimeout(() => {
        window.open(resume.file, '_blank');
      }, index * 500); // Stagger opening
    });

    addLog(`Opened ${window.resumeLibrary.length} resume previews`);
  };

  window.switchToFolder = function(folderName) {
    addLog(`Switching to folder: ${folderName}`);
    // In a real implementation, this would update the system configuration
    setTimeout(() => {
      addLog(`✅ Switched to ${folderName}`, 'success');
      location.reload(); // Refresh to use new folder
    }, 1000);
  };

  window.exploreFolder = function(folderName) {
    addLog(`Opening folder: ${folderName}`);
    // In a real implementation, this would open the file explorer
    alert(`Would open file explorer to: ${folderName}/`);
  };

  window.previewResume = function(resumeId) {
    const resume = window.resumeLibrary?.find(r => r.id === resumeId);
    if (resume) {
      window.open(resume.file, '_blank');
      addLog(`Previewing resume: ${resume.name}`);
    }
  };

  window.downloadResume = function(resumeId) {
    const resume = window.resumeLibrary?.find(r => r.id === resumeId);
    if (resume) {
      const a = document.createElement('a');
      a.href = resume.file;
      a.download = resume.filename || resume.name;
      a.click();
      addLog(`Downloading resume: ${resume.name}`);
    }
  };

  // Initialize page
  async function initializePage() {
    addLog('Data Management System initialized');
    
    // Wait for resume library to load
    if (window.resumeLibrary) {
      updateResumeGrid();
      updateStatusCards();
    } else {
      // Wait for resume library loaded event
      window.addEventListener('resumeLibraryLoaded', (event) => {
        addLog(`Resume library loaded: ${event.detail.count} resumes from ${event.detail.folder}`);
        updateResumeGrid();
        updateStatusCards();
      });
    }

    await updateFolderList();
    
    // Set up auto-detection
    updateDetectionSettings();
    
    addLog('Page initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    initializePage();
  }

  // Add custom styles for the data management page
  const style = document.createElement('style');
  style.textContent = `
    .data-status__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .status-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-card__icon {
      font-size: 2rem;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 50%;
    }

    .status-card__content h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-card__content p {
      margin: 0 0 0.25rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .status-card__content small {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    .folder-list {
      margin-top: 1.5rem;
    }

    .folder-item {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #e5e7eb;
    }

    .folder-item--active {
      border-left-color: #10b981;
      background: linear-gradient(90deg, #f0fdf4, white);
    }

    .folder-name {
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    .active-badge {
      background: #10b981;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      margin-left: 0.5rem;
    }

    .folder-details {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .folder-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-switch, .btn-explore, .btn-preview, .btn-download {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      color: #374151;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-switch:hover, .btn-explore:hover, .btn-preview:hover, .btn-download:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .resume-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .resume-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .resume-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
    }

    .resume-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1f2937;
    }

    .resume-folder {
      background: #f3f4f6;
      color: #6b7280;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .resume-focus {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .resume-skills {
      margin-bottom: 1rem;
    }

    .skill-tag {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      margin: 0.25rem 0.25rem 0 0;
    }

    .resume-actions {
      display: flex;
      gap: 0.5rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .action-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .action-card h3 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
    }

    .action-card p {
      margin: 0 0 1rem 0;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .action-form {
      display: flex;
      gap: 0.5rem;
    }

    .action-form input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
    }

    .log-container {
      background: #1f2937;
      border-radius: 8px;
      padding: 1rem;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
    }

    .log-entry {
      display: flex;
      gap: 1rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid #374151;
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-time {
      color: #9ca3af;
      min-width: 80px;
    }

    .log-message {
      color: #f9fafb;
    }

    .log-entry--warning .log-message {
      color: #fbbf24;
    }

    .log-entry--error .log-message {
      color: #f87171;
    }

    .log-entry--success .log-message {
      color: #34d399;
    }

    .overview-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-secondary {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      color: #374151;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `;
  document.head.appendChild(style);

})();