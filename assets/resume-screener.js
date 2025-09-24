(function () {
  const tools = window.careerTools || {};

  const form = document.getElementById('resume-screener-form');
  const profileSelect = document.getElementById('resume-screener-profile');
  const resumeTextInput = document.getElementById('resume-screener-text');
  const targetInput = document.getElementById('resume-screener-target');
  const jobInput = document.getElementById('resume-screener-job');
  const focusInput = document.getElementById('resume-screener-focus');
  const preferencesInput = document.getElementById('resume-screener-preferences');
  const submitButton = document.getElementById('resume-screener-submit');
  const statusEl = document.getElementById('resume-screener-status');

  const resultsEl = document.getElementById('resume-screener-results');
  const scoreMeter = document.getElementById('resume-screener-score');
  const summaryEl = document.getElementById('resume-screener-summary');
  const strengthsList = document.getElementById('resume-screener-strengths');
  const risksList = document.getElementById('resume-screener-risks');
  const keywordsList = document.getElementById('resume-screener-keywords');
  const actionsList = document.getElementById('resume-screener-actions');
  const atsList = document.getElementById('resume-screener-ats');
  const interviewList = document.getElementById('resume-screener-interview');

  tools.populateResumeSelect?.(profileSelect, { includeBlank: true });

  const parseFocusAreas = (value) =>
    (value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

  const buildPayload = () => {
    const payload = {
      resumeId: profileSelect?.value || '',
      resumeText: resumeTextInput?.value || '',
      targetRole: targetInput?.value || '',
      jobDescription: jobInput?.value || '',
      preferences: preferencesInput?.value || '',
    };

    const focusAreas = parseFocusAreas(focusInput?.value || '');
    if (focusAreas.length) {
      payload.focusAreas = focusAreas;
    }

    if (!payload.resumeId) {
      delete payload.resumeId;
    }
    if (!payload.resumeText) {
      delete payload.resumeText;
    }
    if (!payload.targetRole) {
      delete payload.targetRole;
    }
    if (!payload.jobDescription) {
      delete payload.jobDescription;
    }
    if (!payload.preferences) {
      delete payload.preferences;
    }

    return payload;
  };

  const handleError = (message) => {
    tools.toggleHidden?.(resultsEl, true);
    tools.setStatusMessage?.(statusEl, message || 'Unable to analyse the résumé right now.', 'error');
  };

  const renderResults = (result) => {
    tools.setScore?.(scoreMeter, result.headlineScore);
    tools.setText?.(summaryEl, result.executiveSummary, 'No executive summary available.');
    tools.renderList?.(strengthsList, result.strengths, 'No strengths identified.');
    tools.renderList?.(risksList, result.risks, 'No risks flagged.');
    tools.renderList?.(keywordsList, result.keywordGaps, 'No keyword gaps detected.');
    tools.renderList?.(actionsList, result.actionPlan, 'No immediate actions provided.');
    tools.renderPillList?.(atsList, result.atsKeywords, 'No ATS keywords returned.');
    tools.renderList?.(interviewList, result.interviewAngles, 'No interview talking points provided.');

    tools.toggleHidden?.(resultsEl, false);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    tools.setStatusMessage?.(statusEl, 'Analysing résumé…');
    tools.toggleHidden?.(resultsEl, true);

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const payload = buildPayload();

      if (!payload.resumeId && !payload.resumeText) {
        handleError('Select a résumé profile or paste résumé text to analyse.');
        return;
      }

      const response = await fetch('/api/career-coach/resume-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Unable to analyse the résumé.';
        try {
          const errorPayload = await response.json();
          if (errorPayload && errorPayload.error) {
            errorMessage = errorPayload.error;
          }
        } catch (error) {
          // ignore parsing error
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      renderResults(data.result || {});
      const targetRole = data.meta?.targetRole;
      const statusMessage = targetRole
        ? `Résumé screen complete for ${targetRole}.`
        : 'Résumé screen complete.';
      tools.setStatusMessage?.(statusEl, statusMessage, 'success');
    } catch (error) {
      handleError(error.message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

  form?.addEventListener('submit', submitForm);
})();
