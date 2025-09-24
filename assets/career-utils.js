(function () {
  const normalise = (value) =>
    value === null || value === undefined ? '' : value.toString().trim();

  const normaliseId = (value) => normalise(value).toLowerCase();

  const getResumeLibrary = () =>
    Array.isArray(window.resumeLibrary)
      ? window.resumeLibrary.filter((resume) => resume && typeof resume === 'object')
      : [];

  const findResume = (identifier) => {
    const target = normaliseId(identifier);
    if (!target) {
      return null;
    }
    return (
      getResumeLibrary().find((resume) => normaliseId(resume.id) === target) ||
      getResumeLibrary().find((resume) => normaliseId(resume.name) === target) ||
      null
    );
  };

  const populateResumeSelect = (selectEl, options = {}) => {
    if (!selectEl) {
      return;
    }

    const { includeBlank = true, blankLabel = 'Select résumé profile' } = options;
    const library = getResumeLibrary();

    selectEl.innerHTML = '';

    if (includeBlank) {
      const blankOption = document.createElement('option');
      blankOption.value = '';
      blankOption.textContent = blankLabel;
      selectEl.appendChild(blankOption);
    }

    library.forEach((resume) => {
      const option = document.createElement('option');
      option.value = resume.id;
      option.textContent = resume.name;
      if (resume.promptProfile?.focus || resume.focus) {
        option.dataset.focus = resume.promptProfile?.focus || resume.focus;
      }
      selectEl.appendChild(option);
    });
  };

  const setText = (element, value, fallback = '') => {
    if (!element) {
      return;
    }
    const text = normalise(value) || fallback;
    element.textContent = text;
  };

  const renderList = (listEl, items, emptyMessage) => {
    if (!listEl) {
      return;
    }

    listEl.innerHTML = '';
    const values = (Array.isArray(items) ? items : []).map(normalise).filter(Boolean);

    if (!values.length && emptyMessage) {
      const li = document.createElement('li');
      li.textContent = emptyMessage;
      listEl.appendChild(li);
      return;
    }

    values.forEach((value) => {
      const li = document.createElement('li');
      li.textContent = value;
      listEl.appendChild(li);
    });
  };

  const renderPillList = (listEl, items, fallback) => {
    if (!listEl) {
      return;
    }

    listEl.innerHTML = '';
    const values = (Array.isArray(items) ? items : []).map(normalise).filter(Boolean);

    if (!values.length && fallback) {
      const li = document.createElement('li');
      li.className = 'pill-list__item';
      li.textContent = fallback;
      listEl.appendChild(li);
      return;
    }

    values.forEach((value) => {
      const li = document.createElement('li');
      li.className = 'pill-list__item';
      li.textContent = value;
      listEl.appendChild(li);
    });
  };

  const toggleHidden = (element, hidden) => {
    if (!element) {
      return;
    }
    element.hidden = Boolean(hidden);
  };

  const setStatusMessage = (element, message, state) => {
    if (!element) {
      return;
    }

    element.classList.remove('tool__status--error', 'tool__status--success');

    if (!message) {
      element.textContent = '';
      element.hidden = true;
      return;
    }

    element.textContent = message;
    element.hidden = false;

    if (state === 'error') {
      element.classList.add('tool__status--error');
    } else if (state === 'success') {
      element.classList.add('tool__status--success');
    }
  };

  const setScore = (meterEl, scoreValue) => {
    if (!meterEl) {
      return;
    }

    const score = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, Math.round(scoreValue))) : 0;
    const valueEl = meterEl.querySelector('.score-meter__value');
    const fillEl = meterEl.querySelector('.score-meter__bar-fill');

    if (valueEl) {
      valueEl.textContent = `${score}`;
    }
    if (fillEl) {
      fillEl.style.width = `${score}%`;
    }
  };

  window.careerTools = {
    getResumeLibrary,
    findResume,
    populateResumeSelect,
    setText,
    renderList,
    renderPillList,
    toggleHidden,
    setStatusMessage,
    setScore,
  };
})();
