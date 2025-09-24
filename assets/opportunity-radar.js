(function () {
  const tools = window.careerTools || {};

  const jobMatchForm = document.getElementById('job-match-form');
  const jobMatchProfile = document.getElementById('job-match-profile');
  const jobMatchUrl = document.getElementById('job-match-url');
  const jobMatchTarget = document.getElementById('job-match-target');
  const jobMatchDescription = document.getElementById('job-match-description');
  const jobMatchPreferences = document.getElementById('job-match-preferences');
  const jobMatchSubmit = document.getElementById('job-match-submit');
  const jobMatchStatus = document.getElementById('job-match-status');

  const jobMatchResults = document.getElementById('job-match-results');
  const jobMatchScore = document.getElementById('job-match-score');
  const jobMatchSummary = document.getElementById('job-match-summary');
  const jobMatchStrengths = document.getElementById('job-match-strengths');
  const jobMatchRisks = document.getElementById('job-match-risks');
  const jobMatchKeywords = document.getElementById('job-match-keywords');
  const jobMatchTalking = document.getElementById('job-match-talking');
  const jobMatchActions = document.getElementById('job-match-actions');
  const jobMatchOutreach = document.getElementById('job-match-outreach');
  const jobMatchRecommendationsHeader = document.getElementById('job-match-recommendations-header');
  const jobMatchRecommendations = document.getElementById('job-match-recommendations');

  const opportunityResumeSelect = document.getElementById('opportunity-filter-resume');
  const opportunityLocationInput = document.getElementById('opportunity-filter-location');
  const opportunityRefreshButton = document.getElementById('opportunity-refresh');
  const opportunityStatus = document.getElementById('opportunity-status');
  const opportunityList = document.getElementById('opportunity-list');

  tools.populateResumeSelect?.(jobMatchProfile, { includeBlank: false });
  tools.populateResumeSelect?.(opportunityResumeSelect, {
    includeBlank: true,
    blankLabel: 'All résumé focuses',
  });

  const normalise = (value) => (value === null || value === undefined ? '' : value.toString().trim());

  const createOpportunityCard = (opportunity) => {
    const card = document.createElement('article');
    card.className = 'opportunity-card';

    const title = document.createElement('h3');
    title.className = 'opportunity-card__title';
    if (opportunity.url) {
      const link = document.createElement('a');
      link.className = 'opportunity-card__link';
      link.href = opportunity.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = opportunity.title || 'Live opportunity';
      title.appendChild(link);
    } else {
      title.textContent = opportunity.title || 'Live opportunity';
    }
    card.appendChild(title);

    const metaEntries = [];
    if (opportunity.company) {
      metaEntries.push(opportunity.company);
    }
    if (opportunity.location) {
      metaEntries.push(opportunity.location);
    }

    const meta = document.createElement('div');
    meta.className = 'opportunity-card__meta';

    metaEntries.forEach((entry) => {
      const span = document.createElement('span');
      span.textContent = entry;
      meta.appendChild(span);
    });

    if (opportunity.confidenceLabel) {
      const confidence = document.createElement('span');
      confidence.className = 'opportunity-card__confidence';
      if (typeof opportunity.confidenceScore === 'number' && Number.isFinite(opportunity.confidenceScore)) {
        confidence.textContent = `${opportunity.confidenceLabel} · ${Math.round(opportunity.confidenceScore)}%`;
      } else {
        confidence.textContent = opportunity.confidenceLabel;
      }
      meta.appendChild(confidence);
    }

    if (meta.childElementCount) {
      card.appendChild(meta);
    }

    if (opportunity.summary) {
      const summary = document.createElement('p');
      summary.className = 'opportunity-card__summary';
      summary.textContent = opportunity.summary;
      card.appendChild(summary);
    }

    if (Array.isArray(opportunity.resumeMatches) && opportunity.resumeMatches.length) {
      const resumeList = document.createElement('ul');
      resumeList.className = 'pill-list';
      opportunity.resumeMatches.forEach((match) => {
        const li = document.createElement('li');
        li.className = 'pill-list__item';
        li.textContent = match.name || match.id || 'Résumé match';
        resumeList.appendChild(li);
      });
      card.appendChild(resumeList);
    }

    if (Array.isArray(opportunity.reasons) && opportunity.reasons.length) {
      const reasons = document.createElement('ul');
      reasons.className = 'opportunity-card__reasons';
      opportunity.reasons.forEach((reason) => {
        const li = document.createElement('li');
        li.textContent = reason;
        reasons.appendChild(li);
      });
      card.appendChild(reasons);
    }

    if (opportunity.immediateNextStep) {
      const footer = document.createElement('div');
      footer.className = 'opportunity-card__footer';
      const label = document.createElement('span');
      label.textContent = 'Next step:';
      const step = document.createElement('span');
      step.textContent = opportunity.immediateNextStep;
      footer.append(label, step);
      card.appendChild(footer);
    }

    return card;
  };

  const renderOpportunityCards = (container, opportunities, emptyMessage) => {
    if (!container) {
      return;
    }

    container.innerHTML = '';
    if (!Array.isArray(opportunities) || !opportunities.length) {
      if (emptyMessage) {
        const message = document.createElement('p');
        message.className = 'result-card__body';
        message.textContent = emptyMessage;
        container.appendChild(message);
      }
      return;
    }

    opportunities.forEach((opportunity) => {
      container.appendChild(createOpportunityCard(opportunity));
    });
  };

  const buildJobMatchPayload = () => {
    const payload = {
      resumeId: jobMatchProfile?.value || '',
      jobUrl: jobMatchUrl?.value || '',
      targetRole: jobMatchTarget?.value || '',
      jobDescription: jobMatchDescription?.value || '',
      preferences: jobMatchPreferences?.value || '',
    };

    if (!payload.resumeId) {
      delete payload.resumeId;
    }
    if (!payload.jobUrl) {
      delete payload.jobUrl;
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

  const handleJobMatchError = (message) => {
    tools.toggleHidden?.(jobMatchResults, true);
    tools.toggleHidden?.(jobMatchRecommendationsHeader, true);
    tools.toggleHidden?.(jobMatchRecommendations, true);
    tools.setStatusMessage?.(jobMatchStatus, message || 'Unable to evaluate the job match.', 'error');
  };

  const renderJobMatchResults = (data) => {
    const result = data.result || {};

    tools.setScore?.(jobMatchScore, result.matchScore);
    const jobHeadline = data.job?.title ? `${data.job.title}${data.job.company ? ` · ${data.job.company}` : ''}` : '';
    const summaryFallback = jobHeadline ? `No summary provided. Focus on ${jobHeadline}.` : 'No summary provided.';
    tools.setText?.(jobMatchSummary, result.executiveSummary, summaryFallback);
    tools.renderList?.(jobMatchStrengths, result.strengths, 'No strengths identified.');
    tools.renderList?.(jobMatchRisks, result.risks, 'No risks flagged.');
    tools.renderPillList?.(jobMatchKeywords, result.keywordsToMirror, 'No keywords returned.');
    tools.renderList?.(jobMatchTalking, result.talkingPoints, 'No talking points provided.');
    tools.renderList?.(jobMatchActions, result.nextActions, 'No actions provided.');
    tools.renderList?.(jobMatchOutreach, result.outreachHooks, 'No outreach hooks provided.');

    tools.toggleHidden?.(jobMatchResults, false);

    if (Array.isArray(data.recommendedOpportunities) && data.recommendedOpportunities.length) {
      renderOpportunityCards(jobMatchRecommendations, data.recommendedOpportunities);
      tools.toggleHidden?.(jobMatchRecommendationsHeader, false);
      tools.toggleHidden?.(jobMatchRecommendations, false);
    } else {
      jobMatchRecommendations.innerHTML = '';
      tools.toggleHidden?.(jobMatchRecommendationsHeader, true);
      tools.toggleHidden?.(jobMatchRecommendations, true);
    }
  };

  const submitJobMatchForm = async (event) => {
    event.preventDefault();

    const resumeId = normalise(jobMatchProfile?.value);
    if (!resumeId) {
      handleJobMatchError('Select a résumé profile to run the match.');
      return;
    }

    tools.setStatusMessage?.(jobMatchStatus, 'Scoring match…');
    tools.toggleHidden?.(jobMatchResults, true);
    tools.toggleHidden?.(jobMatchRecommendationsHeader, true);
    tools.toggleHidden?.(jobMatchRecommendations, true);

    if (jobMatchSubmit) {
      jobMatchSubmit.disabled = true;
    }

    try {
      const payload = buildJobMatchPayload();

      const response = await fetch('/api/career-coach/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Unable to evaluate the job match.';
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
      renderJobMatchResults(data);
      const jobLabel = data.job?.title
        ? `Match scored for ${data.job.title}${data.job.company ? ` at ${data.job.company}` : ''}.`
        : 'Match scored successfully.';
      tools.setStatusMessage?.(jobMatchStatus, jobLabel, 'success');
    } catch (error) {
      handleJobMatchError(error.message);
    } finally {
      if (jobMatchSubmit) {
        jobMatchSubmit.disabled = false;
      }
    }
  };

  const fetchOpportunities = async () => {
    if (!opportunityList) {
      return;
    }

    tools.setStatusMessage?.(opportunityStatus, 'Loading curated opportunities…');
    opportunityList.innerHTML = '';

    const params = new URLSearchParams();
    const resumeId = normalise(opportunityResumeSelect?.value);
    const location = normalise(opportunityLocationInput?.value);

    if (resumeId) {
      params.set('resumeId', resumeId);
    }
    if (location) {
      params.set('location', location);
    }
    params.set('limit', '6');

    try {
      const response = await fetch(`/api/career-coach/opportunities?${params.toString()}`);

      if (!response.ok) {
        let errorMessage = 'Unable to load curated opportunities.';
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
      renderOpportunityCards(opportunityList, data.opportunities, 'No curated opportunities match the current filters yet.');
      const total = Array.isArray(data.opportunities) ? data.opportunities.length : 0;
      const statusMessage = total
        ? `Showing ${total} curated lead${total === 1 ? '' : 's'}.`
        : 'No curated opportunities match the current filters yet.';
      tools.setStatusMessage?.(opportunityStatus, statusMessage, total ? 'success' : undefined);
    } catch (error) {
      tools.setStatusMessage?.(opportunityStatus, error.message, 'error');
    }
  };

  jobMatchForm?.addEventListener('submit', submitJobMatchForm);
  opportunityRefreshButton?.addEventListener('click', fetchOpportunities);
  opportunityResumeSelect?.addEventListener('change', fetchOpportunities);

  if (jobMatchProfile && jobMatchProfile.options.length) {
    jobMatchProfile.selectedIndex = 0;
  }

  fetchOpportunities();
})();
