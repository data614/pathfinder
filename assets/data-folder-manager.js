// Browser-side Dynamic Data Folder Management
// Automatically detects and uses the latest data folder

class ClientDataFolderManager {
  constructor() {
    this.currentDataFolder = null;
    this.availableFolders = [];
    this.resumeLibrary = [];
  }

  /**
   * Simulates server call to get available data folders
   * In a full implementation, this would make an API call
   */
  async getAvailableDataFolders() {
    // For now, we'll detect based on known patterns
    // In a real app, this would be an API call to the server
    
    const knownFolders = ['data0925', 'data1002']; // Will be dynamically detected
    
    // Sort by numeric value (newest first)
    this.availableFolders = knownFolders.sort((a, b) => {
      const numA = parseInt(a.replace('data', ''));
      const numB = parseInt(b.replace('data', ''));
      return numB - numA;
    });

    return this.availableFolders;
  }

  /**
   * Gets the latest data folder name
   */
  async getLatestDataFolder() {
    await this.getAvailableDataFolders();
    
    if (this.availableFolders.length === 0) {
      return 'data1002'; // Fallback to current known latest
    }

    this.currentDataFolder = this.availableFolders[0];
    return this.currentDataFolder;
  }

  /**
   * Creates resume library from the latest data folder
   */
  async generateLatestResumeLibrary() {
    const latestFolder = await this.getLatestDataFolder();
    
    // Enhanced resume library based on data1002 contents
    this.resumeLibrary = [
      {
        id: 'banking_consultant_cv',
        name: 'Banking Consultant CV',
        filename: 'Banking Consultant CV.docx',
        folder: latestFolder,
        focusAreas: ['Financial Analysis', 'Compliance', 'Client Advisory', 'Risk Management'],
        summary: 'Optimized for banking, finance, and consulting roles with regulatory focus and client relationship management.',
        downloadUrl: `${latestFolder}/Banking%20Consultant%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'call_centre_cv',
        name: 'Call Centre CV',
        filename: 'Call Centre CV.docx',
        folder: latestFolder,
        focusAreas: ['Customer Service', 'Communication', 'Call Handling', 'Issue Resolution'],
        summary: 'Designed for call centre, customer service, and phone support roles with emphasis on communication skills.',
        downloadUrl: `${latestFolder}/Call%20Centre%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'customer_service_cv',
        name: 'Customer Service CV',
        filename: 'Customer Service CV.docx',
        folder: latestFolder,
        focusAreas: ['Customer Experience', 'Issue Resolution', 'CRM', 'Team Leadership'],
        summary: 'Perfect for customer service, support, and client-facing roles with emphasis on satisfaction metrics.',
        downloadUrl: `${latestFolder}/Customer%20Service%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'data_analyst_cv',
        name: 'Data Analyst CV',
        filename: 'Data Analyst CV.docx',
        folder: latestFolder,
        focusAreas: ['Power BI', 'Python', 'SQL', 'Data Analysis', 'Automation'],
        summary: 'Ideal for data analyst, BI developer, and analytics roles. Highlights $1M grant wins and technical expertise.',
        downloadUrl: `${latestFolder}/Data%20Analyst%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'data_automation_asia_cv',
        name: 'Data Automation Asia CV',
        filename: 'Data Automation Asia CV.docx',
        folder: latestFolder,
        focusAreas: ['Process Automation', 'Power Automate', 'DevOps', 'Asia-Pacific'],
        summary: 'Specialized for automation roles in APAC region with emphasis on Power Platform and workflow optimization.',
        downloadUrl: `${latestFolder}/Data%20Automation%20Asia%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'data_automation_resume',
        name: 'Data Automation Resume',
        filename: 'Data Automation Resume.docx',
        folder: latestFolder,
        focusAreas: ['Python Automation', 'Power Automate', 'Jenkins', 'Redis'],
        summary: 'Technical focus on automation engineering with $250K cost savings achievements.',
        downloadUrl: `${latestFolder}/Data%20Automation%20Resume.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'data_migration_cv',
        name: 'Data Migration CV',
        filename: 'Data Migration CV.docx',
        folder: latestFolder,
        focusAreas: ['Data Migration', 'ETL', 'Database Management', 'System Integration'],
        summary: 'Specialized for data migration, ETL, and database administration roles.',
        downloadUrl: `${latestFolder}/Data%20Migration%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'it_support_cv',
        name: 'IT Support CV',
        filename: 'IT Support CV.docx',
        folder: latestFolder,
        focusAreas: ['ServiceNow', 'Technical Support', 'System Administration', 'Problem Solving'],
        summary: 'Tailored for IT support, help desk, and technical analyst positions.',
        downloadUrl: `${latestFolder}/IT%20Support%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'it_support_resume',
        name: 'IT Support Resume',
        filename: 'IT Support Resume.docx',
        folder: latestFolder,
        focusAreas: ['ServiceNow', 'ITIL', 'Incident Management', 'Automation'],
        summary: 'Alternative IT support resume with focus on ServiceNow and automation improvements.',
        downloadUrl: `${latestFolder}/IT%20Support%20Resume.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'sales_executive_cv',
        name: 'Sales Executive CV',
        filename: 'Sales Executive CV.docx',
        folder: latestFolder,
        focusAreas: ['Sales Leadership', 'Revenue Growth', 'Team Management', 'Strategic Planning'],
        summary: 'Designed for senior sales roles including sales manager and executive positions.',
        downloadUrl: `${latestFolder}/Sales%20Executive%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'sales_representative_cv',
        name: 'Sales Representative CV',
        filename: 'Sales Representative CV.docx',
        folder: latestFolder,
        focusAreas: ['Salesforce', 'Pipeline Management', 'Client Relations', 'Revenue Growth'],
        summary: 'Perfect for SDR, account executive, and business development roles with proven conversion rates.',
        downloadUrl: `${latestFolder}/Sales%20Representative%20CV.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'sales_representative_resume',
        name: 'Sales Representative Resume',
        filename: 'Sales Representative Resume.docx',
        folder: latestFolder,
        focusAreas: ['Outbound Sales', 'Lead Generation', 'CRM', 'Conversion Optimization'],
        summary: 'Alternative sales resume with focus on outbound prospecting and lead generation.',
        downloadUrl: `${latestFolder}/Sales%20Representative%20Resume.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      }
    ];

    return this.resumeLibrary;
  }

  /**
   * Gets cover letter templates from the latest folder
   */
  async getLatestCoverLetterTemplates() {
    const latestFolder = await this.getLatestDataFolder();
    
    return [
      {
        id: 'general_cover_letter',
        name: 'General Cover Letter',
        filename: 'Cover Letter.docx',
        folder: latestFolder,
        type: 'general',
        downloadUrl: `${latestFolder}/Cover%20Letter.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'data_cover_letter',
        name: 'Data Cover Letter',
        filename: 'Data Cover Letter.docx',
        folder: latestFolder,
        type: 'technical',
        downloadUrl: `${latestFolder}/Data%20Cover%20Letter.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'power_bi_cover_letter',
        name: 'Power BI Developer Cover Letter',
        filename: 'Power BI Developer Cover Letter.docx',
        folder: latestFolder,
        type: 'technical',
        downloadUrl: `${latestFolder}/Power%20BI%20Developer%20Cover%20Letter.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      },
      {
        id: 'software_sales_cover_letter',
        name: 'Software Sales Cover Letter',
        filename: 'Software Sales Cover letter.docx',
        folder: latestFolder,
        type: 'sales',
        downloadUrl: `${latestFolder}/Software%20Sales%20Cover%20letter.docx`,
        lastUpdated: this.getFolderDate(latestFolder)
      }
    ];
  }

  /**
   * Extracts date from folder name for sorting
   */
  getFolderDate(folderName) {
    const dateStr = folderName.replace('data', '');
    
    if (dateStr.length === 4) {
      // Format: MMDD (like 1002 = October 2)
      const month = dateStr.substring(0, 2);
      const day = dateStr.substring(2, 4);
      return `2025-${month}-${day}`;
    }
    
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }

  /**
   * Show notification when new data folder is detected
   */
  showNewFolderNotification(newFolder) {
    const notification = document.createElement('div');
    notification.className = 'folder-update-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>📁 New Resume Library Detected!</h4>
        <p>Found updated resumes in <strong>${newFolder}</strong></p>
        <button onclick="location.reload()">🔄 Refresh to Use Latest</button>
        <button onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .folder-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      }
      
      .notification-content h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
      }
      
      .notification-content p {
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
      }
      
      .notification-content button {
        margin-right: 0.5rem;
        padding: 0.4rem 0.8rem;
        border: none;
        border-radius: 4px;
        background: rgba(255,255,255,0.2);
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
      }
      
      .notification-content button:hover {
        background: rgba(255,255,255,0.3);
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Initialize and start monitoring for new folders
   */
  async initialize() {
    await this.generateLatestResumeLibrary();
    
    // Set up periodic checking for new folders
    setInterval(async () => {
      const currentLatest = this.currentDataFolder;
      const newLatest = await this.getLatestDataFolder();
      
      if (newLatest !== currentLatest) {
        this.showNewFolderNotification(newLatest);
      }
    }, 60000); // Check every minute
  }
}

// Initialize the client-side data folder manager
window.clientDataFolderManager = new ClientDataFolderManager();

// Export for use in other scripts
window.ClientDataFolderManager = ClientDataFolderManager;