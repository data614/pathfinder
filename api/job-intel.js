'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { fetch } = require('undici');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');
const OpenAI = require('openai');
const { resumeLibrary } = require('./resume-library');
const { COVER_LETTER_SCHEMA, createCoverLetterPrompt } = require('./prompt-template');
const { TtlCache } = require('./utils/cache');

const DEFAULT_RATE_LIMIT_WINDOW_MS = Number(process.env.JOB_INTEL_RATE_WINDOW_MS) || 60_000;
const DEFAULT_RATE_LIMIT_MAX = Number(process.env.JOB_INTEL_RATE_LIMIT) || 5;
const JOB_FETCH_TIMEOUT_MS = Number(process.env.JOB_FETCH_TIMEOUT_MS) || 20_000;
const RESEARCH_TIMEOUT_MS = Number(process.env.JOB_RESEARCH_TIMEOUT_MS) || 15_000;
const OPENAI_TIMEOUT_MS = Number(process.env.JOB_OPENAI_TIMEOUT_MS) || 60_000;
const HEARTBEAT_INTERVAL_MS = Number(process.env.JOB_INTEL_HEARTBEAT_MS) || 20_000;
const RESEARCH_CACHE_TTL_MS = Number(process.env.JOB_RESEARCH_CACHE_TTL_MS) || 6 * 60 * 60 * 1000;
const RESEARCH_CACHE_MAX_ENTRIES = Number(process.env.JOB_RESEARCH_CACHE_MAX_ENTRIES) || 120;
const JOB_PAGE_CACHE_TTL_MS = Number(process.env.JOB_PAGE_CACHE_TTL_MS) || 2 * 60 * 60 * 1000;
const JOB_PAGE_CACHE_MAX_ENTRIES = Number(process.env.JOB_PAGE_CACHE_MAX_ENTRIES) || 48;
const USER_AGENT =
  process.env.JOB_INTEL_USER_AGENT ||
  'PathfinderJobIntelBot/1.0 (+https://github.com/your-org/pathfinder)';

const researchCache = new TtlCache({
  defaultTtlMs: RESEARCH_CACHE_TTL_MS,
  maxEntries: RESEARCH_CACHE_MAX_ENTRIES,
});

const jobPageCache = new TtlCache({
  defaultTtlMs: JOB_PAGE_CACHE_TTL_MS,
  maxEntries: JOB_PAGE_CACHE_MAX_ENTRIES,
});


function sanitizeText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const cleaned = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return cleaned.replace(/\u00a0/g, ' ').trim();
}

function sanitizeMarkdown(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const cleaned = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return cleaned.replace(/\u00a0/g, ' ');
}

function sanitizeArray(values, limit) {
  if (!Array.isArray(values)) {
    return [];
  }

  const sanitized = values
    .map((entry) => sanitizeText(typeof entry === 'string' ? entry : JSON.stringify(entry)))
    .filter((entry) => Boolean(entry));

  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return sanitized.slice(0, limit);
  }

  return sanitized;
}

function sanitizePreferences(preferences) {
  if (!preferences) {
    return {};
  }

  if (typeof preferences === 'string') {
    return { notes: sanitizeText(preferences) };
  }

  if (Array.isArray(preferences)) {
    return { preferences: sanitizeArray(preferences) };
  }

  if (typeof preferences === 'object') {
    return Object.entries(preferences).reduce((accumulator, [key, value]) => {
      const safeKey = sanitizeText(key);

      if (!safeKey) {
        return accumulator;
      }

      if (Array.isArray(value)) {
        accumulator[safeKey] = sanitizeArray(value);
        return accumulator;
      }

      accumulator[safeKey] = sanitizeText(String(value));
      return accumulator;
    }, {});
  }

  return { note: sanitizeText(String(preferences)) };
}

function checkAuthentication(req, configuredKey) {
  if (!configuredKey) {
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const tokenFromKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : null;

  if (tokenFromHeader && tokenFromHeader === configuredKey) {
    return null;
  }

  if (tokenFromKey && tokenFromKey === configuredKey) {
    return null;
  }

  return { status: 401, body: { error: 'Unauthorized' } };
}

async function downloadDocument(url, signal) {
  const cacheKey = typeof url === 'string' ? url : url?.toString();

  if (!cacheKey) {
    throw new Error('A job URL is required.');
  }

  return jobPageCache.remember(
    cacheKey,
    async () => {
      const controller = new AbortController();
      const abortHandler = () => {
        try {
          controller.abort();
        } catch (error) {
          // Ignore abort timing errors.
        }
      };

      if (signal) {
        if (signal.aborted) {
          abortHandler();
        } else {
          signal.addEventListener('abort', abortHandler);
        }
      }

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
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
      }
    },
    { ttlMs: JOB_PAGE_CACHE_TTL_MS },
  );
}

function extractJobDetails(html, url) {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;
  const reader = new Readability(document);
  const article = reader.parse();

  const textContent = article?.textContent || document.body.textContent || '';
  const sanitizedTextContent = sanitizeText(textContent);

  const metadata = deriveJobMetadata(article, document, url, sanitizedTextContent);
  const summary = deriveJobSummary(article, sanitizedTextContent);
  const bulletPoints = extractJobBulletPoints(document);

  dom.window.close();

  return {
    article,
    metadata,
    summary,
    bulletPoints,
    textContent: sanitizedTextContent,
  };
}

function deriveJobSummary(article, rawText) {
  const baseText = article?.excerpt || article?.textContent || rawText || '';

  if (!baseText) {
    return '';
  }

  const sentences = baseText
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences.slice(0, 3).join(' ');
}

function extractJobBulletPoints(document) {
  const items = Array.from(document.querySelectorAll('li'))
    .map((node) => sanitizeText(node.textContent || ''))
    .filter((text) => text && text.length > 0)
    .filter((text, index, array) => array.indexOf(text) === index)
    .slice(0, 8);

  if (items.length) {
    return items;
  }

  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map((node) => sanitizeText(node.textContent || ''))
    .filter((text) => text && text.length > 0)
    .slice(0, 5);

  return paragraphs;
}

function deriveJobMetadata(article, document, url, rawText) {
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

  const title = pickBestTitle(sanitizedTitles);
  const companyHints = Array.from(companyCandidates)
    .map((entry) => sanitizeText(entry))
    .filter(Boolean);

  const locationFromText = findLocationInText(rawText);
  if (locationFromText) {
    locationCandidates.add(locationFromText);
  }

  const locationHints = Array.from(locationCandidates)
    .map((entry) => sanitizeText(entry))
    .filter(Boolean);

  return {
    roleTitle: title,
    companyName: pickBestCompany(companyHints),
    companyHints,
    location: pickBestLocation(locationHints),
    locationHints,
    sourceUrl: url,
  };
}

function pickBestTitle(titles) {
  if (!Array.isArray(titles) || !titles.length) {
    return '';
  }

  const cleaned = titles
    .map((title) => title.replace(/[|\-].*$/, '').trim())
    .filter(Boolean);

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

  const cleaned = locations
    .map((location) => location.replace(/[,|].*$/, '').trim())
    .filter(Boolean);

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

function deriveCompanyFromMetadata(metadata) {
  if (!metadata) {
    return '';
  }

  if (metadata.companyName) {
    return metadata.companyName;
  }

  if (Array.isArray(metadata.companyHints) && metadata.companyHints.length) {
    return metadata.companyHints[0];
  }

  return '';
}

function deriveCompanyFromText(rawText) {
  if (!rawText) {
    return '';
  }

  const pattern = /(Company|Organisation|Organization)[:\-]\s*([^\n]+)/i;
  const match = rawText.match(pattern);

  if (match && match[2]) {
    return sanitizeText(match[2]);
  }

  const atPattern = /\bat\s+([A-Z][A-Za-z0-9&.,'\- ]{2,60})/;
  const atMatch = rawText.match(atPattern);

  if (atMatch && atMatch[1]) {
    return sanitizeText(atMatch[1]);
  }

  return '';
}

function fromCache(cacheKey) {
  if (!cacheKey || !researchCache.has(cacheKey)) {
    return null;
  }

  return researchCache.get(cacheKey) || null;
}

function storeCache(cacheKey, payload) {
  if (!cacheKey) {
    return;
  }

  researchCache.set(cacheKey, payload, { ttlMs: RESEARCH_CACHE_TTL_MS });
}

async function querySearchApi(query, signal) {
  const apiKey = process.env.BING_SEARCH_API_KEY || process.env.SEARCH_API_KEY;
  const endpoint = process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search';

  if (!apiKey) {
    throw new Error('Search API key is not configured.');
  }

  const url = new URL(endpoint);
  if (!url.searchParams.has('q')) {
    url.searchParams.set('q', `${query} company (about OR values OR mission OR products)`);
  }

  url.searchParams.set('count', '10');
  url.searchParams.set('responseFilter', 'WebPages');
  url.searchParams.set('mkt', 'en-US');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Search API responded with status ${response.status}`);
  }

  return response.json();
}

function pickOfficialDomain(results) {
  if (!results?.webPages?.value?.length) {
    return null;
  }

  const sites = results.webPages.value
    .map((entry) => {
      try {
        const parsed = new URL(entry.url);
        return {
          entry,
          hostname: parsed.hostname.replace(/^www\./, ''),
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);

  if (!sites.length) {
    return null;
  }

  sites.sort((a, b) => a.hostname.length - b.hostname.length);
  return sites[0];
}

async function fetchResearchPages(sites, signal) {
  const targets = [];

  for (const site of sites) {
    if (!site) {
      continue;
    }

    const { entry } = site;
    const url = entry.url;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        signal,
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      const textContent = sanitizeText(article?.textContent || dom.window.document.body.textContent || '');
      dom.window.close();

      if (!textContent) {
        continue;
      }

      targets.push({
        url,
        title: sanitizeText(article?.title || entry.name || ''),
        textContent,
      });
    } catch (error) {
      // Ignore network errors while fetching research pages.
    }
  }

  return targets;
}

function summariseResearchContent(items) {
  const result = {
    values: [],
    products: [],
    recentNews: [],
    highlights: [],
  };

  items.forEach((item) => {
    const sentences = item.textContent
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 20);

    const values = sentences.filter((sentence) => /value|mission|culture|principle|ethos/i.test(sentence)).slice(0, 3);
    const products = sentences.filter((sentence) => /product|service|platform|solution|suite|technology|tool/i.test(sentence)).slice(0, 3);
    const news = sentences
      .filter((sentence) => /news|announc|launch|recent|award|partner|expan|202[0-9]/i.test(sentence))
      .slice(0, 3);

    const highlights = sentences.slice(0, 2);

    result.values.push(...values);
    result.products.push(...products);
    result.recentNews.push(...news);
    result.highlights.push(...highlights);
  });

  result.values = sanitizeArray(result.values, 5);
  result.products = sanitizeArray(result.products, 5);
  result.recentNews = sanitizeArray(result.recentNews, 5);
  result.highlights = sanitizeArray(result.highlights, 5);

  return result;
}

async function gatherCompanyResearch(companyName, signal) {
  const normalized = companyName.toLowerCase();
  const cached = fromCache(normalized);

  if (cached) {
    return { ...cached, cached: true };
  }

  const searchResults = await querySearchApi(companyName, signal);
  const officialSite = pickOfficialDomain(searchResults);

  if (!officialSite) {
    return { companyName, facts: null, pages: [] };
  }

  const topResults = searchResults.webPages.value
    .filter((entry) => entry.url.includes(officialSite.hostname))
    .slice(0, 5)
    .map((entry) => ({ entry }));

  const pages = await fetchResearchPages(topResults, signal);
  const facts = summariseResearchContent(pages);
  const payload = {
    companyName,
    domain: officialSite.hostname,
    pages,
    facts,
  };

  storeCache(normalized, payload);

  return payload;
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

function sanitiseAiResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      coverLetterMarkdown: '',
      talkingPoints: [],
      researchSources: [],
    };
  }

  const coverLetterMarkdown = sanitizeMarkdown(result.coverLetterMarkdown || '');
  const talkingPoints = sanitizeArray(result.talkingPoints || [], 6);
  const researchSources = Array.isArray(result.researchSources)
    ? result.researchSources
        .map((source) => {
          if (!source) {
            return null;
          }

          const title = sanitizeText(source.title || '');
          let url = '';
          try {
            const parsed = new URL(source.url);
            if (!/^https?:/.test(parsed.protocol)) {
              return null;
            }
            url = parsed.toString();
          } catch (error) {
            return null;
          }

          if (!title) {
            return null;
          }

          return { title, url };
        })
        .filter(Boolean)
    : [];

  return {
    coverLetterMarkdown,
    talkingPoints,
    researchSources,
  };
}

function createJobIntelRouter(config = {}) {
  const router = express.Router();
  const rateLimiter = rateLimit({
    windowMs: config.rateWindowMs || DEFAULT_RATE_LIMIT_WINDOW_MS,
    max: config.rateLimit || DEFAULT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please retry later.' },
  });

  router.use(rateLimiter);
  router.options('/', (req, res) => {
    res.set({
      Allow: 'POST,OPTIONS',
    });
    res.sendStatus(204);
  });

  const apiKey = config.apiKey || process.env.JOB_INTEL_API_KEY || null;
  const openAiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || null;
  const openAiModel = config.openaiModel || process.env.JOB_INTEL_OPENAI_MODEL || 'gpt-5.0';
  const openaiClient = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null;

  router.post('/', async (req, res) => {
    const authError = checkAuthentication(req, apiKey);

    if (authError) {
      return res.status(authError.status).json(authError.body);
    }

    const payload = req.body || {};
    const jobUrlInput = typeof payload.jobUrl === 'string' ? payload.jobUrl.trim() : '';
    const resumeId = typeof payload.resumeId === 'string' ? payload.resumeId.trim() : '';
    const includeResearch = Boolean(payload.includeResearch);
    const userPreferences = sanitizePreferences(payload.preferences);

    if (!jobUrlInput) {
      return res.status(400).json({ error: 'jobUrl is required.' });
    }

    let jobUrl;

    try {
      jobUrl = new URL(jobUrlInput);
      if (!/^https?:$/.test(jobUrl.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs are supported.');
      }
    } catch (error) {
      return res.status(400).json({ error: 'jobUrl must be a valid HTTP or HTTPS URL.' });
    }

    if (!resumeId) {
      return res.status(400).json({ error: 'resumeId is required.' });
    }

    const selectedResume = resumeLibrary.find((resume) => resume.id === resumeId);

    if (!selectedResume) {
      return res.status(404).json({ error: 'Unknown resumeId provided.' });
    }

    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
    }

    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let clientClosed = false;
    const controllers = new Set();

    const registerController = (controller) => {
      controllers.add(controller);
      controller.signal.addEventListener(
        'abort',
        () => {
          controllers.delete(controller);
        },
        { once: true },
      );
      return controller;
    };

    req.on('close', () => {
      clientClosed = true;
      controllers.forEach((controller) => {
        try {
          controller.abort();
        } catch (error) {
          // Ignore abort errors during cleanup.
        }
      });
      controllers.clear();
    });

    const sendEvent = (event, data) => {
      if (clientClosed) {
        return;
      }

      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const sendProgress = (stage, message, extra = {}) => {
      sendEvent('progress', {
        stage,
        message: sanitizeText(message),
        ...extra,
      });
    };

    const heartbeat = setInterval(() => {
      sendEvent('heartbeat', { ts: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);

    const fetchWithTimeout = async (executor, timeoutMs, timeoutMessage) => {
      const controller = registerController(new AbortController());
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch (error) {
          // Ignore abort timing errors.
        }
      }, timeoutMs);

      try {
        return await executor(controller.signal);
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error(timeoutMessage || 'The request timed out.');
        }
        throw error;
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
      }
    };

    try {
      sendProgress('accepted', 'Request accepted for processing.');

      const { html, finalUrl } = await fetchWithTimeout(
        (signal) => downloadDocument(jobUrl.toString(), signal),
        JOB_FETCH_TIMEOUT_MS,
        'Fetching the job posting took too long.',
      );

      sendProgress('jobFetched', 'Job posting retrieved successfully.', { url: finalUrl });

      const jobDetails = extractJobDetails(html, finalUrl);
      sendProgress('jobParsed', 'Job description parsed.', {
        title: jobDetails.metadata.roleTitle,
        company: jobDetails.metadata.companyName,
        location: jobDetails.metadata.location,
      });

      const resumeHighlights = sanitizeArray(selectedResume.highlights, 3);

      let companyResearch = null;
      let researchStatus = 'skipped';

      if (includeResearch) {
        const companyCandidate =
          deriveCompanyFromMetadata(jobDetails.metadata) || deriveCompanyFromText(jobDetails.textContent);

        if (!companyCandidate) {
          sendProgress('researchSkipped', 'Unable to identify a company to research.');
        } else {
          const cacheKey = companyCandidate.toLowerCase();
          const cached = fromCache(cacheKey);

          if (cached) {
            companyResearch = { ...cached, cached: true };
            researchStatus = 'cached';
            sendProgress('researchCacheHit', `Using cached research for ${companyCandidate}.`, {
              domain: cached.domain,
            });
          } else {
            try {
              sendProgress('researchLookup', `Querying company research for ${companyCandidate}.`);
              const researchPayload = await fetchWithTimeout(
                (signal) => gatherCompanyResearch(companyCandidate, signal),
                RESEARCH_TIMEOUT_MS,
                'Research step timed out.',
              );

              companyResearch = researchPayload;
              researchStatus = 'fetched';
              sendProgress('researchComplete', `Company research gathered for ${companyCandidate}.`, {
                domain: researchPayload?.domain,
                sources: researchPayload?.pages?.length || 0,
              });
            } catch (error) {
              sendProgress('researchFailed', `Company research failed: ${error.message}`);
            }
          }
        }
      } else {
        sendProgress('researchSkipped', 'Company research disabled for this request.');
      }

      const jobPayload = {
        title: jobDetails.metadata.roleTitle,
        company: jobDetails.metadata.companyName,
        location: jobDetails.metadata.location,
        summary: jobDetails.summary,
        keyPoints: jobDetails.bulletPoints,
        url: jobDetails.metadata.sourceUrl,
      };

      const resumeSkills = sanitizeArray(selectedResume.skills, 12);
      const promptProfile = {
        id: selectedResume.id,
        name: selectedResume.name,
        focus: sanitizeText(selectedResume.promptProfile?.focus || selectedResume.focus),
        topHighlights: sanitizeArray(
          selectedResume.promptProfile?.topHighlights || resumeHighlights,
          5,
        ),
        prioritySkills: sanitizeArray(
          selectedResume.promptProfile?.prioritySkills || resumeSkills,
          12,
        ),
        primaryMetrics: sanitizeArray(
          selectedResume.promptProfile?.primaryMetrics || resumeHighlights,
          5,
        ),
      };

      const resumePayload = {
        id: selectedResume.id,
        name: selectedResume.name,
        focus: sanitizeText(selectedResume.focus),
        highlights: resumeHighlights,
        skills: resumeSkills,
        promptProfile,
      };

      const openAiPayload = {
        job: jobPayload,
        resume: resumePayload,
        companyResearch: companyResearch?.facts
          ? {
              companyName: companyResearch.companyName,
              domain: companyResearch.domain,
              highlights: companyResearch.facts.highlights,
              values: companyResearch.facts.values,
              products: companyResearch.facts.products,
              recentNews: companyResearch.facts.recentNews,
            }
          : null,
        researchSources: companyResearch?.pages
          ? companyResearch.pages.map((page) => ({ title: page.title, url: page.url })).slice(0, 5)
          : [],
        userPreferences,
      };

      sendProgress('openAiDispatch', 'Submitting structured prompt to OpenAI.');

      const openAiResponse = await fetchWithTimeout(
        () =>
          openaiClient.responses.create({
            model: openAiModel,
            input: createCoverLetterPrompt(openAiPayload),
            temperature: 0.6,
            max_output_tokens: 1200,
            response_format: { type: 'json_schema', json_schema: COVER_LETTER_SCHEMA },
          }),
        OPENAI_TIMEOUT_MS,
        'OpenAI request exceeded the time limit.',
      );

      const parsedResult = parseOpenAiResponse(openAiResponse);
      const sanitizedResult = sanitiseAiResult(parsedResult);

      const responsePayload = {
        status: 'completed',
        data: sanitizedResult,
        meta: {
          job: jobPayload,
          resume: {
            id: resumePayload.id,
            name: resumePayload.name,
          },
          research: companyResearch
            ? {
                status: researchStatus,
                domain: companyResearch.domain,
                pages: companyResearch.pages
                  ? companyResearch.pages.map((page) => ({ title: page.title, url: page.url })).slice(0, 5)
                  : [],
              }
            : null,
        },
      };

      sendEvent('result', responsePayload);
      sendEvent('complete', { status: 'complete' });
    } catch (error) {
      sendEvent('error', {
        message: sanitizeText(error.message || 'An unexpected error occurred.'),
      });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  });

  return router;
}

module.exports = {
  createJobIntelRouter,
};
