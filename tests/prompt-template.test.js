const test = require('node:test');
const assert = require('node:assert/strict');

const { COVER_LETTER_SCHEMA, createCoverLetterPrompt } = require('../api/prompt-template');

test('cover letter schema matches expected shape', () => {
  const expectedSchema = {
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

  assert.deepStrictEqual(COVER_LETTER_SCHEMA, expectedSchema);
});

test('prompt includes résumé achievements, skills, and research guardrails', () => {
  const payload = {
    job: {
      title: 'Senior Data Analyst',
      company: 'Acme Analytics',
      location: 'Sydney',
      summary: 'Lead stakeholder reporting for analytics programmes.',
      keyPoints: ['Automate Power BI reports', 'Partner with sales to surface metrics'],
      url: 'https://careers.example.com/jobs/senior-data-analyst',
    },
    resume: {
      id: 'data-analyst',
      name: 'Data Analyst CV',
      focus: 'Analytics storyteller with automation wins.',
      highlights: ['Increased pipeline coverage by 120% year-on-year.'],
      skills: ['Power BI', 'SQL'],
      promptProfile: {
        id: 'data-analyst',
        name: 'Data Analyst CV',
        focus: 'Analytics storyteller with automation wins.',
        topHighlights: ['Increased pipeline coverage by 120% year-on-year.'],
        prioritySkills: ['power bi', 'sql'],
        primaryMetrics: ['Increased pipeline coverage by 120% year-on-year.'],
      },
    },
    companyResearch: {
      companyName: 'Acme Analytics',
      domain: 'acmeanalytics.test',
      highlights: ['Award-winning analytics suite used by 8,000 customers.'],
      values: ['Customer centricity'],
      products: ['Acme Insights Platform'],
      recentNews: ['Acquired DataStream Labs in 2024.'],
    },
    userPreferences: {
      tone: 'confident',
    },
  };

  const prompt = createCoverLetterPrompt(payload);

  assert.match(prompt, /Return only valid JSON that conforms to the schema/);
  assert.match(prompt, /talking points should be concise bullets/i);
  assert.match(prompt, /Incorporate company research insights only when they directly support/i);
  assert.match(prompt, /Increased pipeline coverage by 120% year-on-year\./);
  assert.match(prompt, /power bi/);
  assert.match(prompt, /Acme Analytics/);
});

test('prompt warns when company research is unavailable', () => {
  const prompt = createCoverLetterPrompt({
    job: { title: 'SDR', company: 'Outbound HQ' },
    resume: {
      id: 'sales',
      name: 'Sales Resume',
      focus: 'Inside sales pro.',
      highlights: ['Booked 15 meetings per week.'],
      skills: ['Salesforce'],
      promptProfile: {
        id: 'sales',
        name: 'Sales Resume',
        focus: 'Inside sales pro.',
        topHighlights: ['Booked 15 meetings per week.'],
        prioritySkills: ['salesforce'],
        primaryMetrics: ['Booked 15 meetings per week.'],
      },
    },
    companyResearch: null,
    userPreferences: {},
  });

  assert.match(prompt, /No company research is available\. Do not invent facts/i);
  assert.match(prompt, /Booked 15 meetings per week\./);
});
