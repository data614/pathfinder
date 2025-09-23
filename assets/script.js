(() => {
  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const lastUpdatedEl = document.getElementById('last-updated');
  const resumeListEl = document.getElementById('resume-list');
  const resumeFeedbackEl = document.getElementById('resume-feedback');
  const resumeContentEl = document.getElementById('resume-content');
  const resumeToggleButton = document.getElementById('resume-toggle');
  const resumeSectionEl = document.querySelector('.resume-viewer');

  const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
  const MAX_VISIBLE_JOBS = 20;

  const escapeHtml = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    return value
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const createBadgeGroup = (items, className = 'badge') =>
    (Array.isArray(items) ? items : [])
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => `<span class="${className}">${escapeHtml(item)}</span>`)
      .join('');

  const resumeLibrary = Array.isArray(window.resumeLibrary)
    ? window.resumeLibrary.filter((resume) => resume && typeof resume === 'object')
    : [];

  const resumeIndex = (() => {
    const byId = new Map();
    const byName = new Map();

    resumeLibrary.forEach((resume) => {
      const id = typeof resume.id === 'string' ? resume.id.trim() : '';
      const name = typeof resume.name === 'string' ? resume.name.trim() : '';

      if (id) {
        byId.set(id.toLowerCase(), resume);
      }
      if (name) {
        byName.set(name.toLowerCase(), resume);
      }
    });

    const find = (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      const key = value.toString().trim().toLowerCase();
      if (!key) {
        return null;
      }
      return byId.get(key) || byName.get(key) || null;
    };

    return { find, all: resumeLibrary };
  })();

  const buildResumeUrl = (filePath) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return '';
    }

    return filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  };

  const showResumeMessage = (message, options = {}) => {
    if (!resumeFeedbackEl) return;

    const { type, link } = options;
    resumeFeedbackEl.innerHTML = '';
    resumeFeedbackEl.classList.remove('resume-viewer__feedback--error');
    resumeFeedbackEl.classList.remove('resume-viewer__feedback--success');

    if (!message) {
      return;
    }

    if (type === 'error') {
      resumeFeedbackEl.classList.add('resume-viewer__feedback--error');
    } else if (type === 'success') {
      resumeFeedbackEl.classList.add('resume-viewer__feedback--success');
    }

    if (link && link.href) {
      const messageSpan = document.createElement('span');
      messageSpan.textContent = `${message} `;
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.label || 'Download the résumé';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      resumeFeedbackEl.append(messageSpan, anchor, document.createTextNode('.'));
      return;
    }

    resumeFeedbackEl.textContent = message;
  };

  const updateResumeToggleState = (isVisible) => {
    if (!resumeToggleButton) {
      return;
    }

    resumeToggleButton.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    resumeToggleButton.textContent = isVisible ? 'Hide résumés' : 'Show résumés';
  };

  const setResumeVisibility = (isVisible) => {
    if (!resumeContentEl) {
      updateResumeToggleState(false);
      return;
    }

    if (isVisible) {
      resumeContentEl.removeAttribute('hidden');
      if (resumeSectionEl) {
        resumeSectionEl.classList.remove('resume-viewer--collapsed');
      }
    } else {
      resumeContentEl.setAttribute('hidden', '');
      if (resumeSectionEl) {
        resumeSectionEl.classList.add('resume-viewer--collapsed');
      }
    }

    updateResumeToggleState(isVisible);
  };

  const toggleResumeVisibility = () => {
    if (!resumeContentEl) {
      return;
    }

    const shouldShow = resumeContentEl.hasAttribute('hidden');
    setResumeVisibility(shouldShow);
  };

  const openResume = (resumeIdentifier) => {
    setResumeVisibility(true);

    const resume = resumeIndex.find(resumeIdentifier);

    if (!resume) {
      showResumeMessage(
        `We couldn't find a résumé named “${resumeIdentifier || 'unknown'}”.`,
        { type: 'error' },
      );
      return;
    }

    const resumeUrl = buildResumeUrl(resume.file);

    if (!resumeUrl) {
      showResumeMessage(
        `The ${resume.name || 'selected'} résumé does not have a file attached yet.`,
        { type: 'error' },
      );
      return;
    }

    const openedWindow = window.open(resumeUrl, '_blank');
    if (openedWindow) {
      openedWindow.opener = null;
    }

    showResumeMessage(`Opening ${resume.name}. If it doesn't appear,`, {
      type: 'success',
      link: { href: resumeUrl, label: 'download it directly' },
    });
  };

  const createResumeButton = (resumeIdentifier, label, options = {}) => {
    if (!resumeIdentifier) {
      return '';
    }

    const buttonLabel = label ? label.toString() : 'Open résumé';
    const ariaLabel =
      options.ariaLabel && options.ariaLabel.toString().trim()
        ? ` aria-label="${escapeHtml(options.ariaLabel)}"`
        : '';

    return `<button type="button" class="resume-link" data-resume-target="${escapeHtml(
      resumeIdentifier,
    )}"${ariaLabel}>${escapeHtml(buttonLabel)}</button>`;
  };

  const createResumeCard = (resume) => {
    if (!resume) {
      return '';
    }

    const focus = typeof resume.focus === 'string' && resume.focus.trim()
      ? `<p class="resume-card__focus">${escapeHtml(resume.focus)}</p>`
      : '';

    const highlights = Array.isArray(resume.highlights)
      ? resume.highlights.filter((item) => item && item.toString().trim())
      : [];
    const highlightMarkup = highlights.length
      ? `<ul class="resume-card__highlights">${highlights
          .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
          .join('')}</ul>`
      : '';

    const skills = Array.isArray(resume.skills)
      ? resume.skills.filter((skill) => skill && skill.toString().trim()).slice(0, 6)
      : [];
    const skillsMarkup = skills.length
      ? `<div class="resume-card__skills">${createBadgeGroup(
          skills,
          'badge badge--skill',
        )}</div>`
      : '';

    const accessibleName = resume.name
      ? `Open the ${resume.name} résumé`
      : 'Open the résumé file';

    return `
      <article class="resume-card">
        <header class="resume-card__header">
          <h3>${escapeHtml(resume.name || 'Résumé')}</h3>
        </header>
        ${focus}
        ${highlightMarkup}
        ${skillsMarkup}
        <div class="resume-card__actions">
          ${createResumeButton(resume.id || resume.name, 'Open résumé', {
            ariaLabel: accessibleName,
          })}
        </div>
      </article>
    `;
  };

  const renderResumeLibrary = () => {
    if (!resumeListEl) {
      return;
    }

    if (!resumeIndex.all.length) {
      resumeListEl.innerHTML =
        '<p class="resume-viewer__empty">Upload résumé documents to the data folder to see them here.</p>';
      showResumeMessage('Upload résumé documents to the data folder to see them here.');
      return;
    }

    resumeListEl.innerHTML = resumeIndex.all.map((resume) => createResumeCard(resume)).join('');
    showResumeMessage('Select a résumé to open it in a new tab.');
  };

  const createCard = (job) => {
    if (!job) {
      return '';
    }

    const locations = Array.isArray(job.locations)
      ? job.locations.filter((item) => item && item.toString().trim())
      : [];
    const focusAreas = Array.isArray(job.focusAreas)
      ? job.focusAreas.filter((item) => item && item.toString().trim())
      : [];

    const locationBadges = locations.length
      ? `<div class="job-card__meta">${createBadgeGroup(
          locations,
          'badge badge--location',
        )}</div>`
      : '';

    const focusBadges = focusAreas.length
      ? `<div class="job-card__meta">${createBadgeGroup(focusAreas)}</div>`
      : '';

    const resumeInfo = job.resume ? resumeIndex.find(job.resume) : null;
    const resumeTarget = resumeInfo ? resumeInfo.id : job.resume;
    const resumeLabel = resumeInfo ? resumeInfo.name : job.resume;

    const resumeBlock =
      resumeLabel && resumeTarget
        ? `<div class="job-card__resume">
            <span class="job-card__resume-label">Recommended résumé</span>
            ${createResumeButton(resumeTarget, resumeLabel, {
              ariaLabel: resumeLabel ? `View the ${resumeLabel} résumé` : 'View résumé',
            })}
          </div>`
        : '';

    const jobUrl = typeof job.url === 'string' && job.url.trim() ? job.url : '#';
    const title = escapeHtml(job.title || 'Curated job search');
    const summary = escapeHtml(job.summary || '');

    return `
      <article class="job-card">
        ${locationBadges}
        <h3 class="job-card__title">${title}</h3>
        <p class="job-card__summary">${summary}</p>
        ${resumeBlock}
        ${focusBadges}
        <a class="job-card__cta" href="${escapeHtml(
          jobUrl,
        )}" target="_blank" rel="noopener noreferrer">Open search</a>
      </article>
    `;
  };

  const updateResultsMeta = (visibleCount, totalCount) => {
    if (!resultsMetaEl) return;

    if (!visibleCount) {
      resultsMetaEl.innerHTML =
        'No curated job searches available right now. We check for new leads every 3 hours.';
      return;
    }

    const trackedDetail =
      totalCount && Number.isFinite(totalCount)
        ? ` from ${totalCount} tracked feed${totalCount === 1 ? '' : 's'}`
        : '';

    resultsMetaEl.innerHTML = `<strong>Top ${visibleCount}</strong> curated job searches${trackedDetail}. Updates automatically every 3 hours.`;
  };

  const renderJobs = () => {
    if (!jobListEl) {
      return;
    }

    const allJobs = Array.isArray(window.jobLinks) ? window.jobLinks : [];
    const topJobs = allJobs.slice(0, MAX_VISIBLE_JOBS);

    jobListEl.setAttribute('aria-busy', 'false');

    if (!topJobs.length) {
      jobListEl.innerHTML =
        '<p class="empty-state">No job links are ready yet. New leads load in automatically within the next refresh window.</p>';
      updateResultsMeta(0, allJobs.length);
      return;
    }

    jobListEl.innerHTML = topJobs.map((job) => createCard(job)).join('');
    updateResultsMeta(topJobs.length, allJobs.length);
  };

  const formatTimestamp = (date) =>
    date.toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const updateLastUpdated = () => {
    if (!lastUpdatedEl) return;
    lastUpdatedEl.textContent = formatTimestamp(new Date());
  };

  const refresh = () => {
    renderJobs();
    updateLastUpdated();
  };

  const handleResumeTriggerClick = (event) => {
    const trigger = event.target.closest('[data-resume-target]');
    if (!trigger) {
      return;
    }
    event.preventDefault();
    const resumeIdentifier = trigger.getAttribute('data-resume-target');
    openResume(resumeIdentifier);
  };

  renderResumeLibrary();

  if (jobListEl) {
    jobListEl.addEventListener('click', handleResumeTriggerClick);
  }

  if (resumeListEl) {
    resumeListEl.addEventListener('click', handleResumeTriggerClick);
  }

  if (resumeToggleButton) {
    resumeToggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      toggleResumeVisibility();
    });
  }

  window.openResume = openResume;
  window.viewResume = openResume;

  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
})();
