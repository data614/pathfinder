(() => {
  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const searchInput = document.getElementById('search');
  const lastUpdatedEl = document.getElementById('last-updated');

  const jobLinks = Array.isArray(window.jobLinks) ? window.jobLinks : [];
  const lastUpdated = window.jobLinksLastUpdated;

  const analyzer = window.PathfinderAnalyzer;
  const resumeLibrary = Array.isArray(window.resumeLibrary) ? window.resumeLibrary : [];

  const analysisForm = document.getElementById('analysis-form');
  const analysisUrlInput = document.getElementById('analysis-url');
  const analysisDescriptionInput = document.getElementById('analysis-description');
  const analysisStatusEl = document.getElementById('analysis-status');
  const analysisErrorEl = document.getElementById('analysis-error');
  const analysisResultsEl = document.getElementById('analysis-results');
  const analysisTrackedEl = document.getElementById('analysis-tracked-skills');

  if (analyzer && resumeLibrary.length) {
    analyzer.prime(resumeLibrary);
  }

  if (lastUpdatedEl && lastUpdated) {
    lastUpdatedEl.textContent = lastUpdated;
  }

  let currentFilter = 'all';
  let searchTerm = '';
  let searchTermDisplay = '';

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

    return `
      <article class="job-card">
        ${locationBadges ? `<div class="job-card__meta">${locationBadges}</div>` : ''}
        <h3 class="job-card__title">${job.title}</h3>
        <p class="job-card__summary">${job.summary}</p>
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
    const visibleJobs = jobLinks.filter((job) => matchesFilter(job) && matchesSearch(job));

    jobListEl.setAttribute('aria-busy', 'false');

    if (!visibleJobs.length) {
      jobListEl.innerHTML =
        '<p class="empty-state">No job links match your filters yet. Try switching locations or adjusting keywords.</p>';
      updateResultsMeta(0);
      return;
    }

    jobListEl.innerHTML = visibleJobs.map((job) => createCard(job)).join('');
    updateResultsMeta(visibleJobs.length);
  };

  const setAnalysisStatus = (message) => {
    if (!analysisStatusEl) return;
    analysisStatusEl.textContent = message || '';
  };

  const setAnalysisError = (message) => {
    if (!analysisErrorEl) return;
    if (message) {
      analysisErrorEl.hidden = false;
      analysisErrorEl.textContent = message;
    } else {
      analysisErrorEl.hidden = true;
      analysisErrorEl.textContent = '';
    }
  };

  const setAnalysisSubmitting = (isSubmitting) => {
    if (!analysisForm) return;
    const submitButton = analysisForm.querySelector('[type="submit"]');
    if (!submitButton) return;
    submitButton.disabled = Boolean(isSubmitting);
    submitButton.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
  };

  const formatSkill = (skill) => {
    if (!skill) return '';
    if (!analyzer || typeof analyzer.formatSkill !== 'function') {
      return skill;
    }
    return analyzer.formatSkill(skill);
  };

  const renderTrackedSkills = () => {
    if (!analysisTrackedEl) return;
    if (!analyzer || !resumeLibrary.length) {
      analysisTrackedEl.innerHTML =
        '<p class="analysis__empty">Résumé skills load once the library is available.</p>';
      return;
    }

    const tracked = analyzer.getTrackedSkills();
    if (!tracked.length) {
      analysisTrackedEl.innerHTML =
        '<p class="analysis__empty">Add skill tags to résumés to populate this list.</p>';
      return;
    }

    analysisTrackedEl.innerHTML = tracked
      .map((skill) => `<span class="analysis__chip">${skill.label}</span>`)
      .join('');
  };

  const renderAnalysisResult = (result) => {
    if (!analysisResultsEl) return;
    if (!result) {
      analysisResultsEl.innerHTML = '';
      analysisResultsEl.setAttribute('hidden', 'hidden');
      return;
    }

    const jobSkills = Array.isArray(result.jobSkills) ? result.jobSkills : [];
    const recommended = result.recommended;
    const totalTracked = recommended ? recommended.totalTracked : jobSkills.length;

    const jobSkillChips = jobSkills
      .map((skill) => `<span class="analysis__chip">${formatSkill(skill)}</span>`)
      .join('');

    const matchesList = recommended && recommended.matches.length
      ? recommended.matches.map((skill) => `<li>${formatSkill(skill)}</li>`).join('')
      : '<li>No tracked skills matched yet.</li>';

    const missingList = recommended && recommended.missing.length
      ? recommended.missing.map((skill) => `<li>${formatSkill(skill)}</li>`).join('')
      : '<li>None — great fit! Reinforce the wins in your outreach.</li>';

    const highlights = recommended && Array.isArray(recommended.highlights) && recommended.highlights.length
      ? `<ul class="analysis-result__highlights">${recommended.highlights
          .slice(0, 3)
          .map((item) => `<li>${item}</li>`)
          .join('')}</ul>`
      : '';

    const jobLinkBlock = result.jobUrl
      ? `<p class="analysis-result__job-link"><a href="${result.jobUrl}" target="_blank" rel="noopener noreferrer">Open job posting ↗</a></p>`
      : '';

    const sourceMessage =
      result.descriptionSource === 'fetched'
        ? 'Description fetched directly from the job page.'
        : result.descriptionSource === 'pasted'
        ? 'Using the pasted job description text.'
        : '';

    const sourceBlock = sourceMessage
      ? `<p class="analysis-result__source">${sourceMessage}</p>`
      : '';

    const otherResumes = (result.resumes || [])
      .filter((entry) => !recommended || entry.resumeId !== recommended.resumeId)
      .map((entry) => {
        const entryTotal = entry.totalTracked || totalTracked;
        const entryLabel = entryTotal
          ? `${entry.matchCount}/${entryTotal} skills`
          : `${entry.matchCount} skills`;
        const entryMatches = entry.matches && entry.matches.length
          ? `<div class="analysis-result__mini">Matches: ${entry.matches
              .map((skill) => formatSkill(skill))
              .join(', ')}</div>`
          : '';
        const entryMissing = entry.missing && entry.missing.length && entry.missing.length <= 4
          ? `<div class="analysis-result__mini analysis-result__mini--muted">Gaps: ${entry.missing
              .map((skill) => formatSkill(skill))
              .join(', ')}</div>`
          : '';
        return `<li><strong>${entry.resumeName}</strong><span>${entryLabel}</span>${entryMatches}${entryMissing}</li>`;
      })
      .join('');

    const comparisonBlock = otherResumes
      ? `<div class="analysis-result__comparison"><h4>Other résumé coverage</h4><ul>${otherResumes}</ul></div>`
      : '';

    const jobSkillsBlock = jobSkills.length
      ? `<div class="analysis-result__jobskills"><h4>Tracked skills in this job</h4><div class="analysis__chips analysis__chips--compact">${jobSkillChips}</div></div>`
      : `<div class="analysis-result__jobskills"><p class="analysis__empty">No tracked skills detected yet — paste more of the job description.</p></div>`;

    const warningsBlock = result.warnings && result.warnings.length
      ? `<div class="analysis-result__warnings">${result.warnings
          .map((warning) => `<p>${warning}</p>`)
          .join('')}</div>`
      : '';

    const scoreBlock = recommended
      ? `<div class="analysis-result__score"><span>${recommended.matchCount}</span><small>of ${totalTracked || jobSkills.length || 0} skills</small></div>`
      : `<div class="analysis-result__score analysis-result__score--empty"><span>0</span><small>tracked skills</small></div>`;

    const recommendedName = recommended ? recommended.resumeName : 'No match yet';
    const recommendedFocus = recommended && recommended.focus ? `<p class="analysis-result__focus">${recommended.focus}</p>` : '';

    analysisResultsEl.innerHTML = `
      <article class="analysis-result__card">
        <header class="analysis-result__header">
          <div>
            <h3>Recommended résumé</h3>
            <p class="analysis-result__resume">${recommendedName}</p>
            ${recommendedFocus}
            ${jobLinkBlock}
            ${sourceBlock}
          </div>
          ${scoreBlock}
        </header>
        ${highlights}
        <div class="analysis-result__breakdown">
          <div>
            <h4>Matched skills</h4>
            <ul>${matchesList}</ul>
          </div>
          <div>
            <h4>Missing skills</h4>
            <ul>${missingList}</ul>
          </div>
        </div>
        ${jobSkillsBlock}
        ${comparisonBlock}
        ${warningsBlock}
      </article>
    `;
    analysisResultsEl.removeAttribute('hidden');
  };

  renderTrackedSkills();
  renderAnalysisResult(null);

  if (analysisStatusEl) {
    if (analyzer && resumeLibrary.length) {
      setAnalysisStatus('Paste a job description to compare it with the résumé library.');
    } else {
      setAnalysisStatus('Résumé analysis becomes available once the résumé skill library loads.');
    }
  }

  setAnalysisError('');

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

  if (analysisForm) {
    analysisForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!analyzer || !resumeLibrary.length) {
        setAnalysisError('Résumé analysis is unavailable until the skill library loads.');
        return;
      }

      const url = (analysisUrlInput && analysisUrlInput.value ? analysisUrlInput.value.trim() : '');
      const description =
        analysisDescriptionInput && analysisDescriptionInput.value
          ? analysisDescriptionInput.value.trim()
          : '';

      setAnalysisError('');

      if (!url && !description) {
        setAnalysisStatus('Add a job link or paste the description text to begin.');
        setAnalysisError('Paste the job description to extract the skill requirements.');
        return;
      }

      setAnalysisSubmitting(true);
      setAnalysisStatus('Analysing résumé matches…');

      try {
        const result = await analyzer.analyse({
          url,
          description,
          resumeLibrary,
        });

        renderAnalysisResult(result);

        const skillCount = Array.isArray(result.jobSkills) ? result.jobSkills.length : 0;
        const message = skillCount
          ? `Matched ${skillCount} tracked skill${skillCount === 1 ? '' : 's'} from the job description.`
          : 'No tracked skills detected yet — paste more of the posting for richer analysis.';
        setAnalysisStatus(message);
        setAnalysisError('');
      } catch (error) {
        renderAnalysisResult(null);
        setAnalysisError(error && error.message ? error.message : 'We could not analyse that job posting.');
        setAnalysisStatus('Analysis unavailable until a job description is supplied.');
      } finally {
        setAnalysisSubmitting(false);
      }
    });
  }

  render();
})();
