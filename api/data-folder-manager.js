// Dynamic Data Folder Management System
// Automatically detects and uses the latest data folder (data1002, data1003, etc.)

const fs = require('fs').promises;
const path = require('path');

class DataFolderManager {
  constructor(basePath = './') {
    this.basePath = basePath;
    this.currentDataFolder = null;
    this.availableFolders = [];
  }

  /**
   * Scans for all data folders and returns them sorted by date/number
   */
  async scanDataFolders() {
    try {
      const items = await fs.readdir(this.basePath);
      
      // Filter for data folders (data0925, data1002, data1003, etc.)
      const dataFolders = items.filter(item => {
        return item.match(/^data\d{4}$/);
      });

      // Sort by the numeric part (higher numbers = more recent)
      this.availableFolders = dataFolders.sort((a, b) => {
        const numA = parseInt(a.replace('data', ''));
        const numB = parseInt(b.replace('data', ''));
        return numB - numA; // Descending order (newest first)
      });

      return this.availableFolders;
    } catch (error) {
      console.error('Error scanning data folders:', error);
      return [];
    }
  }

  /**
   * Gets the latest (highest numbered) data folder
   */
  async getLatestDataFolder() {
    await this.scanDataFolders();
    
    if (this.availableFolders.length === 0) {
      throw new Error('No data folders found');
    }

    this.currentDataFolder = this.availableFolders[0];
    return this.currentDataFolder;
  }

  /**
   * Gets all files from the latest data folder
   */
  async getLatestDataFiles() {
    const latestFolder = await this.getLatestDataFolder();
    const folderPath = path.join(this.basePath, latestFolder);

    try {
      const files = await fs.readdir(folderPath);
      
      // Categorize files
      const categorized = {
        resumes: [],
        coverLetters: [],
        all: files
      };

      files.forEach(file => {
        const fileName = file.toLowerCase();
        if (fileName.includes('cover letter') || fileName.includes('cover-letter')) {
          categorized.coverLetters.push(file);
        } else if (fileName.includes('cv') || fileName.includes('resume')) {
          categorized.resumes.push(file);
        }
      });

      return {
        folder: latestFolder,
        files: categorized,
        path: folderPath
      };
    } catch (error) {
      console.error(`Error reading files from ${latestFolder}:`, error);
      return null;
    }
  }

  /**
   * Gets resume library data for the latest folder
   */
  async getLatestResumeLibrary() {
    const dataFiles = await this.getLatestDataFiles();
    
    if (!dataFiles) {
      return [];
    }

    // Create resume library entries
    const resumeLibrary = dataFiles.files.resumes.map((fileName, index) => {
      const id = fileName.replace(/\.(docx|pdf|doc)$/i, '').replace(/\s+/g, '_');
      
      // Determine focus areas based on filename
      let focusAreas = [];
      let summary = '';
      
      const fileNameLower = fileName.toLowerCase();
      
      if (fileNameLower.includes('data analyst') || fileNameLower.includes('data automation')) {
        focusAreas = ['Power BI', 'Python', 'SQL', 'Data Analysis', 'Automation'];
        summary = 'Ideal for data analyst, BI developer, and analytics roles. Highlights technical expertise and automation experience.';
      } else if (fileNameLower.includes('sales')) {
        focusAreas = ['Salesforce', 'Pipeline Management', 'Client Relations', 'Revenue Growth'];
        summary = 'Perfect for sales roles including SDR, account executive, and business development positions.';
      } else if (fileNameLower.includes('customer service') || fileNameLower.includes('call centre')) {
        focusAreas = ['Customer Experience', 'Issue Resolution', 'Communication', 'CRM'];
        summary = 'Designed for customer service, support, and client-facing roles with emphasis on satisfaction metrics.';
      } else if (fileNameLower.includes('it support')) {
        focusAreas = ['ServiceNow', 'Technical Support', 'System Administration', 'Problem Solving'];
        summary = 'Tailored for IT support, help desk, and technical analyst positions.';
      } else if (fileNameLower.includes('banking') || fileNameLower.includes('consultant')) {
        focusAreas = ['Financial Analysis', 'Compliance', 'Client Advisory', 'Risk Management'];
        summary = 'Optimized for banking, finance, and consulting roles with regulatory focus.';
      } else {
        focusAreas = ['Professional Experience', 'Adaptability', 'Team Collaboration'];
        summary = 'General purpose resume suitable for various professional roles.';
      }

      return {
        id: id,
        name: fileName.replace(/\.(docx|pdf|doc)$/i, ''),
        filename: fileName,
        folder: dataFiles.folder,
        path: path.join(dataFiles.path, fileName),
        focusAreas: focusAreas,
        summary: summary,
        lastModified: new Date().toISOString() // Would need actual file stats
      };
    });

    return resumeLibrary;
  }

  /**
   * Gets cover letter templates from the latest folder
   */
  async getLatestCoverLetterTemplates() {
    const dataFiles = await getLatestDataFiles();
    
    if (!dataFiles) {
      return [];
    }

    return dataFiles.files.coverLetters.map((fileName, index) => {
      const id = fileName.replace(/\.(docx|pdf|doc)$/i, '').replace(/\s+/g, '_');
      
      return {
        id: id,
        name: fileName.replace(/\.(docx|pdf|doc)$/i, ''),
        filename: fileName,
        folder: dataFiles.folder,
        path: path.join(dataFiles.path, fileName),
        type: 'template'
      };
    });
  }

  /**
   * Watch for new data folders being added
   */
  async watchForNewFolders(callback) {
    // In a real implementation, you'd use fs.watch or chokidar
    // For now, we'll implement a polling mechanism
    let lastKnownFolders = await this.scanDataFolders();
    
    const checkForChanges = async () => {
      const currentFolders = await this.scanDataFolders();
      
      if (JSON.stringify(currentFolders) !== JSON.stringify(lastKnownFolders)) {
        console.log('New data folder detected!');
        lastKnownFolders = currentFolders;
        
        if (callback) {
          callback(currentFolders);
        }
      }
    };

    // Check every 30 seconds
    setInterval(checkForChanges, 30000);
  }
}

module.exports = DataFolderManager;