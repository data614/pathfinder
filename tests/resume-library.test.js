const test = require('node:test');
const assert = require('node:assert/strict');

const { resumeLibrary, buildPromptProfile } = require('../api/resume-library');

test('each résumé exposes a prompt-ready profile with trimmed focus and lower-cased skills', () => {
  assert.ok(Array.isArray(resumeLibrary) && resumeLibrary.length > 0, 'resumeLibrary should not be empty');

  resumeLibrary.forEach((resume) => {
    assert.ok(resume.promptProfile, `resume ${resume.id} is missing promptProfile`);
    const { promptProfile } = resume;

    assert.ok(promptProfile.focus.length <= 221, 'focus should be trimmed to ~220 characters');
    promptProfile.topHighlights.forEach((highlight) => {
      assert.equal(highlight, highlight.trim(), 'highlights should be trimmed');
    });
    assert.ok(promptProfile.topHighlights.length <= 3, 'topHighlights should be capped at three entries');
    assert.ok(promptProfile.prioritySkills.length <= 12, 'prioritySkills should cap at twelve entries');
    promptProfile.prioritySkills.forEach((skill) => {
      assert.equal(skill, skill.toLowerCase(), 'skills should be lower-cased for prompts');
    });
    assert.ok(promptProfile.primaryMetrics.length > 0, 'primaryMetrics should include at least one metric');
  });
});

test('primary metrics favour quantified achievements', () => {
  const dataAnalyst = resumeLibrary.find((resume) => resume.id === 'data-analyst-cv');
  assert.ok(dataAnalyst, 'expected data-analyst-cv resume in library');
  assert.ok(
    dataAnalyst.promptProfile.primaryMetrics.some((metric) => /\d|%|\$/.test(metric)),
    'primaryMetrics should contain quantified results',
  );
});

test('prompt profile falls back to highlights when no metrics are present', () => {
  const profile = buildPromptProfile({
    id: 'test',
    name: 'Test Resume',
    focus: 'Generalist profile.',
    highlights: ['Led customer onboarding across three markets.'],
    skills: ['Stakeholder engagement'],
  });

  assert.deepStrictEqual(profile.primaryMetrics, ['Led customer onboarding across three markets.']);
  assert.equal(profile.prioritySkills[0], 'stakeholder engagement');
});
