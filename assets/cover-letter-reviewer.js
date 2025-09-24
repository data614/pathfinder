(function () {
  const tools = window.careerTools || {};

  const form = document.getElementById('cover-letter-reviewer-form');
  const profileSelect = document.getElementById('cover-letter-reviewer-profile');
  const targetInput = document.getElementById('cover-letter-reviewer-target');
  const jobInput = document.getElementById('cover-letter-reviewer-job');
  const preferencesInput = document.getElementById('cover-letter-reviewer-preferences');
  const coverLetterInput = document.getElementById('cover-letter-reviewer-text');
  const submitButton = document.getElementById('cover-letter-reviewer-submit');
  const statusEl = document.getElementById('cover-letter-reviewer-status');

  const resultsEl = document.getElementById('cover-letter-reviewer-results');
  const scoreMeter = document.getElementById('cover-letter-reviewer-score');
  const summaryEl = document.getElementById('cover-letter-reviewer-summary');
  const toneList = document.getElementById('cover-letter-reviewer-tone');
  const structureList = document.getElementById('cover-letter-reviewer-structure');
  const alignmentList = document.getElementById('cover-letter-reviewer-alignment');
  const editsList = document.getElementById('cover-letter-reviewer-edits');
  const subjectList = document.getElementById('cover-letter-reviewer-subjects');
  const followUpList = document.getElementById('cover-letter-reviewer-followup');

  tools.populateResumeSelect?.(profileSelect, { includeBlank: true, blankLabel: 'Optional — pick résumé context' });

  const buildPayload = () => {
    const payload = {
      resumeId: profileSelect?.value || '',
      targetRole: targetInput?.value || '',
      jobDescription: jobInput?.value || '',
      preferences: preferencesInput?.value || '',
      coverLetter: coverLetterInput?.value || '',
    };

    if (!payload.resumeId) {
      delete payload.resumeId;
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
    tools.setStatusMessage?.(statusEl, message || 'Unable to review the cover letter.', 'error');
  };

  const renderResults = (result) => {
    tools.setScore?.(scoreMeter, result.overallScore);
    tools.setText?.(summaryEl, result.executiveSummary, 'No executive summary provided.');
    tools.renderList?.(toneList, result.toneAssessment, 'No tone feedback provided.');
    tools.renderList?.(structureList, result.structureInsights, 'No structure feedback provided.');
    tools.renderList?.(alignmentList, result.alignmentInsights, 'No alignment notes provided.');
    tools.renderList?.(editsList, result.priorityEdits, 'No priority edits surfaced.');
    tools.renderPillList?.(subjectList, result.subjectLineIdeas, 'No subject line ideas returned.');
    tools.renderList?.(followUpList, result.followUpPrompts, 'No follow-up prompts provided.');

    tools.toggleHidden?.(resultsEl, false);
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!coverLetterInput?.value) {
      handleError('Paste the cover letter draft so we can review it.');
      return;
    }

    tools.setStatusMessage?.(statusEl, 'Reviewing cover letter…');
    tools.toggleHidden?.(resultsEl, true);

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const payload = buildPayload();

      const response = await fetch('/api/career-coach/cover-letter-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Unable to review the cover letter.';
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
      tools.setStatusMessage?.(statusEl, 'Cover letter review complete.', 'success');
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
