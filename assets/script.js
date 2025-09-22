(() => {
  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const searchInput = document.getElementById('search');
  const lastUpdatedEl = document.getElementById('last-updated');

  const jobLinks = Array.isArray(window.jobLinks) ? window.jobLinks : [];
  const lastUpdated = window.jobLinksLastUpdated;

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
