(() => {
  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const searchInput = document.getElementById('search');
  const lastUpdatedEl = document.getElementById('last-updated');
  const resumeFileInput = document.getElementById('resume-file');
  const uploadArea = document.getElementById('upload-area');
  const resumeStatus = document.getElementById('resume-status');
  const skillsSelection = document.getElementById('skills-selection');
  const skillsCheckboxes = document.getElementById('skills-checkboxes');
  const updateMatchesBtn = document.getElementById('update-matches');
  const coverLetterTips = document.getElementById('cover-letter-tips');

  const jobLinks = Array.isArray(window.jobLinks) ? window.jobLinks : [];
  const lastUpdated = window.jobLinksLastUpdated;
  const resumeAnalyzer = new window.ResumeAnalyzer();

  let currentFilter = 'all';
  let searchTerm = '';
  let searchTermDisplay = '';
  let useResumeMatching = false;

  if (lastUpdatedEl && lastUpdated) {
    lastUpdatedEl.textContent = lastUpdated;
  }

  // Initialize resume upload functionality
  initializeResumeUpload();

  function initializeResumeUpload() {
    // File upload handling
    resumeFileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop handling
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload({ target: { files } });
      }
    });

    // Update matches button
    updateMatchesBtn.addEventListener('click', () => {
      const selectedSkills = Array.from(skillsCheckboxes.querySelectorAll('input:checked'))
        .map(cb => cb.value);
      resumeAnalyzer.setSelectedSkills(selectedSkills);
      updateCoverLetterTips();
      render();
    });
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    resumeStatus.style.display = 'block';
    resumeStatus.innerHTML = '<div class="loading">Analyzing your resume...</div>';

    try {
      const result = await resumeAnalyzer.parseResume(file);
      
      if (result.success) {
        resumeStatus.innerHTML = `
          <div class="success">
            ✅ Resume analyzed successfully! 
            Found ${result.skills.length} skills and ${result.experience.length} positions.
          </div>
        `;
        
        displaySkillsSelection(result.skills);
        useResumeMatching = true;
        updateCoverLetterTips();
        render();
      } else {
        resumeStatus.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
      }
    } catch (error) {
      resumeStatus.innerHTML = `<div class="error">❌ Failed to analyze resume: ${error.message}</div>`;
    }
  }

  function displaySkillsSelection(skills) {
    skillsSelection.style.display = 'block';
    
    const selectedSkills = resumeAnalyzer.getSelectedSkills();
    skillsCheckboxes.innerHTML = skills.map(skill => `
      <label class="skill-checkbox">
        <input type="checkbox" value="${skill}" ${selectedSkills.includes(skill) ? 'checked' : ''}>
        <span>${skill}</span>
      </label>
    `).join('');
  }

  function updateCoverLetterTips() {
    const focusText = resumeAnalyzer.generateCoverLetterFocus();
    const matchCount = useResumeMatching ? 
      resumeAnalyzer.getMatchedJobs(jobLinks).length : 
      jobLinks.length;
    
    coverLetterTips.innerHTML = `
      <div class="resume-insights">
        ${focusText ? `<p><strong>Cover Letter Focus:</strong> ${focusText}</p>` : ''}
        <p><strong>Job Matches:</strong> ${matchCount} jobs match your profile</p>
      </div>
    `;
  }

  const normalise = (value) => (value || '').toString().toLowerCase();

  const matchesFilter = (job) => {
    if (currentFilter === 'all') {
      return true;
    }
    return (job.locations || []).some((location) => location === currentFilter);
  };

  const matchesSearch = (job) => {
    if (!searchTerm) {
      return true;
    }

    const haystack = [
      job.title,
      job.summary,
      job.resume,
      ...(job.focusAreas || []),
      ...(job.locations || []),
    ]
      .filter(Boolean)
      .map((value) => normalise(value))
      .join(' ');

    return haystack.includes(searchTerm);
  };

  const createCard = (job) => {
    const locationBadges = (job.locations || [])
      .map((location) => `<span class="badge badge--location">${location}</span>`)
      .join('');

    const focusBadges = (job.focusAreas || [])
      .map((focus) => `<span class="badge">${focus}</span>`)
      .join('');

    // Add match information if using resume matching
    let matchInfo = '';
    if (useResumeMatching && job.match) {
      const scoreClass = job.match.score >= 70 ? 'high-match' : job.match.score >= 50 ? 'medium-match' : 'low-match';
      matchInfo = `
        <div class="job-match ${scoreClass}">
          <div class="match-score">${Math.round(job.match.score)}% match</div>
          <div class="match-explanation">${job.match.explanation}</div>
          ${job.match.matches.length > 0 ? `<div class="matching-skills">Matching skills: ${job.match.matches.join(', ')}</div>` : ''}
        </div>
      `;
    }

    return `
      <article class="job-card ${useResumeMatching && job.match ? 'matched-job' : ''}">
        ${locationBadges ? `<div class="job-card__meta">${locationBadges}</div>` : ''}
        <h3 class="job-card__title">${job.title}</h3>
        <p class="job-card__summary">${job.summary}</p>
        ${matchInfo}
        <div class="job-card__resume">Recommended résumé <span>${job.resume}</span></div>
        ${focusBadges ? `<div class="job-card__meta">${focusBadges}</div>` : ''}
        <a class="job-card__cta" href="${job.url}" target="_blank" rel="noopener noreferrer">Open search</a>
      </article>
    `;
  };

  const updateResultsMeta = (visibleCount) => {
    if (!resultsMetaEl) return;
    const total = jobLinks.length;
    const filterLabel =
      currentFilter === 'all'
        ? 'all locations'
        : `${currentFilter} roles`;

    const searchLabel = searchTerm
      ? ` matching “${searchTermDisplay}”`
      : '';

    resultsMetaEl.innerHTML = `<strong>${visibleCount}</strong> of ${total} curated searches shown for ${filterLabel}${searchLabel}.`;
  };

  const render = () => {
    let visibleJobs;
    
    if (useResumeMatching) {
      // Use AI matching when resume is uploaded
      const matchedJobs = resumeAnalyzer.getMatchedJobs(jobLinks);
      visibleJobs = matchedJobs.filter((job) => matchesFilter(job) && matchesSearch(job));
    } else {
      // Use original filtering when no resume
      visibleJobs = jobLinks.filter((job) => matchesFilter(job) && matchesSearch(job));
    }

    jobListEl.setAttribute('aria-busy', 'false');

    if (!visibleJobs.length) {
      const emptyMessage = useResumeMatching ? 
        'No jobs match your resume and current filters. Try adjusting your location filter or uploading a different resume.' :
        'No job links match your filters yet. Try switching locations or adjusting keywords.';
      jobListEl.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
      updateResultsMeta(0);
      return;
    }

    // Group jobs by location for better organization when using resume matching
    if (useResumeMatching && currentFilter === 'all') {
      const groupedJobs = groupJobsByLocation(visibleJobs);
      jobListEl.innerHTML = renderGroupedJobs(groupedJobs);
    } else {
      jobListEl.innerHTML = visibleJobs.map((job) => createCard(job)).join('');
    }
    
    updateResultsMeta(visibleJobs.length);
  };

  function groupJobsByLocation(jobs) {
    const groups = {
      'Sydney': [],
      'Melbourne': [],
      'Remote': []
    };
    
    jobs.forEach(job => {
      if (job.locations.includes('Sydney')) {
        groups['Sydney'].push(job);
      } else if (job.locations.includes('Melbourne')) {
        groups['Melbourne'].push(job);
      } else if (job.locations.includes('Remote')) {
        groups['Remote'].push(job);
      }
    });
    
    return groups;
  }

  function renderGroupedJobs(groupedJobs) {
    let html = '';
    
    Object.entries(groupedJobs).forEach(([location, jobs]) => {
      if (jobs.length > 0) {
        html += `
          <div class="location-group">
            <h2 class="location-header">${location} Opportunities (${jobs.length})</h2>
            <div class="location-jobs">
              ${jobs.map(job => createCard(job)).join('')}
            </div>
          </div>
        `;
      }
    });
    
    return html;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedFilter = button.dataset.filter;
      if (!selectedFilter || selectedFilter === currentFilter) {
        return;
      }

      currentFilter = selectedFilter;

      filterButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      render();
    });

    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
  });

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const value = (event.target.value || '').trim();
      searchTermDisplay = value;
      searchTerm = value.toLowerCase();
      render();
    });
  }

  render();
})();
