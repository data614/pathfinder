// Resume parsing and job matching functionality
class ResumeAnalyzer {
  constructor() {
    this.userSkills = new Set();
    this.userExperience = [];
    this.selectedSkills = new Set();
    this.resumeText = '';
    this.initializeParser();
  }

  initializeParser() {
    // Common skills database for matching
    this.skillsDatabase = {
      technical: [
        'Python', 'SQL', 'Power BI', 'Salesforce', 'Excel', 'JavaScript', 'HTML', 'CSS',
        'Git', 'API', 'Azure', 'AWS', 'Jenkins', 'Redis', 'Automation', 'Analytics',
        'Dashboard', 'Data', 'Machine Learning', 'AI', 'Tableau', 'R', 'Java', 'C++',
        'React', 'Node.js', 'MongoDB', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes',
        'Power Automate', 'ServiceNow', 'Selenium', 'GitHub', 'C#', '.NET', 'PHP',
        'Django', 'Flask', 'Angular', 'Vue.js', 'TypeScript', 'Pandas', 'NumPy',
        'Matplotlib', 'Seaborn', 'Scikit-learn', 'TensorFlow', 'PyTorch'
      ],
      business: [
        'Project Management', 'Stakeholder Management', 'Business Analysis',
        'Process Improvement', 'Customer Success', 'Sales', 'Marketing',
        'Team Leadership', 'Training', 'Documentation', 'Reporting',
        'Quality Assurance', 'Risk Management', 'Compliance', 'Auditing',
        'Strategic Planning', 'Budget Management', 'Vendor Management',
        'Change Management', 'Communication', 'Negotiation', 'Presentation'
      ],
      industry: [
        'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education',
        'Government', 'Non-profit', 'Technology', 'Telecommunications',
        'Banking', 'Insurance', 'Real Estate', 'Transportation', 'Logistics',
        'Energy', 'Media', 'Entertainment', 'Hospitality', 'Agriculture'
      ]
    };

    this.allSkills = [
      ...this.skillsDatabase.technical,
      ...this.skillsDatabase.business,
      ...this.skillsDatabase.industry
    ];
  }

  // Extract skills from resume text
  extractSkills(text) {
    const skills = new Set();
    const normalizedText = text.toLowerCase();
    
    this.allSkills.forEach(skill => {
      // Escape special regex characters
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const skillPattern = new RegExp(`\\b${escapedSkill.toLowerCase()}\\b`, 'i');
      if (skillPattern.test(normalizedText)) {
        skills.add(skill);
      }
    });

    return skills;
  }

  // Extract experience from resume text
  extractExperience(text) {
    const experience = [];
    const lines = text.split('\n');
    let currentJob = null;
    
    lines.forEach(line => {
      line = line.trim();
      
      // Look for job titles and companies (basic pattern matching)
      if (line.match(/\b(analyst|developer|manager|specialist|consultant|coordinator|assistant|lead|engineer|administrator)\b/i)) {
        if (currentJob) {
          experience.push(currentJob);
        }
        currentJob = {
          title: line,
          description: [],
          skills: new Set()
        };
      } else if (currentJob && line.length > 20) {
        currentJob.description.push(line);
        // Extract skills from job description
        const jobSkills = this.extractSkills(line);
        jobSkills.forEach(skill => currentJob.skills.add(skill));
      }
    });
    
    if (currentJob) {
      experience.push(currentJob);
    }
    
    return experience;
  }

  // Parse uploaded resume file
  async parseResume(file) {
    try {
      this.resumeText = await this.readFileContent(file);
      this.userSkills = this.extractSkills(this.resumeText);
      this.userExperience = this.extractExperience(this.resumeText);
      this.selectedSkills = new Set([...this.userSkills].slice(0, 5)); // Default to top 5 skills
      
      return {
        success: true,
        skills: Array.from(this.userSkills),
        experience: this.userExperience
      };
    } catch (error) {
      console.error('Error parsing resume:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Read file content (simplified for demo - in production would handle DOCX properly)
  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Match user skills against job requirements
  matchJob(job) {
    if (!this.userSkills.size) return { score: 0, matches: [], explanation: 'No resume uploaded' };
    
    const jobSkills = new Set([
      ...(job.focusAreas || []),
      ...this.extractSkillsFromText(job.summary + ' ' + job.title)
    ]);
    
    const matches = [...jobSkills].filter(skill => 
      [...this.userSkills].some(userSkill => 
        userSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
    
    const score = matches.length / Math.max(jobSkills.size, 1) * 100;
    
    // Generate explanation
    let explanation = '';
    if (score >= 70) {
      explanation = `Excellent match! You have strong experience in ${matches.slice(0, 3).join(', ')}`;
    } else if (score >= 50) {
      explanation = `Good match. Your skills in ${matches.slice(0, 2).join(', ')} align well with this role`;
    } else if (score >= 30) {
      explanation = `Partial match. Consider highlighting your ${matches[0] || 'transferable skills'}`;
    } else {
      explanation = 'Limited match based on current skills. Consider skill development or emphasize transferable experience';
    }
    
    return { score, matches, explanation };
  }

  extractSkillsFromText(text) {
    return Array.from(this.extractSkills(text));
  }

  // Get filtered and scored jobs
  getMatchedJobs(jobLinks) {
    if (!this.userSkills.size) return [];
    
    return jobLinks
      .map(job => ({
        ...job,
        match: this.matchJob(job)
      }))
      .filter(job => job.match.score >= 20) // Only show jobs with at least 20% match
      .sort((a, b) => b.match.score - a.match.score);
  }

  // Get skills for selection
  getUserSkills() {
    return Array.from(this.userSkills);
  }

  // Set selected skills for cover letter focus
  setSelectedSkills(skills) {
    this.selectedSkills = new Set(skills);
  }

  getSelectedSkills() {
    return Array.from(this.selectedSkills);
  }

  // Generate cover letter summary based on selected skills
  generateCoverLetterFocus() {
    if (!this.selectedSkills.size) return '';
    
    const skills = Array.from(this.selectedSkills);
    return `Focus your cover letter on: ${skills.join(', ')}. Highlight specific achievements and metrics related to these areas.`;
  }
}

// Export for use in main script
window.ResumeAnalyzer = ResumeAnalyzer;