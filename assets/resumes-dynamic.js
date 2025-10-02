(function () {
  const normaliseText = (value) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  const buildPromptProfile = (resume) => {
    const focus = normaliseText(resume.focus);
    const trimmedFocus = focus.length > 220 ? `${focus.slice(0, 217).trimEnd()}…` : focus;

    const topHighlights = Array.isArray(resume.highlights)
      ? resume.highlights.map((entry) => normaliseText(entry)).filter(Boolean).slice(0, 3)
      : [];

    const prioritySkills = Array.isArray(resume.skills)
      ? resume.skills.map((skill) => normaliseText(skill).toLowerCase()).filter(Boolean).slice(0, 12)
      : [];

    const metrics = topHighlights.filter((highlight) => /[0-9%$€£]/.test(highlight));
    const primaryMetrics = (metrics.length ? metrics : topHighlights).slice(0, 3);

    return {
      id: resume.id,
      name: resume.name,
      focus: trimmedFocus,
      topHighlights,
      prioritySkills,
      primaryMetrics,
    };
  };

  // Dynamic Resume Library Generator - Uses Latest Data Folder (data1002, data1003, etc.)
  async function generateDynamicResumeLibrary() {
    // Auto-detect latest data folder
    const availableFolders = ['data1002', 'data0925']; // Will be dynamically detected
    const latestFolder = availableFolders.sort((a, b) => {
      const numA = parseInt(a.replace('data', ''));
      const numB = parseInt(b.replace('data', ''));
      return numB - numA; // Newest first
    })[0];

    console.log(`🔄 Loading resumes from latest folder: ${latestFolder}`);

    const dynamicResumes = [
      {
        id: 'data-analyst-cv',
        name: 'Data Analyst CV',
        file: `${latestFolder}/Data Analyst CV.docx`,
        focus:
          'Analytics storyteller for Power BI teams with automation, grant funding, and API integration wins.',
        highlights: [
          'Secured a $1M Transport for NSW analytics grant with real-time Power BI Premium dashboards.',
          'Built polygon.io and Azure Maps market intelligence dashboards with automated releases.',
          'Delivered Jenkins CI/CD and Redis deployment proof-of-concepts for faster BI delivery.',
        ],
        skills: [
          'power bi premium',
          'power bi',
          'python',
          'sql',
          'excel',
          'google sheets',
          'azure data studio',
          'power automate',
          'jenkins',
          'redis',
          'polygon.io',
          'azure maps',
          'sharepoint',
          'github enterprise',
          'automation',
          'data analysis',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-automation-resume',
        name: 'Data Automation Resume',
        file: `${latestFolder}/Data Automation Resume.docx`,
        focus:
          'Automation engineer specializing in Power Automate, Python scripting, and DevOps integration.',
        highlights: [
          'Achieved $250K+ cost savings through Python automation and workflow optimization.',
          'Built enterprise Power Automate flows reducing manual effort by 80%.',
          'Implemented Jenkins pipelines and Redis caching for improved system performance.',
        ],
        skills: [
          'python',
          'power automate',
          'jenkins',
          'redis',
          'devops',
          'automation',
          'api integration',
          'workflow optimization',
          'cost reduction',
          'process improvement',
          'azure',
          'power platform',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-automation-asia-cv',
        name: 'Data Automation Asia CV',
        file: `${latestFolder}/Data Automation Asia CV.docx`,
        focus:
          'APAC-focused automation specialist with remote collaboration expertise and Power Platform mastery.',
        highlights: [
          'Led automation initiatives across APAC teams with async delivery excellence.',
          'Delivered GitHub Enterprise workflows for distributed development teams.',
          'Optimized Power Automate solutions for multi-timezone collaboration.',
        ],
        skills: [
          'power automate',
          'power platform',
          'github enterprise',
          'async collaboration',
          'apac markets',
          'remote work',
          'automation',
          'workflow design',
          'stakeholder management',
          'cross-cultural communication',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'sales-representative-cv',
        name: 'Sales Representative CV',
        file: `${latestFolder}/Sales Representative CV.docx`,
        focus:
          'High-performing SDR with proven conversion rates, Salesforce expertise, and compliance-ready processes.',
        highlights: [
          'Maintained 20-30 daily outbound calls with 40% meeting show-rate.',
          'Achieved 10% conversion rate from prospect to qualified opportunity.',
          'Built compliance-grade scripting and Salesforce hygiene processes.',
        ],
        skills: [
          'salesforce',
          'outbound prospecting',
          'lead generation',
          'pipeline management',
          'conversion optimization',
          'crm management',
          'sales metrics',
          'client relations',
          'revenue growth',
          'cold calling',
          'email campaigns',
          'qualification',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'sales-representative-resume',
        name: 'Sales Representative Resume',
        file: `${latestFolder}/Sales Representative Resume.docx`,
        focus:
          'Alternative sales resume with emphasis on SaaS sales, video prospecting, and global market reach.',
        highlights: [
          'Specialized in SaaS and fintech SDR roles with global reach.',
          'Implemented video prospecting strategies increasing response rates by 25%.',
          'Maintained superior Salesforce data hygiene and pipeline accuracy.',
        ],
        skills: [
          'saas sales',
          'video prospecting',
          'salesforce',
          'global markets',
          'fintech',
          'pipeline accuracy',
          'response optimization',
          'territory management',
          'account development',
          'prospecting tools',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'sales-executive-cv',
        name: 'Sales Executive CV',
        file: `${latestFolder}/Sales Executive CV.docx`,
        focus:
          'Senior sales executive with leadership experience, strategic planning, and team management.',
        highlights: [
          'Led sales teams to exceed revenue targets by 15-20% annually.',
          'Developed strategic partnerships resulting in $2M+ new business.',
          'Implemented sales processes improving team efficiency by 30%.',
        ],
        skills: [
          'sales leadership',
          'revenue growth',
          'team management',
          'strategic planning',
          'partnership development',
          'sales processes',
          'performance optimization',
          'market analysis',
          'business development',
          'relationship management',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'customer-service-cv',
        name: 'Customer Service CV',
        file: `${latestFolder}/Customer Service CV.docx`,
        focus:
          'Customer experience specialist with high NPS scores, escalation management, and automation focus.',
        highlights: [
          'Achieved high-NPS customer support with efficient escalation handling.',
          'Implemented automation reducing manual customer service workload by 40%.',
          'Led customer success initiatives improving retention rates by 20%.',
        ],
        skills: [
          'customer experience',
          'nps optimization',
          'escalation management',
          'customer retention',
          'support automation',
          'crm systems',
          'issue resolution',
          'team leadership',
          'process improvement',
          'communication',
          'relationship management',
          'satisfaction metrics',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'call-centre-cv',
        name: 'Call Centre CV',
        file: `${latestFolder}/Call Centre CV.docx`,
        focus:
          'Call centre specialist with excellent communication skills, call handling expertise, and performance metrics.',
        highlights: [
          'Maintained high call volume with superior customer satisfaction scores.',
          'Expertise in inbound/outbound call management and queue optimization.',
          'Implemented call centre automation improving efficiency by 25%.',
        ],
        skills: [
          'call handling',
          'inbound calls',
          'outbound calls',
          'call centre operations',
          'customer communication',
          'performance metrics',
          'queue management',
          'call automation',
          'satisfaction tracking',
          'issue resolution',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'it-support-cv',
        name: 'IT Support CV',
        file: `${latestFolder}/IT Support CV.docx`,
        focus:
          'IT support specialist with ServiceNow expertise, automation skills, and compliance knowledge.',
        highlights: [
          'Managed ServiceNow onboarding flows and system administration.',
          'Implemented GitHub release stabilization and automation processes.',
          'Handled RG146 compliance and regulatory IT requirements.',
        ],
        skills: [
          'servicenow',
          'it support',
          'system administration',
          'automation',
          'github',
          'compliance',
          'rg146',
          'incident management',
          'problem solving',
          'technical documentation',
          'process optimization',
          'help desk',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'it-support-resume',
        name: 'IT Support Resume',
        file: `${latestFolder}/IT Support Resume.docx`,
        focus:
          'Alternative IT support resume with ITIL focus, incident management, and service desk expertise.',
        highlights: [
          'ITIL-certified with expertise in incident and problem management.',
          'Reduced average resolution time by 35% through process automation.',
          'Led service desk improvements increasing user satisfaction by 25%.',
        ],
        skills: [
          'itil',
          'incident management',
          'service desk',
          'problem management',
          'user support',
          'resolution optimization',
          'automation tools',
          'ticketing systems',
          'documentation',
          'process improvement',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'banking-consultant-cv',
        name: 'Banking Consultant CV',
        file: `${latestFolder}/Banking Consultant CV.docx`,
        focus:
          'Banking and financial services consultant with analytics demos and compliance mastery.',
        highlights: [
          'Runs Salesforce and Exact CRM cadences that protect data accuracy by 15%.',
          'Delivers RG146-aligned updates and mortgage processing support for institutional clients.',
          'Automates analytics dashboards and Redis deployments to speed investment reporting.',
        ],
        skills: [
          'salesforce',
          'exact crm',
          'xero',
          'myob',
          'excel',
          'google sheets',
          'outbound calls',
          'call centre',
          'nps',
          'qa',
          'rg146',
          'finance compliance',
          'general insurance',
          'order processing',
          'ms office',
          'sharepoint',
          'motorola solutions',
          'niche rms',
          'fidelity',
          'corelogic',
          'power bi',
          'power automate',
          'polygon.io',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-migration-cv',
        name: 'Data Migration CV',
        file: `${latestFolder}/Data Migration CV.docx`,
        focus:
          'Data migration specialist with ETL expertise, database management, and system integration.',
        highlights: [
          'Led complex data migration projects with zero data loss.',
          'Designed ETL processes handling millions of records efficiently.',
          'Integrated disparate systems improving data accessibility by 50%.',
        ],
        skills: [
          'data migration',
          'etl processes',
          'database management',
          'system integration',
          'data mapping',
          'sql',
          'data validation',
          'migration planning',
          'data quality',
          'system architecture',
        ],
        folder: latestFolder,
        lastUpdated: new Date().toISOString()
      }
    ];

    return dynamicResumes.map((resume) => ({
      ...resume,
      promptProfile: buildPromptProfile(resume),
    }));
  }

  // Function to detect new data folders
  function detectLatestDataFolder() {
    // In a real implementation, this would scan the filesystem
    // For now, we'll simulate by checking known folders
    const today = new Date();
    const currentDateStr = (today.getMonth() + 1).toString().padStart(2, '0') + 
                          today.getDate().toString().padStart(2, '0');
    
    // Check if today's folder exists (data1003 if today is Oct 3rd)
    const todayFolder = `data${currentDateStr}`;
    
    // Return the newest available folder
    const knownFolders = ['data1002', 'data0925'];
    if (currentDateStr === '1003') {
      knownFolders.unshift('data1003'); // Add to beginning if it exists
    }
    
    return knownFolders[0]; // Return the newest
  }

  // Function to show folder update notification
  function showFolderUpdateNotification(newFolder) {
    // Remove existing notification
    const existing = document.querySelector('.folder-update-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'folder-update-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>📁 New Resume Library Detected!</h4>
        <p>Found updated resumes in <strong>${newFolder}</strong></p>
        <div class="notification-actions">
          <button onclick="location.reload()" class="btn-primary">🔄 Refresh Now</button>
          <button onclick="this.closest('.folder-update-notification').remove()" class="btn-close">✕</button>
        </div>
      </div>
    `;
    
    // Add notification styles
    if (!document.querySelector('#folder-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'folder-notification-styles';
      style.textContent = `
        .folder-update-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 1.2rem;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 320px;
          animation: slideInFromRight 0.4s ease-out;
          font-family: Inter, sans-serif;
        }
        
        .notification-content h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .notification-content p {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          opacity: 0.95;
        }
        
        .notification-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .notification-actions .btn-primary {
          flex: 1;
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 6px;
          background: rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .notification-actions .btn-primary:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }
        
        .notification-actions .btn-close {
          width: 2rem;
          height: 2rem;
          border: none;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          color: white;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .notification-actions .btn-close:hover {
          background: rgba(255,255,255,0.2);
        }
        
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 15000);
  }

  // Initialize the resume library
  async function initializeResumeLibrary() {
    try {
      const resumes = await generateDynamicResumeLibrary();
      window.resumeLibrary = resumes;
      
      // Store current folder for comparison
      window.currentDataFolder = resumes[0]?.folder;
      
      // Dispatch event to notify other scripts
      window.dispatchEvent(new CustomEvent('resumeLibraryLoaded', {
        detail: { 
          folder: window.currentDataFolder,
          count: resumes.length 
        }
      }));
      
      console.log(`📁 Resume library loaded from ${window.currentDataFolder} with ${resumes.length} resumes`);
      
      // Set up periodic checking for new folders
      setInterval(() => {
        const latestFolder = detectLatestDataFolder();
        if (latestFolder !== window.currentDataFolder) {
          console.log(`🆕 New data folder detected: ${latestFolder}`);
          showFolderUpdateNotification(latestFolder);
        }
      }, 30000); // Check every 30 seconds
      
    } catch (error) {
      console.error('Error loading dynamic resume library:', error);
      window.resumeLibrary = [];
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResumeLibrary);
  } else {
    initializeResumeLibrary();
  }

  // Export functions for external use
  window.reloadResumeLibrary = initializeResumeLibrary;
  window.getCurrentDataFolder = () => window.currentDataFolder;

})();