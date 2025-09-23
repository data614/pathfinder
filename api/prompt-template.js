'use strict';

const COVER_LETTER_SCHEMA = {
  name: 'cover_letter_bundle',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['coverLetterMarkdown', 'talkingPoints', 'researchSources'],
    properties: {
      coverLetterMarkdown: {
        type: 'string',
        description:
          'Markdown formatted cover letter tailored to the job using résumé and company research.',
      },
      talkingPoints: {
        type: 'array',
        items: {
          type: 'string',
          description: 'Concise talking points for interview or outreach follow-up.',
        },
      },
      researchSources: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'url'],
          properties: {
            title: {
              type: 'string',
            },
            url: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      },
    },
  },
};

function normaliseString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function formatBulletList(items = []) {
  return items
    .map((item) => normaliseString(item))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join('\n');
}

function createCoverLetterPrompt(payload = {}) {
  const job = payload.job || {};
  const resume = payload.resume || {};
  const promptProfile = resume.promptProfile || {};
  const companyResearch = payload.companyResearch || null;
  const userPreferences = payload.userPreferences || {};

  const topHighlights = Array.isArray(promptProfile.topHighlights)
    ? promptProfile.topHighlights
    : resume.highlights || [];
  const prioritySkills = Array.isArray(promptProfile.prioritySkills)
    ? promptProfile.prioritySkills
    : resume.skills || [];
  const primaryMetrics = Array.isArray(promptProfile.primaryMetrics)
    ? promptProfile.primaryMetrics
    : topHighlights;

  const researchAvailable = Boolean(companyResearch && companyResearch.highlights);

  const schemaFields = Object.keys(COVER_LETTER_SCHEMA.schema.properties);

  const instructions = [
    'You are a career coach drafting tailored cover letters.',
    'Adopt a confident, metric-forward tone that sounds like an experienced professional speaking to a recruiter.',
    'Use crisp sentences and avoid filler. Each paragraph should deliver a tangible value statement.',
    `Return only valid JSON that conforms to the schema named ${COVER_LETTER_SCHEMA.name}.`,
    `The JSON must include the keys: ${schemaFields.join(', ')}. Do not wrap the JSON in Markdown code fences.`,
    'Structure the cover letter in three short paragraphs: introduction, relevant proof, and a forward-looking close.',
    'Weave in quantified résumé achievements and metrics whenever possible. Prioritise the strongest proof points.',
    'Talking points should be concise bullets highlighting metrics or differentiators to discuss live.',
    researchAvailable
      ? 'Incorporate company research insights only when they directly support the value proposition.'
      : 'No company research is available. Do not invent facts or speculate about the company.',
    'researchSources must only cite URLs provided in the company research payload. Skip sources if none exist.',
    'If user preferences are supplied, honour them without breaking the JSON schema.',
    '',
    'Résumé positioning to emphasise:',
    formatBulletList(topHighlights) || '- Use available experience even if highlights are empty.',
    '',
  ];

  if (Array.isArray(primaryMetrics) && primaryMetrics.length) {
    instructions.push('Quantified achievements worth spotlighting:');
    instructions.push(formatBulletList(primaryMetrics) || '- Metrics unavailable.');
    instructions.push('');
  }

  if (Array.isArray(prioritySkills) && prioritySkills.length) {
    instructions.push('Prioritise aligning with these skills and tools:');
    instructions.push(formatBulletList(prioritySkills));
    instructions.push('');
  }

  const contextPayload = {
    job: {
      title: normaliseString(job.title),
      company: normaliseString(job.company),
      location: normaliseString(job.location),
      summary: normaliseString(job.summary),
      keyPoints: Array.isArray(job.keyPoints) ? job.keyPoints.slice(0, 8) : [],
      url: job.url,
    },
    resume: {
      id: resume.id,
      name: resume.name,
      focus: normaliseString(promptProfile.focus || resume.focus),
      topHighlights,
      prioritySkills,
    },
    companyResearch: companyResearch
      ? {
          companyName: companyResearch.companyName,
          domain: companyResearch.domain,
          highlights: companyResearch.highlights || [],
          values: companyResearch.values || [],
          products: companyResearch.products || [],
          recentNews: companyResearch.recentNews || [],
        }
      : null,
    userPreferences,
  };

  instructions.push('Context payload (for reference, do not echo back verbatim):');
  instructions.push(JSON.stringify(contextPayload, null, 2));
  instructions.push('');
  instructions.push(
    'Respond with the JSON object only. Do not include explanations, apologies, or any text outside the JSON.',
  );

  return instructions.join('\n');
}

module.exports = {
  COVER_LETTER_SCHEMA,
  createCoverLetterPrompt,
};
