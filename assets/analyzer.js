(function () {
  const canonicaliseSkill = (value) =>
    (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const specialLabels = {
    'power bi': 'Power BI',
    'power bi premium': 'Power BI Premium',
    python: 'Python',
    sql: 'SQL',
    excel: 'Excel',
    'google sheets': 'Google Sheets',
    'azure data studio': 'Azure Data Studio',
    'power automate': 'Power Automate',
    'process automation': 'Process Automation',
    'atlassian jira': 'Atlassian Jira',
    jenkins: 'Jenkins',
    'ci/cd': 'CI/CD',
    redis: 'Redis',
    salesforce: 'Salesforce',
    servicenow: 'ServiceNow',
    'exact crm': 'Exact CRM',
    workday: 'Workday',
    '3d safety': '3D Safety',
    marketstack: 'Marketstack',
    'vision api': 'Vision API',
    powershell: 'PowerShell',
    'google apis': 'Google APIs',
    firebase: 'Firebase',
    'grok cli': 'Grok CLI',
    'github copilot': 'GitHub Copilot',
    netlify: 'Netlify',
    'azure maps': 'Azure Maps',
    'polygon.io': 'polygon.io',
    'domain api': 'Domain API',
    'github enterprise': 'GitHub Enterprise',
    'eclipse ide': 'Eclipse IDE',
    anaconda: 'Anaconda',
    'qualtrics': 'Qualtrics',
    'oracle sql': 'Oracle SQL',
    selenium: 'Selenium',
    java: 'Java',
    'outbound calls': 'Outbound Calls',
    'call centre': 'Call Centre / Call Center',
    nps: 'Net Promoter Score (NPS)',
    qa: 'Quality Assurance (QA)',
    'finance compliance': 'Finance Compliance',
    'general insurance': 'General Insurance',
    'order processing': 'Order Processing',
    'ms office': 'Microsoft Office',
    sharepoint: 'SharePoint',
    'motorola solutions': 'Motorola Solutions',
    'customer success': 'Customer Success',
    'escalation management': 'Escalation Management',
    'itil 4 foundation': 'ITIL 4 Foundation',
    istqb: 'ISTQB',
    'rg146': 'RG146',
    'xero': 'Xero',
    myob: 'MYOB',
    'niche rms': 'Niche RMS',
    fidelity: 'Fidelity',
    corelogic: 'CoreLogic',
  };

  const definitionList = [
    { id: 'power bi', variants: ['power bi', 'power-bi', 'powerbi', 'microsoft power bi'] },
    { id: 'power bi premium', variants: ['power bi premium'] },
    { id: 'python', variants: ['python'] },
    { id: 'sql', variants: ['sql', 'structured query language'] },
    { id: 'excel', variants: ['excel', 'microsoft excel'] },
    { id: 'google sheets', variants: ['google sheets'] },
    { id: 'azure data studio', variants: ['azure data studio'] },
    { id: 'power automate', variants: ['power automate', 'microsoft flow'] },
    { id: 'process automation', variants: ['process automation', 'automation workflows', 'automation'] },
    { id: 'atlassian jira', variants: ['jira', 'atlassian jira'] },
    { id: 'jenkins', variants: ['jenkins'] },
    { id: 'ci/cd', variants: ['ci/cd', 'ci cd', 'continuous integration', 'continuous deployment'] },
    { id: 'redis', variants: ['redis'] },
    { id: 'salesforce', variants: ['salesforce', 'salesforce crm', 'salesforce flow', 'salesforce workflow'] },
    { id: 'servicenow', variants: ['servicenow', 'service now'] },
    { id: 'exact crm', variants: ['exact crm'] },
    { id: 'workday', variants: ['workday'] },
    { id: '3d safety', variants: ['3d safety'] },
    { id: 'marketstack', variants: ['marketstack'] },
    { id: 'vision api', variants: ['vision api', 'google vision api', 'google vision'] },
    { id: 'powershell', variants: ['powershell'] },
    { id: 'google apis', variants: ['google apis', 'google api'] },
    { id: 'firebase', variants: ['firebase'] },
    { id: 'grok cli', variants: ['grok cli'] },
    { id: 'github copilot', variants: ['github copilot'] },
    { id: 'netlify', variants: ['netlify'] },
    { id: 'azure maps', variants: ['azure maps'] },
    { id: 'polygon.io', variants: ['polygon.io', 'polygon io'] },
    { id: 'domain api', variants: ['domain api'] },
    { id: 'github enterprise', variants: ['github enterprise'] },
    { id: 'eclipse ide', variants: ['eclipse ide', 'eclipse'] },
    { id: 'anaconda', variants: ['anaconda'] },
    { id: 'qualtrics', variants: ['qualtrics'] },
    { id: 'oracle sql', variants: ['oracle sql'] },
    { id: 'selenium', variants: ['selenium'] },
    { id: 'java', variants: ['java'] },
    { id: 'outbound calls', variants: ['outbound calls', 'outbound calling'] },
    { id: 'call centre', variants: ['call centre', 'call center', 'contact centre', 'contact center'] },
    { id: 'nps', variants: ['nps', 'net promoter score'] },
    { id: 'qa', variants: ['qa', 'quality assurance'] },
    { id: 'finance compliance', variants: ['finance compliance', 'financial compliance'] },
    { id: 'general insurance', variants: ['general insurance'] },
    { id: 'order processing', variants: ['order processing', 'order fulfilment', 'order fulfillment'] },
    { id: 'ms office', variants: ['ms office', 'microsoft office'] },
    { id: 'sharepoint', variants: ['sharepoint'] },
    { id: 'motorola solutions', variants: ['motorola solutions'] },
    { id: 'customer success', variants: ['customer success'] },
    { id: 'escalation management', variants: ['escalation management', 'escalations'] },
    { id: 'itil 4 foundation', variants: ['itil 4 foundation', 'itil4'] },
    { id: 'istqb', variants: ['istqb'] },
    { id: 'rg146', variants: ['rg146'] },
    { id: 'xero', variants: ['xero'] },
    { id: 'myob', variants: ['myob'] },
    { id: 'niche rms', variants: ['niche rms'] },
    { id: 'fidelity', variants: ['fidelity'] },
    { id: 'corelogic', variants: ['corelogic'] },
  ];

  const labels = {};
  const variantMatchers = [];
  const trackedSkillIds = new Set();

  const registerDefinition = (definition) => {
    const canonical = canonicaliseSkill(definition.id);
    if (!canonical) {
      return;
    }

    if (!labels[canonical]) {
      labels[canonical] = specialLabels[canonical] ||
        canonical
          .split(' ')
          .map((part) => {
            if (!part) return '';
            if (part.length <= 3 && /[^a-z]/i.test(part) === false) {
              return part.toUpperCase();
            }
            if (part === 'crm') return part.toUpperCase();
            if (part === 'api') return part.toUpperCase();
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join(' ');
    }

    trackedSkillIds.add(canonical);

    const variants = Array.isArray(definition.variants) ? definition.variants : [];
    variants.forEach((variant) => {
      const key = canonical + '::' + variant.toLowerCase();
      if (variantMatchers.some((matcher) => matcher.key === key)) {
        return;
      }
      const patternBody = escapeRegex(variant)
        .replace(/\\\s\+/g, '\\s+')
        .replace(/\s+/g, '\\s+');
      const pattern = new RegExp(`\\b${patternBody}\\b`, 'i');
      variantMatchers.push({ key, canonical, pattern });
    });
  };

  definitionList.forEach(registerDefinition);

  const ensureResumeSkillsRegistered = (resumeLibrary) => {
    (resumeLibrary || []).forEach((resume) => {
      (resume.skills || []).forEach((skill) => {
        const canonical = canonicaliseSkill(skill);
        if (!canonical) return;
        if (!labels[canonical]) {
          labels[canonical] = specialLabels[canonical] ||
            canonical
              .split(' ')
              .map((part) => {
                if (!part) return '';
                if (part.length <= 3 && /[^a-z]/i.test(part) === false) {
                  return part.toUpperCase();
                }
                if (part === 'crm') return part.toUpperCase();
                if (part === 'api') return part.toUpperCase();
                if (part === 'bi') return part.toUpperCase();
                return part.charAt(0).toUpperCase() + part.slice(1);
              })
              .join(' ');
        }
        if (!trackedSkillIds.has(canonical)) {
          trackedSkillIds.add(canonical);
          const pattern = new RegExp(`\\b${escapeRegex(canonical).replace(/\s+/g, '\\s+')}\\b`, 'i');
          variantMatchers.push({ key: `${canonical}::${canonical}`, canonical, pattern });
        }
      });
    });
  };

  const stripHtml = (html) => {
    if (!html) return '';
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return (doc && doc.body && doc.body.textContent) || html;
    }
    return html;
  };

  const normaliseWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

  const extractSkills = (text) => {
    if (!text) {
      return [];
    }
    const matches = new Set();
    variantMatchers.forEach((matcher) => {
      if (matcher.pattern.test(text)) {
        matches.add(matcher.canonical);
      }
    });
    return Array.from(matches);
  };

  const analyse = async ({ url, description, resumeLibrary, fetchOptions } = {}) => {
    if (!Array.isArray(resumeLibrary) || resumeLibrary.length === 0) {
      throw new Error('No résumé data is available for matching.');
    }

    ensureResumeSkillsRegistered(resumeLibrary);

    let jobText = normaliseWhitespace(description || '');
    const warnings = [];
    let descriptionSource = jobText ? 'pasted' : null;

    if (!jobText && url) {
      try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error(`Received ${response.status} when fetching the job page.`);
        }
        const html = await response.text();
        jobText = normaliseWhitespace(stripHtml(html)).slice(0, 20000);
        descriptionSource = 'fetched';
      } catch (error) {
        warnings.push(
          'Automatic fetch failed. Paste the job description text to analyse skills without CORS limits.'
        );
      }
    }

    if (!jobText) {
      throw new Error('Provide a job description (paste the text) so we can extract required skills.');
    }

    const jobSkills = extractSkills(jobText);
    const uniqueJobSkills = Array.from(new Set(jobSkills));

    const resumeComparisons = resumeLibrary.map((resume) => {
      const resumeSkills = new Set((resume.skills || []).map(canonicaliseSkill).filter(Boolean));
      const matches = uniqueJobSkills.filter((skill) => resumeSkills.has(skill));
      const missing = uniqueJobSkills.filter((skill) => !resumeSkills.has(skill));
      const totalTracked = uniqueJobSkills.length;
      const matchCount = matches.length;
      const matchRatio = totalTracked ? matchCount / totalTracked : 0;
      return {
        resumeId: resume.id,
        resumeName: resume.name,
        resumeFile: resume.file,
        focus: resume.focus,
        highlights: resume.highlights || [],
        matches,
        missing,
        matchCount,
        totalTracked,
        matchRatio,
        skills: resume.skills || [],
      };
    });

    const ranked = resumeComparisons
      .slice()
      .sort((a, b) => {
        if (b.matchCount !== a.matchCount) {
          return b.matchCount - a.matchCount;
        }
        if (b.matchRatio !== a.matchRatio) {
          return b.matchRatio - a.matchRatio;
        }
        return (b.skills.length || 0) - (a.skills.length || 0);
      });

    return {
      jobUrl: url || '',
      jobSkills: uniqueJobSkills,
      descriptionSource,
      warnings,
      resumes: resumeComparisons,
      recommended: ranked[0] || null,
    };
  };

  const formatSkill = (skill) => {
    const canonical = canonicaliseSkill(skill);
    if (!canonical) return '';
    return labels[canonical] ||
      canonical
        .split(' ')
        .map((part) => {
          if (!part) return '';
          if (part.length <= 3 && /[^a-z]/i.test(part) === false) {
            return part.toUpperCase();
          }
          if (part === 'crm') return part.toUpperCase();
          if (part === 'api') return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');
  };

  const getTrackedSkills = () => {
    return Array.from(trackedSkillIds)
      .map((skill) => ({ id: skill, label: formatSkill(skill) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const prime = (resumeLibrary) => {
    ensureResumeSkillsRegistered(resumeLibrary || []);
  };

  window.PathfinderAnalyzer = {
    analyze: analyse,
    analyse,
    formatSkill,
    getTrackedSkills,
    prime,
  };
})();
