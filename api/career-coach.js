'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { fetch } = require('undici');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');
const OpenAI = require('openai');
const { resumeLibrary, buildPromptProfile } = require('./resume-library');
const { curatedOpportunities } = require('./opportunity-data');
const { TtlCache } = require('./utils/cache');

const DEFAULT_RATE_LIMIT_WINDOW_MS = Number(process.env.CAREER_COACH_RATE_WINDOW_MS) || 60_000;
const DEFAULT_RATE_LIMIT_MAX = Number(process.env.CAREER_COACH_RATE_LIMIT) || 10;
const OPENAI_TIMEOUT_MS = Number(process.env.CAREER_COACH_OPENAI_TIMEOUT_MS) || 60_000;
const JOB_FETCH_TIMEOUT_MS = Number(process.env.CAREER_COACH_JOB_FETCH_TIMEOUT_MS) || 20_000;
const USER_AGENT =
  process.env.CAREER_COACH_USER_AGENT ||
  'PathfinderCareerCoach/1.0 (+https://github.com/your-org/pathfinder)';
const MAX_CONTEXT_CHARS = Number(process.env.CAREER_COACH_MAX_CONTEXT_CHARS) || 8_000;
const JOB_DOCUMENT_CACHE_TTL_MS = Number(process.env.CAREER_COACH_JOB_CACHE_TTL_MS) || 3 * 60 * 60 * 1000;
const JOB_DOCUMENT_CACHE_MAX_ENTRIES = Number(process.env.CAREER_COACH_JOB_CACHE_MAX_ENTRIES) || 48;

const jobDocumentCache = new TtlCache({
  defaultTtlMs: JOB_DOCUMENT_CACHE_TTL_MS,
  maxEntries: JOB_DOCUMENT_CACHE_MAX_ENTRIES,
});

const RESUME_REVIEW_SCHEMA = {
  name: 'resume_readiness_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'executiveSummary',
      'headline',
      'headlineScore',
      'strengths',
      'riskFactors',
      'keywordGaps',
      'actionPlan',
      'atsKeywords',
      'interviewAngles',
    ],
    properties: {
      executiveSummary: { type: 'string' },
      headline: { type: 'string' },
      headlineScore: { type: 'integer', minimum: 0, maximum: 100 },
      strengths: { type: 'array', items: { type: 'string' } },
      riskFactors: { type: 'array', items: { type: 'string' } },
      keywordGaps: { type: 'array', items: { type: 'string' } },
      actionPlan: { type: 'array', items: { type: 'string' } },
      atsKeywords: { type: 'array', items: { type: 'string' } },
      interviewAngles: { type: 'array', items: { type: 'string' } },
    },
  },
};

const COVER_LETTER_REVIEW_SCHEMA = {
  name: 'cover_letter_quality_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'executiveSummary',
      'overallScore',
      'toneAssessment',
      'structureInsights',
      'alignmentInsights',
      'priorityEdits',
      'followUpPrompts',
      'subjectLineIdeas',
    ],
    properties: {
      executiveSummary: { type: 'string' },
      overallScore: { type: 'integer', minimum: 0, maximum: 100 },
      toneAssessment: { type: 'array', items: { type: 'string' } },
      structureInsights: { type: 'array', items: { type: 'string' } },
      alignmentInsights: { type: 'array', items: { type: 'string' } },
      priorityEdits: { type: 'array', items: { type: 'string' } },
      followUpPrompts: { type: 'array', items: { type: 'string' } },
      subjectLineIdeas: { type: 'array', items: { type: 'string' } },
    },
  },
};

const JOB_MATCH_SCHEMA = {
  name: 'job_match_blueprint',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'executiveSummary',
      'matchScore',
      'headline',
      'strengths',
      'risks',
      'keywordsToMirror',
      'talkingPoints',
      'nextActions',
      'outreachHooks',
    ],
    properties: {
      executiveSummary: { type: 'string' },
      matchScore: { type: 'integer', minimum: 0, maximum: 100 },
      headline: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      keywordsToMirror: { type: 'array', items: { type: 'string' } },
      talkingPoints: { type: 'array', items: { type: 'string' } },
      nextActions: { type: 'array', items: { type: 'string' } },
      outreachHooks: { type: 'array', items: { type: 'string' } },
      recommendedResumeId: { type: 'string' },
    },
  },
};

function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const cleaned = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return cleaned.replace(/\u00a0/g, ' ').trim();
}

function sanitizeArray(values, limit) {
  if (!Array.isArray(values)) {
    return [];
  }

  const sanitised = values
    .map((entry) => sanitizeText(typeof entry === 'string' ? entry : JSON.stringify(entry)))
    .filter(Boolean);

  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return sanitised.slice(0, limit);
  }

  return sanitised;
}

function clampScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function truncate(value, maxLength) {
  const text = sanitizeText(value);
  if (!text) {
    return '';
  }
  if (typeof maxLength !== 'number' || !Number.isFinite(maxLength) || maxLength <= 0) {
    return text;
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function normaliseString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
}

function parseOpenAiResponse(response) {
  if (!response) {
    throw new Error('OpenAI response was empty.');
  }

  const outputText = response.output_text || response.output?.[0]?.content?.[0]?.text;

  if (!outputText) {
    throw new Error('OpenAI response did not include any text content.');
  }

  try {
    return JSON.parse(outputText);
  } catch (error) {
    throw new Error('Unable to parse OpenAI JSON response.');
  }
}

function formatBulletList(items = []) {
  const sanitised = sanitizeArray(items);
  if (!sanitised.length) {
    return '- None provided';
  }
  return sanitised.map((item) => `- ${item}`).join('\n');
}

function buildResumeSnapshot(resume) {
  if (!resume) {
    return null;
  }

  const promptProfile = resume.promptProfile || buildPromptProfile(resume);

  return {
    id: resume.id,
    name: resume.name,
    focus: sanitizeText(promptProfile.focus || resume.focus),
    topHighlights: sanitizeArray(promptProfile.topHighlights || resume.highlights, 5),
    prioritySkills: sanitizeArray(promptProfile.prioritySkills || resume.skills, 12),
    primaryMetrics: sanitizeArray(promptProfile.primaryMetrics || resume.highlights, 5),
  };
}

function createResumeReviewPrompt(payload = {}) {
  const resumeSnapshot = payload.resumeSnapshot || null;
  const resumeText = truncate(payload.resumeText, MAX_CONTEXT_CHARS);
  const targetRole = truncate(payload.targetRole, 600) || 'Not specified';
  const jobDescription = truncate(payload.jobDescription, MAX_CONTEXT_CHARS);
  const focusAreas = sanitizeArray(payload.focusAreas, 8);
  const preferences = truncate(payload.preferences, 600);

  const lines = [
    'You are a senior career coach and ATS specialist analysing a résumé for a target opportunity.',
    'Deliver precise, metric-driven feedback and return only JSON that conforms to the resume_readiness_report schema.',
    'Do not include commentary outside the JSON payload.',
    '',
    `Target role focus: ${targetRole}`,
    '',
  ];

  if (focusAreas.length) {
    lines.push('Priority capabilities to emphasise:');
    lines.push(formatBulletList(focusAreas));
    lines.push('');
  }

  if (preferences) {
    lines.push('Candidate preferences or notes:');
    lines.push(preferences);
    lines.push('');
  }

  if (jobDescription) {
    lines.push('Job description excerpt:');
    lines.push(jobDescription);
    lines.push('');
  } else {
    lines.push('Job description excerpt: Not provided. Focus on résumé strengths and common ATS patterns.');
    lines.push('');
  }

  if (resumeSnapshot) {
    lines.push('Résumé library snapshot (use for positioning, do not echo back verbatim):');
    lines.push(JSON.stringify(resumeSnapshot, null, 2));
    lines.push('');
  }

  if (resumeText) {
    lines.push('Candidate supplied résumé text sample:');
    lines.push(resumeText);
    lines.push('');
  }

  lines.push('Respond with the JSON object only.');
  return lines.join('\n');
}

function createCoverLetterReviewPrompt(payload = {}) {
  const resumeSnapshot = payload.resumeSnapshot || null;
  const coverLetter = truncate(payload.coverLetter, MAX_CONTEXT_CHARS);
  const jobDescription = truncate(payload.jobDescription, MAX_CONTEXT_CHARS);
  const preferences = truncate(payload.preferences, 600);
  const targetRole = truncate(payload.targetRole, 600) || 'Not provided';

  const lines = [
    'You are an executive recruiter auditing a cover letter for clarity, tone, and alignment.',
    'Return structured feedback as JSON that matches the cover_letter_quality_report schema.',
    'Be direct, action-oriented, and highlight quantified improvements.',
    '',
    `Target role focus: ${targetRole}`,
    '',
  ];

  if (preferences) {
    lines.push('Candidate notes or non-negotiables:');
    lines.push(preferences);
    lines.push('');
  }

  if (jobDescription) {
    lines.push('Job description excerpt (for alignment checks):');
    lines.push(jobDescription);
    lines.push('');
  }

  if (resumeSnapshot) {
    lines.push('Résumé highlights (reference but do not repeat verbatim):');
    lines.push(JSON.stringify(resumeSnapshot, null, 2));
    lines.push('');
  }

  if (coverLetter) {
    lines.push('Cover letter draft to review:');
    lines.push(coverLetter);
    lines.push('');
  } else {
    lines.push('Cover letter draft: Not provided.');
    lines.push('');
  }

  lines.push('Respond with the JSON object only.');
  return lines.join('\n');
}

function createJobMatchPrompt(payload = {}) {
  const resumeSnapshot = payload.resumeSnapshot || null;
  const jobSummary = truncate(payload.jobSummary, MAX_CONTEXT_CHARS);
  const jobMeta = payload.jobMeta || {};
  const preferences = truncate(payload.preferences, 600);
  const targetRole = truncate(payload.targetRole, 600) || jobMeta.title || 'Target role not provided';

  const lines = [
    'You are an elite talent agent quantifying fit between a candidate résumé and a specific job.',
    'Provide a crisp go/no-go assessment, focusing on evidence-based alignment and immediate next steps.',
    'Return only JSON that matches the job_match_blueprint schema.',
    '',
    `Role headline: ${targetRole}`,
    `Company: ${jobMeta.company || 'Unknown'}`,
    jobMeta.location ? `Location: ${jobMeta.location}` : 'Location: Not identified',
    '',
  ];

  if (preferences) {
    lines.push('Candidate preferences or guardrails:');
    lines.push(preferences);
    lines.push('');
  }

  if (jobSummary) {
    lines.push('Job description synopsis:');
    lines.push(jobSummary);
    lines.push('');
  } else {
    lines.push('Job description synopsis: Not available. Base the assessment on résumé strengths and generic expectations.');
    lines.push('');
  }

  if (resumeSnapshot) {
    lines.push('Résumé data (for reference only):');
    lines.push(JSON.stringify(resumeSnapshot, null, 2));
    lines.push('');
  }

  lines.push('Respond with the JSON object only.');
  return lines.join('\n');
}

async function fetchJobDocument(url, timeoutMs) {
  const cacheKey = typeof url === 'string' ? url : url?.toString();

  if (!cacheKey) {
    throw new Error('A job URL is required.');
  }

  const effectiveTimeout = Number(timeoutMs) || JOB_FETCH_TIMEOUT_MS;

  return jobDocumentCache.remember(
    cacheKey,
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch (error) {
          // Ignore abort errors triggered after completion.
        }
      }, effectiveTimeout);

      try {
        const response = await fetch(cacheKey, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Job page responded with status ${response.status}`);
        }

        const html = await response.text();
        return {
          html,
          finalUrl: response.url || cacheKey,
        };
      } finally {
        clearTimeout(timer);
      }
    },
    { ttlMs: JOB_DOCUMENT_CACHE_TTL_MS },
  );
}

function deriveJobSummary(textContent) {
  if (!textContent) {
    return '';
  }

  const sentences = textContent
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 5).join(' ');
}

function pickBestTitle(titles) {
  if (!Array.isArray(titles) || !titles.length) {
    return '';
  }
  const cleaned = titles.map((title) => title.replace(/[|\-].*$/, '').trim()).filter(Boolean);
  if (!cleaned.length) {
    return titles[0];
  }
  cleaned.sort((a, b) => a.length - b.length);
  return cleaned[0];
}

function pickBestCompany(companies) {
  if (!Array.isArray(companies) || !companies.length) {
    return '';
  }
  const cleaned = companies
    .map((company) => company.replace(/[,|].*$/, '').trim())
    .filter(Boolean)
    .map((company) => company.replace(/\b(corp(oration)?|llc|inc\.?|pty|ltd)\b/gi, '').trim())
    .filter(Boolean);

  if (!cleaned.length) {
    return companies[0];
  }
  cleaned.sort((a, b) => a.length - b.length);
  return cleaned[0];
}

function pickBestLocation(locations) {
  if (!Array.isArray(locations) || !locations.length) {
    return '';
  }
  const cleaned = locations.map((location) => location.replace(/[,|].*$/, '').trim()).filter(Boolean);
  if (!cleaned.length) {
    return locations[0];
  }
  cleaned.sort((a, b) => a.length - b.length);
  return cleaned[0];
}

function findLocationInText(text) {
  if (!text) {
    return '';
  }
  const searchArea = text.slice(0, 1_500);
  const locationPattern = /(Location|Based in|Work location)[:\-]\s*([^\n]+)/i;
  const match = searchArea.match(locationPattern);
  if (match && match[2]) {
    return sanitizeText(match[2]);
  }
  return '';
}

function extractJobDetails(html, url) {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;
  const reader = new Readability(document);
  const article = reader.parse();

  const textContent = sanitizeText(article?.textContent || document.body.textContent || '');

  const titleCandidates = new Set();
  const companyCandidates = new Set();
  const locationCandidates = new Set();

  if (article?.title) {
    titleCandidates.add(article.title);
  }

  const docTitle = document.querySelector('title');
  if (docTitle) {
    titleCandidates.add(docTitle.textContent || '');
  }

  const header = document.querySelector('h1');
  if (header) {
    titleCandidates.add(header.textContent || '');
  }

  const metaTags = Array.from(document.querySelectorAll('meta'));
  metaTags.forEach((meta) => {
    const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
    const content = sanitizeText(meta.getAttribute('content') || '');

    if (!content) {
      return;
    }

    if (name.includes('title')) {
      titleCandidates.add(content);
    }

    if (name.includes('company') || name.includes('organization') || name.includes('site_name')) {
      companyCandidates.add(content);
    }

    if (name.includes('location') || name.includes('city') || name.includes('geo')) {
      locationCandidates.add(content);
    }
  });

  const sanitizedTitles = Array.from(titleCandidates)
    .map((title) => sanitizeText(title))
    .filter(Boolean);

  sanitizedTitles.forEach((candidate) => {
    const atIndex = candidate.toLowerCase().indexOf(' at ');
    if (atIndex > -1) {
      const company = sanitizeText(candidate.slice(atIndex + 4));
      if (company) {
        companyCandidates.add(company);
      }
    }
  });

  if (article?.byline) {
    companyCandidates.add(sanitizeText(article.byline));
  }

  const companyFromText = (() => {
    if (!textContent) {
      return '';
    }
    const pattern = /(Company|Organisation|Organization)[:\-]\s*([^\n]+)/i;
    const match = textContent.match(pattern);
    if (match && match[2]) {
      return sanitizeText(match[2]);
    }
    const atPattern = /\bat\s+([A-Z][A-Za-z0-9&.,'\- ]{2,60})/;
    const atMatch = textContent.match(atPattern);
    if (atMatch && atMatch[1]) {
      return sanitizeText(atMatch[1]);
    }
    return '';
  })();

  if (companyFromText) {
    companyCandidates.add(companyFromText);
  }

  const locationFromText = findLocationInText(textContent);
  if (locationFromText) {
    locationCandidates.add(locationFromText);
  }

  const summary = deriveJobSummary(textContent);
  const bulletPoints = Array.from(document.querySelectorAll('li'))
    .map((node) => sanitizeText(node.textContent || ''))
    .filter(Boolean)
    .filter((text, index, array) => array.indexOf(text) === index)
    .slice(0, 8);

  dom.window.close();

  return {
    textContent,
    summary,
    bulletPoints,
    metadata: {
      title: pickBestTitle(sanitizedTitles),
      company: pickBestCompany(Array.from(companyCandidates).map((entry) => sanitizeText(entry)).filter(Boolean)),
      location: pickBestLocation(Array.from(locationCandidates).map((entry) => sanitizeText(entry)).filter(Boolean)),
      url,
    },
  };
}

function normaliseResumeId(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function findResume(resumeId) {
  const target = normaliseResumeId(resumeId);
  if (!target) {
    return null;
  }
  return (
    resumeLibrary.find((resume) => normaliseResumeId(resume.id) === target) ||
    resumeLibrary.find((resume) => normaliseResumeId(resume.name) === target) ||
    null
  );
}

function mapResumeMatches(resumeIds = []) {
  return resumeIds
    .map((id) => {
      const resume = findResume(id);
      return resume
        ? { id: resume.id, name: resume.name }
        : {
            id: sanitizeText(id),
            name: sanitizeText(id),
          };
    })
    .filter((entry) => entry.id && entry.name);
}

function computeConfidenceLabel(score) {
  if (score >= 90) {
    return 'Top fit';
  }
  if (score >= 80) {
    return 'High potential';
  }
  if (score >= 70) {
    return 'Worth exploring';
  }
  return 'Monitor';
}

function mapOpportunityForResponse(opportunity, scoreOverride) {
  const confidenceScore = clampScore(
    typeof scoreOverride === 'number' && Number.isFinite(scoreOverride)
      ? scoreOverride
      : opportunity.confidenceScore,
  );

  return {
    id: sanitizeText(opportunity.id),
    title: sanitizeText(opportunity.title),
    company: sanitizeText(opportunity.company),
    url: opportunity.url,
    location: sanitizeText(opportunity.location),
    summary: sanitizeText(opportunity.summary),
    focusAreas: sanitizeArray(opportunity.focusAreas, 6),
    reasons: sanitizeArray(opportunity.whyItFits, 5),
    immediateNextStep: sanitizeText(opportunity.immediateNextStep),
    lastReviewed: sanitizeText(opportunity.lastReviewed),
    resumeMatches: mapResumeMatches(opportunity.resumeIds),
    confidenceScore,
    confidenceLabel: computeConfidenceLabel(confidenceScore),
  };
}

function rankOpportunities({ resumeId, location, limit } = {}) {
  const targetResumeId = normaliseResumeId(resumeId);
  const targetLocation = sanitizeText(location).toLowerCase();

  const ranked = curatedOpportunities
    .map((opportunity) => {
      let score = opportunity.confidenceScore || 0;
      const matchIds = (opportunity.resumeIds || []).map((id) => normaliseResumeId(id));
      if (targetResumeId && matchIds.includes(targetResumeId)) {
        score += 6;
      }
      if (targetLocation && opportunity.location && opportunity.location.toLowerCase().includes(targetLocation)) {
        score += 4;
      }
      return {
        opportunity,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const limited = typeof limit === 'number' && Number.isFinite(limit) ? ranked.slice(0, limit) : ranked;
  return limited.map((entry) => mapOpportunityForResponse(entry.opportunity, entry.score));
}

function sanitiseResumeReviewResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      executiveSummary: '',
      headline: '',
      headlineScore: 0,
      strengths: [],
      risks: [],
      keywordGaps: [],
      actionPlan: [],
      atsKeywords: [],
      interviewAngles: [],
    };
  }

  return {
    executiveSummary: sanitizeText(result.executiveSummary || result.summary),
    headline: sanitizeText(result.headline || result.positioningStatement),
    headlineScore: clampScore(result.headlineScore ?? result.atsScore ?? result.matchScore),
    strengths: sanitizeArray(result.strengths || result.differentiators, 8),
    risks: sanitizeArray(result.riskFactors || result.gaps || result.watchouts, 8),
    keywordGaps: sanitizeArray(result.keywordGaps || result.keywordTargets, 10),
    actionPlan: sanitizeArray(result.actionPlan || result.nextActions, 6),
    atsKeywords: sanitizeArray(result.atsKeywords || result.keywordsToMirror, 10),
    interviewAngles: sanitizeArray(result.interviewAngles || result.interviewPrep || result.talkingPoints, 6),
  };
}

function sanitiseCoverLetterReview(result) {
  if (!result || typeof result !== 'object') {
    return {
      executiveSummary: '',
      overallScore: 0,
      toneAssessment: [],
      structureInsights: [],
      alignmentInsights: [],
      priorityEdits: [],
      followUpPrompts: [],
      subjectLineIdeas: [],
    };
  }

  return {
    executiveSummary: sanitizeText(result.executiveSummary || result.summary),
    overallScore: clampScore(result.overallScore ?? result.score ?? 0),
    toneAssessment: sanitizeArray(result.toneAssessment || result.toneInsights, 6),
    structureInsights: sanitizeArray(result.structureInsights || result.structureFeedback, 6),
    alignmentInsights: sanitizeArray(result.alignmentInsights || result.relevanceNotes, 6),
    priorityEdits: sanitizeArray(result.priorityEdits || result.quickFixes, 6),
    followUpPrompts: sanitizeArray(result.followUpPrompts || result.followUpIdeas, 6),
    subjectLineIdeas: sanitizeArray(result.subjectLineIdeas || result.subjectLines, 4),
  };
}

function sanitiseJobMatchResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      executiveSummary: '',
      matchScore: 0,
      headline: '',
      strengths: [],
      risks: [],
      keywordsToMirror: [],
      talkingPoints: [],
      nextActions: [],
      outreachHooks: [],
      recommendedResumeId: '',
    };
  }

  return {
    executiveSummary: sanitizeText(result.executiveSummary || result.summary),
    matchScore: clampScore(result.matchScore ?? result.score),
    headline: sanitizeText(result.headline || result.positioningStatement),
    strengths: sanitizeArray(result.strengths || result.alignments, 6),
    risks: sanitizeArray(result.risks || result.gaps || result.watchouts, 6),
    keywordsToMirror: sanitizeArray(result.keywordsToMirror || result.keywords, 10),
    talkingPoints: sanitizeArray(result.talkingPoints || result.pitchPoints, 6),
    nextActions: sanitizeArray(result.nextActions || result.followUpPlan, 6),
    outreachHooks: sanitizeArray(result.outreachHooks || result.outreachAngles, 5),
    recommendedResumeId: sanitizeText(result.recommendedResumeId || ''),
  };
}

async function callOpenAiWithTimeout(openaiClient, payload, timeoutMs, timeoutMessage) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage || 'OpenAI request timed out.'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([openaiClient.responses.create(payload), timeoutPromise]);
    return response;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function createCareerCoachRouter(config = {}) {
  const router = express.Router();
  const rateLimiter = rateLimit({
    windowMs: config.rateWindowMs || DEFAULT_RATE_LIMIT_WINDOW_MS,
    max: config.rateLimit || DEFAULT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please retry later.' },
  });

  router.use(rateLimiter);

  const apiKey = config.apiKey || process.env.CAREER_COACH_API_KEY || null;
  const openAiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || null;
  const openAiModel = config.openaiModel || process.env.CAREER_COACH_OPENAI_MODEL || 'gpt-4.1-mini';
  const openaiClient = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null;

  router.use((req, res, next) => {
    if (!apiKey) {
      return next();
    }
    const authHeader = req.headers.authorization || '';
    const tokenFromHeader = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const tokenFromKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : null;

    if (tokenFromHeader === apiKey || tokenFromKey === apiKey) {
      return next();
    }

    res.status(401).json({ error: 'Unauthorized' });
  });

  router.post('/resume-review', async (req, res) => {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
    }

    const payload = req.body || {};
    const resumeId = typeof payload.resumeId === 'string' ? payload.resumeId.trim() : '';
    const resumeText = typeof payload.resumeText === 'string' ? payload.resumeText : '';
    const targetRole = typeof payload.targetRole === 'string' ? payload.targetRole : '';
    const jobDescription = typeof payload.jobDescription === 'string' ? payload.jobDescription : '';
    const focusAreas = Array.isArray(payload.focusAreas) ? payload.focusAreas : [];
    const preferences =
      typeof payload.preferences === 'string' || typeof payload.preferences === 'number'
        ? payload.preferences.toString()
        : '';

    if (!resumeId && !resumeText) {
      return res.status(400).json({ error: 'Provide a resumeId or resumeText to analyse.' });
    }

    let selectedResume = null;
    if (resumeId) {
      selectedResume = findResume(resumeId);
      if (!selectedResume) {
        return res.status(404).json({ error: 'Unknown resumeId provided.' });
      }
    }

    const resumeSnapshot = selectedResume ? buildResumeSnapshot(selectedResume) : null;

    const prompt = createResumeReviewPrompt({
      resumeSnapshot,
      resumeText,
      targetRole,
      jobDescription,
      focusAreas,
      preferences,
    });

    try {
      const response = await callOpenAiWithTimeout(
        openaiClient,
        {
          model: openAiModel,
          input: prompt,
          temperature: 0.5,
          max_output_tokens: 900,
          response_format: { type: 'json_schema', json_schema: RESUME_REVIEW_SCHEMA },
        },
        OPENAI_TIMEOUT_MS,
        'OpenAI request exceeded the time limit.',
      );

      const parsed = parseOpenAiResponse(response);
      const result = sanitiseResumeReviewResult(parsed);

      res.json({
        status: 'ok',
        result,
        resume: selectedResume ? { id: selectedResume.id, name: selectedResume.name } : null,
        meta: {
          targetRole: sanitizeText(targetRole),
          jobDescriptionIncluded: Boolean(jobDescription && sanitizeText(jobDescription)),
        },
      });
    } catch (error) {
      res.status(502).json({ error: error.message || 'Unable to process resume review.' });
    }
  });

  router.post('/cover-letter-review', async (req, res) => {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
    }

    const payload = req.body || {};
    const resumeId = typeof payload.resumeId === 'string' ? payload.resumeId.trim() : '';
    const coverLetter = typeof payload.coverLetter === 'string' ? payload.coverLetter : '';
    const jobDescription = typeof payload.jobDescription === 'string' ? payload.jobDescription : '';
    const targetRole = typeof payload.targetRole === 'string' ? payload.targetRole : '';
    const preferences =
      typeof payload.preferences === 'string' || typeof payload.preferences === 'number'
        ? payload.preferences.toString()
        : '';

    if (!coverLetter) {
      return res.status(400).json({ error: 'Provide coverLetter text for review.' });
    }

    let selectedResume = null;
    if (resumeId) {
      selectedResume = findResume(resumeId);
      if (!selectedResume) {
        return res.status(404).json({ error: 'Unknown resumeId provided.' });
      }
    }

    const resumeSnapshot = selectedResume ? buildResumeSnapshot(selectedResume) : null;

    const prompt = createCoverLetterReviewPrompt({
      resumeSnapshot,
      coverLetter,
      jobDescription,
      targetRole,
      preferences,
    });

    try {
      const response = await callOpenAiWithTimeout(
        openaiClient,
        {
          model: openAiModel,
          input: prompt,
          temperature: 0.5,
          max_output_tokens: 900,
          response_format: { type: 'json_schema', json_schema: COVER_LETTER_REVIEW_SCHEMA },
        },
        OPENAI_TIMEOUT_MS,
        'OpenAI request exceeded the time limit.',
      );

      const parsed = parseOpenAiResponse(response);
      const result = sanitiseCoverLetterReview(parsed);

      res.json({
        status: 'ok',
        result,
        resume: selectedResume ? { id: selectedResume.id, name: selectedResume.name } : null,
      });
    } catch (error) {
      res.status(502).json({ error: error.message || 'Unable to process cover letter review.' });
    }
  });

  router.post('/job-match', async (req, res) => {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
    }

    const payload = req.body || {};
    const resumeId = typeof payload.resumeId === 'string' ? payload.resumeId.trim() : '';
    const resumeText = typeof payload.resumeText === 'string' ? payload.resumeText : '';
    const jobUrlRaw = typeof payload.jobUrl === 'string' ? payload.jobUrl.trim() : '';
    const jobDescription = typeof payload.jobDescription === 'string' ? payload.jobDescription : '';
    const targetRole = typeof payload.targetRole === 'string' ? payload.targetRole : '';
    const preferences =
      typeof payload.preferences === 'string' || typeof payload.preferences === 'number'
        ? payload.preferences.toString()
        : '';

    if (!resumeId && !resumeText) {
      return res.status(400).json({ error: 'Provide a resumeId or resumeText for job matching.' });
    }

    let selectedResume = null;
    if (resumeId) {
      selectedResume = findResume(resumeId);
      if (!selectedResume) {
        return res.status(404).json({ error: 'Unknown resumeId provided.' });
      }
    }

    let jobUrl = null;
    if (jobUrlRaw) {
      try {
        const parsed = new URL(jobUrlRaw);
        if (!/^https?:$/.test(parsed.protocol)) {
          throw new Error('Only HTTP/HTTPS URLs are supported.');
        }
        jobUrl = parsed.toString();
      } catch (error) {
        return res.status(400).json({ error: 'jobUrl must be a valid HTTP or HTTPS URL.' });
      }
    }

    if (!jobUrl && !jobDescription) {
      return res.status(400).json({ error: 'Provide a jobUrl or jobDescription to analyse.' });
    }

    let jobDetails = { textContent: '', summary: '', bulletPoints: [], metadata: { title: '', company: '', location: '', url: jobUrl } };

    if (jobUrl) {
      try {
        const { html, finalUrl } = await fetchJobDocument(jobUrl, JOB_FETCH_TIMEOUT_MS);
        jobDetails = extractJobDetails(html, finalUrl);
      } catch (error) {
        if (!jobDescription) {
          return res.status(502).json({ error: `Unable to fetch the job posting: ${error.message}` });
        }
        jobDetails.metadata = { title: '', company: '', location: '', url: jobUrl };
      }
    }

    const resumeSnapshot = selectedResume ? buildResumeSnapshot(selectedResume) : null;

    const prompt = createJobMatchPrompt({
      resumeSnapshot,
      jobSummary: jobDescription || jobDetails.summary || jobDetails.textContent,
      jobMeta: {
        title: jobDetails.metadata?.title,
        company: jobDetails.metadata?.company,
        location: jobDetails.metadata?.location,
      },
      preferences,
      targetRole,
    });

    try {
      const response = await callOpenAiWithTimeout(
        openaiClient,
        {
          model: openAiModel,
          input: prompt,
          temperature: 0.4,
          max_output_tokens: 900,
          response_format: { type: 'json_schema', json_schema: JOB_MATCH_SCHEMA },
        },
        OPENAI_TIMEOUT_MS,
        'OpenAI request exceeded the time limit.',
      );

      const parsed = parseOpenAiResponse(response);
      const result = sanitiseJobMatchResult(parsed);

      const recommendedOpportunities = rankOpportunities({
        resumeId: result.recommendedResumeId || resumeId || (selectedResume ? selectedResume.id : ''),
        location: jobDetails.metadata?.location,
        limit: 4,
      });

      res.json({
        status: 'ok',
        result,
        job: {
          title: sanitizeText(jobDetails.metadata?.title || ''),
          company: sanitizeText(jobDetails.metadata?.company || ''),
          location: sanitizeText(jobDetails.metadata?.location || ''),
          url: jobDetails.metadata?.url || jobUrl || null,
          summary: sanitizeText(jobDescription || jobDetails.summary),
        },
        resume: selectedResume ? { id: selectedResume.id, name: selectedResume.name } : null,
        recommendedOpportunities,
      });
    } catch (error) {
      res.status(502).json({ error: error.message || 'Unable to evaluate job match.' });
    }
  });

  router.get('/opportunities', (req, res) => {
    const resumeId = typeof req.query.resumeId === 'string' ? req.query.resumeId : '';
    const location = typeof req.query.location === 'string' ? req.query.location : '';
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;

    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      return res.status(400).json({ error: 'limit must be a positive integer when provided.' });
    }

    const opportunities = rankOpportunities({ resumeId, location, limit });

    res.json({
      status: 'ok',
      opportunities,
      meta: {
        resumeId: sanitizeText(resumeId),
        location: sanitizeText(location),
        total: opportunities.length,
      },
    });
  });

  return router;
}

module.exports = {
  createCareerCoachRouter,
};
