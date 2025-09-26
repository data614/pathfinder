(() => {
  const themeToggleButton = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;

  const applyTheme = (theme) => {
    htmlEl.classList.remove('dark-mode');
    if (theme === 'dark') {
      htmlEl.classList.add('dark-mode');
    }
  };

  const toggleTheme = () => {
    const currentThemeIsDark = htmlEl.classList.contains('dark-mode');
    const newTheme = currentThemeIsDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
  }

  // Apply saved theme on initial load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // If no theme is saved, use the browser preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }


  const jobListEl = document.getElementById('job-list');
  const resultsMetaEl = document.getElementById('results-meta');
  const lastUpdatedEl = document.getElementById('last-updated');
  const resumeListEl = document.getElementById('resume-list');
  const resumeFeedbackEl = document.getElementById('resume-feedback');

  const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
  const MAX_VISIBLE_JOBS = 20;

  const toText = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    return value.toString().trim();
  };

  const normaliseList = (items, limit) => {
    if (!Array.isArray(items)) {
      return [];
    }

    const sanitised = items.map((item) => toText(item)).filter(Boolean);

    if (typeof limit === 'number' && Number.isFinite(limit)) {
      return sanitised.slice(0, limit);
    }

    return sanitised;
  };

  const createElement = (tagName, className, textContent) => {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent !== undefined && textContent !== null) {
      element.textContent = textContent;
    }

    return element;
  };

  const createBadgeContainer = (items, containerClass, badgeClass) => {
    const entries = normaliseList(items);

    if (!entries.length) {
      return null;
    }

    const container = createElement('div', containerClass);
    entries.forEach((entry) => {
      const badge = createElement('span', badgeClass, entry);
      container.appendChild(badge);
    });
    return container;
  };

  const scheduleIdle = (task) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(
        () => {
          task();
        },
        { timeout: 250 },
      );
      return;
    }

    setTimeout(task, 0);
  };

  const resumeLibrary = Array.isArray(window.resumeLibrary)
    ? window.resumeLibrary.filter((resume) => resume && typeof resume === 'object')
    : [];

  const jobLibrary = Array.isArray(window.jobLinks)
    ? window.jobLinks.filter((job) => job && typeof job === 'object')
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
    if (typeof filePath !== 'string') {
      return '';
    }

    const trimmedPath = filePath.trim();
    if (!trimmedPath) {
      return '';
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedPath)) {
      return trimmedPath;
    }

    return trimmedPath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  };

  const showResumeMessage = (message, options = {}) => {
    if (!resumeFeedbackEl) return;

    const { type, link } = options;
    const text = toText(message);

    resumeFeedbackEl.textContent = '';
    resumeFeedbackEl.classList.remove('resume-viewer__feedback--error');
    resumeFeedbackEl.classList.remove('resume-viewer__feedback--success');

    if (!text) {
      return;
    }

    if (type === 'error') {
      resumeFeedbackEl.classList.add('resume-viewer__feedback--error');
    } else if (type === 'success') {
      resumeFeedbackEl.classList.add('resume-viewer__feedback--success');
    }

    if (link && link.href) {
      const messageSpan = document.createElement('span');
      messageSpan.textContent = `${text} `;
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = toText(link.label) || 'Download the résumé';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      resumeFeedbackEl.append(messageSpan, anchor, document.createTextNode('.'));
      return;
    }

    resumeFeedbackEl.textContent = text;
  };

  const openResume = (resumeIdentifier) => {
    const resume = resumeIndex.find(resumeIdentifier);

    if (!resume) {
      const lookupName = toText(resumeIdentifier) || 'unknown';
      showResumeMessage(`We couldn't find a résumé named “${lookupName}”.`, { type: 'error' });
      return;
    }

    const resumeUrl = buildResumeUrl(resume.file);

    if (!resumeUrl) {
      const resumeName = toText(resume.name) || 'selected';
      showResumeMessage(`The ${resumeName} résumé does not have a file attached yet.`, {
        type: 'error',
      });
      return;
    }

    const openedWindow = window.open(resumeUrl, '_blank');
    if (openedWindow) {
      openedWindow.opener = null;
    }

    const friendlyName = toText(resume.name) || 'the selected résumé';
    showResumeMessage(`Opening ${friendlyName}. If it doesn't appear,`, {
      type: 'success',
      link: { href: resumeUrl, label: 'download it directly' },
    });
  };

  const createResumeButton = (resumeIdentifier, label, options = {}) => {
    const identifier = toText(resumeIdentifier);

    if (!identifier) {
      return null;
    }

    const button = createElement('button', 'resume-link', toText(label) || 'Open résumé');
    button.type = 'button';
    button.dataset.resumeTarget = identifier;

    const ariaLabel = toText(options.ariaLabel);
    if (ariaLabel) {
      button.setAttribute('aria-label', ariaLabel);
    }

    return button;
  };

  const createResumeCard = (resume) => {
    if (!resume) {
      return null;
    }

    const card = createElement('article', 'resume-card');
    const header = createElement('header', 'resume-card__header');
    const title = createElement('h3', 'resume-card__title');
    const resumeIdentifier = toText(resume.id || resume.name);
    const resumeName = toText(resume.name) || 'Résumé';

    if (resumeIdentifier) {
      const trigger = createElement('button', 'resume-card__title-trigger', resumeName);
      trigger.type = 'button';
      trigger.dataset.resumeTarget = resumeIdentifier;
      trigger.setAttribute(
        'aria-label',
        resumeName ? `Open the ${resumeName} résumé` : 'Open the résumé file',
      );
      title.appendChild(trigger);
    } else {
      const span = createElement('span', 'resume-card__title-text', resumeName);
      title.appendChild(span);
    }

    header.appendChild(title);
    card.appendChild(header);

    const focusText = toText(resume.focus);
    if (focusText) {
      card.appendChild(createElement('p', 'resume-card__focus', focusText));
    }

    const highlights = normaliseList(resume.highlights);
    if (highlights.length) {
      const list = createElement('ul', 'resume-card__highlights');
      highlights.forEach((highlight) => {
        const item = createElement('li', null, highlight);
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    const skills = normaliseList(resume.skills, 6);
    if (skills.length) {
      const skillsContainer = createElement('div', 'resume-card__skills');
      skills.forEach((skill) => {
        const badge = createElement('span', 'badge badge--skill', skill);
        skillsContainer.appendChild(badge);
      });
      card.appendChild(skillsContainer);
    }

    return card;
  };

  const renderResumeLibrary = () => {
    if (!resumeListEl) {
      return;
    }

    if (!resumeIndex.all.length) {
      const emptyState = createElement(
        'p',
        'resume-viewer__empty',
        'Upload résumé documents to the data folder to see them here.',
      );
      resumeListEl.replaceChildren(emptyState);
      showResumeMessage('Upload résumé documents to the data folder to see them here.');
      return;
    }

    const fragment = document.createDocumentFragment();
    resumeIndex.all.forEach((resume) => {
      const card = createResumeCard(resume);
      if (card) {
        fragment.appendChild(card);
      }
    });
    resumeListEl.replaceChildren(fragment);
    showResumeMessage('Click a résumé title to open it in a new tab.');
  };

  const createJobCard = (job) => {
    if (!job) {
      return null;
    }

    const card = createElement('article', 'job-card');

    const locationContainer = createBadgeContainer(
      job.locations,
      'job-card__meta',
      'badge badge--location',
    );
    if (locationContainer) {
      card.appendChild(locationContainer);
    }

    const titleElement = createElement('h3', 'job-card__title');
    const jobTitle = toText(job.title) || 'Curated job search';
    const jobUrl = toText(job.url);
    if (jobUrl) {
      const link = createElement('a', 'job-card__title-link', jobTitle);
      link.href = jobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      titleElement.appendChild(link);
    } else {
      titleElement.textContent = jobTitle;
    }
    card.appendChild(titleElement);

    const summary = toText(job.summary);
    const summaryElement = createElement('p', 'job-card__summary', summary);
    card.appendChild(summaryElement);

    const resumeInfo = job.resume ? resumeIndex.find(job.resume) : null;
    const resumeTarget = toText(resumeInfo ? resumeInfo.id : job.resume);
    const resumeLabel = toText(resumeInfo ? resumeInfo.name : job.resume);

    if (resumeTarget && resumeLabel) {
      const resumeContainer = createElement('div', 'job-card__resume');
      const button = createResumeButton(resumeTarget, resumeLabel, {
        ariaLabel: resumeLabel ? `View the ${resumeLabel} résumé` : 'View résumé',
      });
      if (button) {
        resumeContainer.appendChild(button);
        card.appendChild(resumeContainer);
      }
    }

    const focusContainer = createBadgeContainer(job.focusAreas, 'job-card__meta', 'badge');
    if (focusContainer) {
      card.appendChild(focusContainer);
    }

    return card;
  };

  const updateResultsMeta = (visibleCount, totalCount) => {
    if (!resultsMetaEl) return;

    if (!visibleCount) {
      resultsMetaEl.textContent =
        'No curated job searches available right now. We check for new leads every 3 hours.';
      return;
    }

    const trackedDetail =
      totalCount && Number.isFinite(totalCount)
        ? ` from ${totalCount} tracked feed${totalCount === 1 ? '' : 's'}`
        : '';

    const strong = createElement('strong', null, `Top ${visibleCount}`);
    const detailText = ` curated job searches${trackedDetail}. Updates automatically every 3 hours.`;
    resultsMetaEl.replaceChildren(strong, document.createTextNode(detailText));
  };

  const renderJobs = () => {
    if (!jobListEl) {
      return;
    }

    jobListEl.setAttribute('aria-busy', 'false');

    if (!jobLibrary.length) {
      const emptyState = createElement(
        'p',
        'empty-state',
        'No job links are ready yet. New leads load in automatically within the next refresh window.',
      );
      jobListEl.replaceChildren(emptyState);
      updateResultsMeta(0, 0);
      return;
    }

    const fragment = document.createDocumentFragment();
    let renderedCount = 0;

    for (let index = 0; index < jobLibrary.length && renderedCount < MAX_VISIBLE_JOBS; index += 1) {
      const jobCard = createJobCard(jobLibrary[index]);
      if (jobCard) {
        fragment.appendChild(jobCard);
        renderedCount += 1;
      }
    }

    if (!renderedCount) {
      const emptyState = createElement(
        'p',
        'empty-state',
        'No job links are ready yet. New leads load in automatically within the next refresh window.',
      );
      jobListEl.replaceChildren(emptyState);
      updateResultsMeta(0, jobLibrary.length);
      return;
    }

    jobListEl.replaceChildren(fragment);
    updateResultsMeta(renderedCount, jobLibrary.length);
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

  const runRefresh = () => {
    renderJobs();
    updateLastUpdated();
  };

  const scheduleRefresh = () => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(runRefresh);
      return;
    }

    runRefresh();
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

  scheduleIdle(renderResumeLibrary);

  if (jobListEl) {
    jobListEl.addEventListener('click', handleResumeTriggerClick);
  }

  if (resumeListEl) {
    resumeListEl.addEventListener('click', handleResumeTriggerClick);
  }

  window.openResume = openResume;
  window.viewResume = openResume;

  scheduleRefresh();
  setInterval(scheduleRefresh, REFRESH_INTERVAL_MS);
})();
