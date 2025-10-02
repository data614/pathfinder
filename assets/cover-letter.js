(() => {
  const form = document.getElementById('cover-letter-form');
  if (!form) {
    return;
  }

  const jobUrlInput = document.getElementById('cover-letter-url');
  const resumeSelect = document.getElementById('cover-letter-resume');
  const researchToggle = document.getElementById('cover-letter-include-research');
  const preferencesInput = document.getElementById('cover-letter-preferences');
  const statusEl = document.getElementById('cover-letter-status');
  const progressList = document.getElementById('cover-letter-progress');
  const progressEmpty = document.getElementById('cover-letter-progress-empty');
  const letterOutput = document.getElementById('cover-letter-output');
  const talkingPointsList = document.getElementById('cover-letter-talking-points');
  const researchList = document.getElementById('cover-letter-research-sources');
  const submitButton = form.querySelector('[type="submit"]');

  const resumeLibrary = Array.isArray(window.resumeLibrary)
    ? window.resumeLibrary.filter((entry) => entry && typeof entry === 'object')
    : [];

  let activeController = null;
  let latestResult = null;

  const setStatus = (message, variant = 'info') => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || '';
    statusEl.classList.remove('cover-letter__status--error');
    statusEl.classList.remove('cover-letter__status--success');

    if (!message) {
      statusEl.setAttribute('hidden', '');
      return;
    }

    statusEl.removeAttribute('hidden');

    if (variant === 'error') {
      statusEl.classList.add('cover-letter__status--error');
    } else if (variant === 'success') {
      statusEl.classList.add('cover-letter__status--success');
    }
  };

  const clearOutputs = () => {
    latestResult = null;
    if (letterOutput) {
      letterOutput.textContent = '';
    }
    if (talkingPointsList) {
      talkingPointsList.innerHTML = '';
    }
    if (researchList) {
      researchList.innerHTML = '';
    }
  };

  const resetProgress = () => {
    if (progressList) {
      progressList.innerHTML = '';
    }
    if (progressEmpty) {
      progressEmpty.removeAttribute('hidden');
    }
  };

  const appendProgress = (stage, message, meta = {}) => {
    if (!progressList) {
      return;
    }

    const item = document.createElement('li');
    item.className = 'cover-letter__progress-item';

    const stageSpan = document.createElement('span');
    stageSpan.className = 'cover-letter__progress-stage';
    stageSpan.textContent = stage || 'update';

    const messageSpan = document.createElement('span');
    messageSpan.className = 'cover-letter__progress-message';
    messageSpan.textContent = message || '';

    item.append(stageSpan, messageSpan);

    if (meta && typeof meta === 'object') {
      const metaEntries = Object.entries(meta).filter(
        ([key, value]) =>
          key !== 'stage' && key !== 'message' && value !== undefined && value !== null,
      );
      if (metaEntries.length) {
        const metaList = document.createElement('dl');
        metaList.className = 'cover-letter__progress-meta';
        metaEntries.slice(0, 3).forEach(([key, value]) => {
          const label = document.createElement('dt');
          label.textContent = key;
          const definition = document.createElement('dd');
          definition.textContent = String(value);
          metaList.append(label, definition);
        });
        item.append(metaList);
      }
    }

    progressList.prepend(item);

    const items = progressList.querySelectorAll('li');
    if (items.length > 12) {
      progressList.removeChild(progressList.lastElementChild);
    }

    if (progressEmpty) {
      progressEmpty.setAttribute('hidden', '');
    }
  };

  const renderCoverLetter = (result) => {
    latestResult = result || null;

    if (!result) {
      clearOutputs();
      return;
    }

    if (letterOutput) {
      letterOutput.textContent = result.coverLetterMarkdown || '';
    }

    if (talkingPointsList) {
      talkingPointsList.innerHTML = '';
      if (Array.isArray(result.talkingPoints) && result.talkingPoints.length) {
        result.talkingPoints.slice(0, 6).forEach((point) => {
          if (!point) return;
          const li = document.createElement('li');
          li.textContent = point;
          talkingPointsList.append(li);
        });
      }
    }

    if (researchList) {
      researchList.innerHTML = '';
      if (Array.isArray(result.researchSources) && result.researchSources.length) {
        result.researchSources.slice(0, 5).forEach((source) => {
          if (!source || !source.url) return;
          const li = document.createElement('li');
          const link = document.createElement('a');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = source.title || source.url;
          li.append(link);
          researchList.append(li);
        });
      }
    }
  };

  const toggleFormDisabled = (isDisabled) => {
    if (submitButton) {
      submitButton.disabled = Boolean(isDisabled);
    }
    if (jobUrlInput) {
      jobUrlInput.disabled = Boolean(isDisabled);
    }
    if (resumeSelect) {
      resumeSelect.disabled = Boolean(isDisabled);
    }
    if (researchToggle) {
      researchToggle.disabled = Boolean(isDisabled);
    }
    if (preferencesInput) {
      preferencesInput.disabled = Boolean(isDisabled);
    }
  };

  const abortActiveRequest = () => {
    if (activeController) {
      try {
        activeController.abort();
      } catch (error) {
        // Ignore abort errors from stale controllers.
      }
      activeController = null;
    }
  };

  const processEventChunk = (chunk) => {
    const lines = chunk.split('\n');
    let eventName = 'message';
    const dataLines = [];

    lines.forEach((line) => {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    });

    if (!dataLines.length) {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(dataLines.join(''));
    } catch (error) {
      return;
    }

    switch (eventName) {
      case 'progress':
        appendProgress(parsed.stage, parsed.message, parsed);
        break;
      case 'result':
        renderCoverLetter(parsed.data);
        setStatus('Draft completed. Copy the results or iterate with new preferences.', 'success');
        break;
      case 'error':
        setStatus(parsed.message || 'The cover-letter request failed.', 'error');
        toggleFormDisabled(false);
        activeController = null;
        break;
      case 'complete':
        toggleFormDisabled(false);
        activeController = null;
        break;
      default:
        break;
    }
  };

  const streamCoverLetter = async (payload) => {
    abortActiveRequest();
    clearOutputs();
    resetProgress();
    setStatus('Generating cover letter…');
    toggleFormDisabled(true);

    const controller = new AbortController();
    activeController = controller;

    let response;
    try {
      response = await fetch('/api/job-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      toggleFormDisabled(false);
      setStatus('Network error while requesting the cover letter. Please retry.', 'error');
      return;
    }

    if (!response.ok || !response.body) {
      toggleFormDisabled(false);
      setStatus('The cover-letter service returned an error. Check the job URL and try again.', 'error');
      return;
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary > -1) {
          const chunk = buffer.slice(0, boundary);
          processEventChunk(chunk);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus('Streaming interrupted. Please try again.', 'error');
      }
    } finally {
      toggleFormDisabled(false);
      activeController = null;
    }
  };

  const populateResumeSelect = () => {
    if (!resumeSelect) {
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a résumé profile…';
    placeholder.disabled = true;
    placeholder.selected = true;
    resumeSelect.append(placeholder);

    resumeLibrary.forEach((resume) => {
      const option = document.createElement('option');
      option.value = resume.id;
      option.textContent = resume.name;
      if (resume.promptProfile?.focus) {
        option.title = resume.promptProfile.focus;
      }
      resumeSelect.append(option);
    });
  };

  const copyToClipboard = async (event) => {
    const trigger = event.target.closest('[data-copy-target]');
    if (!trigger) {
      return;
    }

    let textToCopy = '';
    if (trigger.dataset.copyTarget === 'cover-letter') {
      textToCopy = latestResult?.coverLetterMarkdown || '';
    } else if (trigger.dataset.copyTarget === 'talking-points') {
      if (Array.isArray(latestResult?.talkingPoints)) {
        textToCopy = latestResult.talkingPoints.join('\n');
      }
    }

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      trigger.classList.add('copy-button--success');
      const originalLabel = trigger.getAttribute('data-copy-label') || trigger.textContent;
      trigger.textContent = 'Copied!';
      setTimeout(() => {
        trigger.classList.remove('copy-button--success');
        trigger.textContent = originalLabel;
      }, 2000);
    } catch (error) {
      trigger.classList.add('copy-button--error');
      const originalLabel = trigger.getAttribute('data-copy-label') || trigger.textContent;
      trigger.textContent = 'Copy failed';
      setTimeout(() => {
        trigger.classList.remove('copy-button--error');
        trigger.textContent = originalLabel;
      }, 2000);
    }
  };

  const buildPayload = () => ({
    jobUrl: jobUrlInput ? jobUrlInput.value.trim() : '',
    resumeId: resumeSelect ? resumeSelect.value.trim() : '',
    includeResearch: researchToggle ? researchToggle.checked : false,
    preferences: preferencesInput ? preferencesInput.value.trim() : '',
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.jobUrl) {
      setStatus('Enter a job posting URL to begin.', 'error');
      jobUrlInput?.focus();
      return;
    }

    if (!payload.resumeId) {
      setStatus('Select the résumé to anchor the cover letter.', 'error');
      resumeSelect?.focus();
      return;
    }

    streamCoverLetter(payload);
  });

  document.addEventListener('click', copyToClipboard);

  populateResumeSelect();
})();
