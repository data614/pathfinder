(() => {
  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const lastUpdatedEl = document.getElementById('last-updated');

  if (!jobListEl) {
    return;
  }

  const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
  const MAX_VISIBLE_JOBS = 20;

  const formatTimestamp = (date) =>
    date.toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const createBadgeGroup = (items, className = 'badge') =>
    items.map((item) => `<span class="${className}">${item}</span>`).join('');

  const createCard = (job) => {
    const locations = Array.isArray(job.locations) ? job.locations : [];
    const focusAreas = Array.isArray(job.focusAreas) ? job.focusAreas : [];
    const locationBadges = locations.length
      ? `<div class="job-card__meta">${createBadgeGroup(
          locations,
          'badge badge--location',
        )}</div>`
      : '';
    const focusBadges = focusAreas.length
      ? `<div class="job-card__meta">${createBadgeGroup(focusAreas)}</div>`
      : '';
    const resumeBlock = job.resume
      ? `<div class="job-card__resume">Recommended résumé <span>${job.resume}</span></div>`
      : '';
    const jobUrl = job.url || '#';
    const title = job.title || 'Curated job search';
    const summary = job.summary || '';

    return `
      <article class="job-card">
        ${locationBadges}
        <h3 class="job-card__title">${title}</h3>
        <p class="job-card__summary">${summary}</p>
        ${resumeBlock}
        ${focusBadges}
        <a class="job-card__cta" href="${jobUrl}" target="_blank" rel="noopener noreferrer">Open search</a>
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
      totalCount
        ? ` from ${totalCount} tracked feed${totalCount === 1 ? '' : 's'}`
        : '';

    resultsMetaEl.innerHTML = `<strong>Top ${visibleCount}</strong> curated job searches${trackedDetail}. Updates automatically every 3 hours.`;
  };

  const renderJobs = () => {
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

  const updateLastUpdated = () => {
    if (!lastUpdatedEl) return;
    lastUpdatedEl.textContent = formatTimestamp(new Date());
  };

  const refresh = () => {
    renderJobs();
    updateLastUpdated();
  };

  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
})();
