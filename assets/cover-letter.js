(() => {
  const form = document.getElementById('cover-letter-form');
  const jobUrlInput = document.getElementById('cover-letter-job-url');
  const resumeSelect = document.getElementById('cover-letter-resume');
  const statusEl = document.getElementById('cover-letter-status');
  const statusLog = document.getElementById('cover-letter-status-log');
  const coverLetterOutput = document.getElementById('cover-letter-output');
  const companySummaryOutput = document.getElementById('company-summary-output');
  const jobSnippetOutput = document.getElementById('job-snippet-output');
  const copyButton = document.getElementById('copy-cover-letter');
  const copyStatusEl = document.getElementById('cover-letter-copy-status');
  const submitButton = document.getElementById('cover-letter-submit');

  if (
    !form ||
    !jobUrlInput ||
    !resumeSelect ||
    !statusEl ||
    !coverLetterOutput ||
    !companySummaryOutput ||
    !jobSnippetOutput ||
    !copyButton
  ) {
    return;
  }

  const DEFAULT_STATUS =
    'Add a job-posting URL and select your résumé to start drafting.';
  const JOB_INTEL_ENDPOINT = '/api/job-intel';
  const BUSY_SUBMIT_LABEL = 'Drafting…';

  let isSubmitting = false;
  let lastStatusMessage = '';
  let latestCoverLetter = '';
  let latestCompanySummary = '';
  let latestJobSnippet = '';
  const originalSubmitText = submitButton ? submitButton.textContent : '';

  const clearStatusLog = () => {
    if (statusLog) {
      statusLog.innerHTML = '';
    }
    lastStatusMessage = '';
  };

  const updateStatus = (
    message,
    { busy = false, log = true, resetLog = false, forceLog = false } = {}
  ) => {
    const text =
      message === null || message === undefined ? '' : String(message).trim();

    if (!text) {
      return;
    }

    statusEl.textContent = text;
    statusEl.setAttribute('aria-busy', busy ? 'true' : 'false');

    if (resetLog) {
      clearStatusLog();
    }

    if (log && statusLog && (forceLog || text !== lastStatusMessage)) {
      const item = document.createElement('li');
      item.textContent = text;
      statusLog.appendChild(item);
    }

    lastStatusMessage = text;
  };

  const markStatusIdle = () => {
    statusEl.setAttribute('aria-busy', 'false');
  };

  const setBusyState = (busy) => {
    isSubmitting = busy;
    form.setAttribute('aria-busy', busy ? 'true' : 'false');

    if (submitButton) {
      submitButton.disabled = busy;
      submitButton.setAttribute('aria-disabled', busy ? 'true' : 'false');
      if (busy && BUSY_SUBMIT_LABEL) {
        submitButton.textContent = BUSY_SUBMIT_LABEL;
      } else if (!busy && originalSubmitText) {
        submitButton.textContent = originalSubmitText;
      }
    }
  };

  const clearOutputs = () => {
    latestCoverLetter = '';
    latestCompanySummary = '';
    latestJobSnippet = '';

    coverLetterOutput.textContent = '';
    companySummaryOutput.textContent = '';
    jobSnippetOutput.textContent = '';

    copyButton.disabled = true;
    copyButton.setAttribute('aria-disabled', 'true');

    if (copyStatusEl) {
      copyStatusEl.textContent = '';
    }
  };

  const updateCoverLetter = (value, { append = false } = {}) => {
    if (typeof value !== 'string') {
      return;
    }

    latestCoverLetter = append ? `${latestCoverLetter}${value}` : value;
    coverLetterOutput.textContent = latestCoverLetter;

    const hasLetter = Boolean(latestCoverLetter && latestCoverLetter.trim());
    copyButton.disabled = !hasLetter;
    copyButton.setAttribute('aria-disabled', hasLetter ? 'false' : 'true');

    if (copyStatusEl) {
      copyStatusEl.textContent = '';
    }
  };

  const appendCoverLetter = (value) =>
    updateCoverLetter(value, { append: true });

  const updateCompanySummary = (value, { append = false } = {}) => {
    if (typeof value !== 'string') {
      return;
    }

    latestCompanySummary = append
      ? `${latestCompanySummary}${value}`
      : value;

    companySummaryOutput.textContent = latestCompanySummary;
  };

  const appendCompanySummary = (value) =>
    updateCompanySummary(value, { append: true });

  const updateJobSnippet = (value, { append = false } = {}) => {
    if (typeof value !== 'string') {
      return;
    }

    latestJobSnippet = append ? `${latestJobSnippet}${value}` : value;
    jobSnippetOutput.textContent = latestJobSnippet;
  };

  const appendJobSnippet = (value) => updateJobSnippet(value, { append: true });

  const populateResumeOptions = () => {
    const library = Array.isArray(window.resumeLibrary)
      ? window.resumeLibrary
      : [];

    const previousValue = resumeSelect.value;

    resumeSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = library.length
      ? 'Select a résumé focus…'
      : 'Résumé library loading…';
    placeholder.disabled = library.length > 0;
    placeholder.selected = true;
    resumeSelect.appendChild(placeholder);

    let matchedExisting = false;

    library.forEach((resume) => {
      if (!resume || typeof resume !== 'object') {
        return;
      }

      const { id, name } = resume;
      if (!id || !name) {
        return;
      }

      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;

      if (previousValue && id === previousValue) {
        option.selected = true;
        matchedExisting = true;
      }

      resumeSelect.appendChild(option);
    });

    if (matchedExisting) {
      placeholder.selected = false;
    }

    resumeSelect.disabled = library.length === 0;
  };

  const copyCoverLetter = async () => {
    if (!latestCoverLetter || !latestCoverLetter.trim()) {
      return;
    }

    if (copyStatusEl) {
      copyStatusEl.textContent = '';
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(latestCoverLetter);
      } else {
        const temp = document.createElement('textarea');
        temp.value = latestCoverLetter;
        temp.setAttribute('readonly', '');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }

      if (copyStatusEl) {
        copyStatusEl.textContent = 'Cover letter copied to the clipboard.';
      }
    } catch (error) {
      if (copyStatusEl) {
        copyStatusEl.textContent =
          'Copy unavailable. Use Ctrl+C (or ⌘+C) to copy the text manually.';
      }
    }
  };

  copyButton.addEventListener('click', (event) => {
    event.preventDefault();
    copyCoverLetter();
  });

  const parseLine = (line) => {
    if (!line) {
      return null;
    }

    let trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('data:')) {
      trimmed = trimmed.replace(/^data:\s*/i, '');
    }

    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return trimmed;
    }
  };

  const fetchJobIntel = async (payload) => {
    let streamMarkedDone = false;

    const processMessage = (message) => {
      if (Array.isArray(message)) {
        message.forEach(processMessage);
        return;
      }

      if (typeof message === 'string') {
        const trimmed = message.trim();
        if (!trimmed) {
          return;
        }

        if (trimmed === '[DONE]') {
          streamMarkedDone = true;
          markStatusIdle();
          if (latestCoverLetter) {
            updateStatus('Cover letter ready to review.', {
              busy: false,
              log: true,
              forceLog: true,
            });
          }
          return;
        }

        if (/^event:/i.test(trimmed)) {
          return;
        }

        updateStatus(trimmed, { busy: true, log: true });
        return;
      }

      if (!message || typeof message !== 'object') {
        return;
      }

      if (message.type === 'error' || message.error) {
        const errorMessage =
          typeof message.error === 'string'
            ? message.error
            : message.message || 'Unable to generate the cover letter.';
        throw new Error(errorMessage);
      }

      const statusMessage =
        (typeof message.message === 'string' && message.message) ||
        (typeof message.status === 'string' && message.status) ||
        (typeof message.stage === 'string' && message.stage);

      if (statusMessage) {
        updateStatus(statusMessage, {
          busy: message.done ? false : true,
          log: true,
        });
      }

      if (typeof message.coverLetterDelta === 'string') {
        appendCoverLetter(message.coverLetterDelta);
      }

      if (typeof message.companySummaryDelta === 'string') {
        appendCompanySummary(message.companySummaryDelta);
      }

      if (typeof message.jobSnippetDelta === 'string') {
        appendJobSnippet(message.jobSnippetDelta);
      }

      if (typeof message.delta === 'string') {
        const channel =
          typeof message.target === 'string'
            ? message.target
            : typeof message.channel === 'string'
            ? message.channel
            : '';

        if (channel === 'coverLetter' || message.type === 'coverLetterDelta') {
          appendCoverLetter(message.delta);
        } else if (
          channel === 'companySummary' ||
          channel === 'company'
        ) {
          appendCompanySummary(message.delta);
        } else if (channel === 'jobSnippet' || channel === 'job') {
          appendJobSnippet(message.delta);
        }
      }

      const coverLetterContent =
        typeof message.coverLetter === 'string'
          ? message.coverLetter
          : typeof message.letter === 'string'
          ? message.letter
          : message.type === 'coverLetter' && typeof message.content === 'string'
          ? message.content
          : null;

      if (typeof coverLetterContent === 'string') {
        updateCoverLetter(coverLetterContent);
      }

      const summaryContent =
        typeof message.companySummary === 'string'
          ? message.companySummary
          : typeof message.summary === 'string' &&
            (message.type === 'companySummary' || !message.type)
          ? message.summary
          : typeof message.company === 'string'
          ? message.company
          : null;

      if (typeof summaryContent === 'string' && summaryContent) {
        updateCompanySummary(summaryContent);
      }

      const snippetContent =
        typeof message.jobSnippet === 'string'
          ? message.jobSnippet
          : typeof message.snippet === 'string'
          ? message.snippet
          : typeof message.rawJobSnippet === 'string'
          ? message.rawJobSnippet
          : null;

      if (typeof snippetContent === 'string' && snippetContent) {
        updateJobSnippet(snippetContent);
      }

      if (message.done) {
        streamMarkedDone = true;
        if (!statusMessage) {
          updateStatus('Cover letter ready to review.', {
            busy: false,
            log: true,
            forceLog: true,
          });
        } else {
          markStatusIdle();
        }
      }
    };

    const readStream = async (response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: !done });
          }

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            const parsed = parseLine(line);
            if (parsed !== null && parsed !== undefined) {
              processMessage(parsed);
            }
          }

          if (done) {
            break;
          }
        }

        const remainder = buffer.trim();
        if (remainder) {
          const parsed = parseLine(remainder);
          if (parsed !== null && parsed !== undefined) {
            processMessage(parsed);
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    const response = await fetch(JOB_INTEL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Unable to generate the cover letter (status ${response.status}).`;

      try {
        const errorBody = await response.json();
        if (errorBody && (errorBody.error || errorBody.message)) {
          errorMessage = errorBody.error || errorBody.message;
        }
      } catch (error) {
        try {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        } catch (innerError) {
          // ignore
        }
      }

      throw new Error(errorMessage);
    }

    if (response.body && typeof response.body.getReader === 'function') {
      await readStream(response);
    } else {
      try {
        const fallback = await response.json();
        processMessage(fallback);
      } catch (error) {
        const text = await response.text().catch(() => '');
        if (text) {
          processMessage(text);
        }
      }
    }

    if (!streamMarkedDone) {
      markStatusIdle();
      if (latestCoverLetter) {
        updateStatus('Cover letter ready to review.', {
          busy: false,
          log: true,
          forceLog: true,
        });
      }
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      updateStatus('Still working on the current cover-letter request…', {
        busy: true,
        log: false,
      });
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const jobUrl = jobUrlInput.value.trim();
    const resumeId = resumeSelect.value;
    const includeResearchInput = form.querySelector(
      'input[name="include-research"]:checked'
    );
    const includeResearch = includeResearchInput
      ? includeResearchInput.value !== 'skip'
      : true;

    if (!resumeId) {
      updateStatus(
        resumeSelect.disabled
          ? 'The résumé library is still loading. Please try again shortly.'
          : 'Select a résumé before drafting your cover letter.',
        { busy: false, log: true, forceLog: true }
      );
      if (!resumeSelect.disabled) {
        resumeSelect.focus();
      }
      return;
    }

    clearOutputs();
    updateStatus('Submitting your cover-letter request…', {
      busy: true,
      log: true,
      resetLog: true,
      forceLog: true,
    });
    setBusyState(true);

    try {
      await fetchJobIntel({ jobUrl, resumeId, includeResearch });

      if (!latestCoverLetter) {
        updateStatus(
          'No cover letter was returned. Verify the job URL and try again.',
          { busy: false, log: true, forceLog: true }
        );
      }
    } catch (error) {
      console.error('cover-letter: job-intel error', error);
      const message =
        error && typeof error.message === 'string' && error.message
          ? error.message
          : 'Unable to generate the cover letter right now.';
      updateStatus(message, {
        busy: false,
        log: true,
        forceLog: true,
      });
    } finally {
      setBusyState(false);
    }
  });

  populateResumeOptions();
  clearOutputs();
  updateStatus(DEFAULT_STATUS, { busy: false, log: false, resetLog: true });
})();
