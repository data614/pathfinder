'use strict';

function normaliseText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function buildPromptProfile(resume) {
  const focus = normaliseText(resume.focus);
  const trimmedFocus = focus.length > 220 ? `${focus.slice(0, 217).trimEnd()}…` : focus;

  const topHighlights = Array.isArray(resume.highlights)
    ? resume.highlights.map((entry) => normaliseText(entry)).filter(Boolean).slice(0, 3)
    : [];

  const prioritySkills = Array.isArray(resume.skills)
    ? resume.skills.map((skill) => normaliseText(skill).toLowerCase()).filter(Boolean).slice(0, 12)
    : [];

  const metrics = topHighlights.filter((highlight) => /[0-9%$€£]/.test(highlight));
  const primaryMetrics = (metrics.length ? metrics : topHighlights).slice(0, 3);

  return {
    id: resume.id,
    name: resume.name,
    focus: trimmedFocus,
    topHighlights,
    prioritySkills,
    primaryMetrics,
  };
}

const baseResumes = [
  {
    id: 'data-analyst-cv',
    name: 'Data Analyst CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EQjQ4wDZMxxMsLPrcitR_YQBdUWL7iB8EzGHL_-tQkxfNw?e=moPgn4',
    focus:
      'Analytics storyteller for Power BI teams with automation, grant funding, and API integration wins.',
    highlights: [
      'Secured a $1M Transport for NSW analytics grant with real-time Power BI Premium dashboards.',
      'Built polygon.io and Azure Maps market intelligence dashboards with automated releases.',
      'Delivered Jenkins CI/CD and Redis deployment proof-of-concepts for faster BI delivery.',
    ],
    skills: [
      'power bi premium',
      'power bi',
      'python',
      'sql',
      'excel',
      'google sheets',
      'azure data studio',
      'power automate',
      'process automation',
      'atlassian jira',
      'jenkins',
      'ci/cd',
      'redis',
      'salesforce',
      'servicenow',
      'exact crm',
      'workday',
      '3d safety',
      'marketstack',
      'vision api',
      'powershell',
      'google apis',
      'firebase',
      'grok cli',
      'github copilot',
      'netlify',
      'azure maps',
      'polygon.io',
      'domain api',
      'github enterprise',
    ],
  },
  {
    id: 'data-automation-resume',
    name: 'Data Automation Resume',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EaEDtij2GNtNuz0NWT01s7YBodQc2f0tx_M-xIcjgD9ieg?e=HSi4Vc',
    focus:
      'Automation-first analytics profile combining Power BI Premium, DevOps, and process streamlining.',
    highlights: [
      'Reduced manual QA cost by 10% through Python + Selenium automation for web apps.',
      'Implemented Google Workspace Vault integrations for secure discovery and credentials.',
      'Scaled finance reporting with Google Sheets vision API automations and CI/CD releases.',
    ],
    skills: [
      'power bi premium',
      'power bi',
      'python',
      'sql',
      'excel',
      'google sheets',
      'azure data studio',
      'power automate',
      'process automation',
      'atlassian jira',
      'jenkins',
      'ci/cd',
      'redis',
      'salesforce',
      'servicenow',
      'exact crm',
      'workday',
      '3d safety',
      'marketstack',
      'vision api',
      'powershell',
      'google apis',
      'firebase',
      'grok cli',
      'github copilot',
      'netlify',
      'azure maps',
      'polygon.io',
      'domain api',
      'github enterprise',
    ],
  },
  {
    id: 'data-migration-cv',
    name: 'Data Migration CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EQ53ogtYyVJMojrLigaKl80Bxkh72wDT3tDzFN7USu5otg?e=ZSR8nI',
    focus:
      'Data migration and analytics specialist with Power BI, automation, and stakeholder coordination.',
    highlights: [
      'Delivered Power BI Premium snapshots to govern WHS data during infrastructure upgrades.',
      'Led Power Automate onboarding workflows and Workday compliance validation.',
      'Provided RG146-aligned client updates while supporting API integrations and Redis POCs.',
    ],
    skills: [
      'power bi',
      'python',
      'sql',
      'excel',
      'google sheets',
      'azure data studio',
      'power automate',
      'process automation',
      'atlassian jira',
      'eclipse ide',
      'anaconda',
      'google apis',
      'exact crm',
      'workday',
      'servicenow',
      'rg146',
      'qualtrics',
      'oracle sql',
      'selenium',
    ],
  },
  {
    id: 'customer-service-cv',
    name: 'Customer Service CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EZy1tBeFsUhKnlsSZcDmHRwBcTkGQMyDYvSKxD6aNuvhxQ?e=G3fZvD',
    focus:
      'Customer success operator blending analytics dashboards with frontline escalation expertise.',
    highlights: [
      'Maintained 9 NPS targets while booking and triaging nationwide healthcare appointments.',
      'Translated Power BI insights into stakeholder updates and automated onboarding via Power Automate.',
      'Reduced manual defect handling with Java/Selenium web automation at Woolworths Group.',
    ],
    skills: [
      'power bi',
      'power automate',
      'salesforce',
      'nps',
      'outbound calls',
      'customer success',
      'escalation management',
      'process automation',
      'java',
      'selenium',
      'excel',
      'google sheets',
      'domain api',
      'polygon.io',
    ],
  },
  {
    id: 'it-support-cv',
    name: 'IT Support CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/Ed4Mq3WvwDlMq99ROTkmEjcBi2SIU3z3JZnjHuN-HTPyJA?e=u3DVlo',
    focus:
      'Service desk and QA professional with automation, DevOps hand-offs, and stakeholder comms.',
    highlights: [
      'Stabilised GitHub CI/CD releases for analytics dashboards and credential management.',
      'Handled Salesforce administration with validation rules that lifted data accuracy 15%.',
      'Executed ServiceNow and Workday onboarding flows that preserved compliance targets.',
    ],
    skills: [
      'python',
      'sql',
      'power bi',
      'excel',
      'google sheets',
      'azure data studio',
      'power automate',
      'process automation',
      'atlassian jira',
      'eclipse ide',
      'anaconda',
      'google apis',
      'exact crm',
      'workday',
      'servicenow',
      'rg146',
      'itil 4 foundation',
      'istqb',
      'qualtrics',
      'oracle sql',
      'selenium',
    ],
  },
  {
    id: 'it-support-resume',
    name: 'IT Support Resume',
    file:
      'https://onedrive.live.com/personal/da864a40ece446cd/_layouts/15/doc.aspx?resid=0b5a6e1c-954e-4888-8799-73dcf4f5f75b&cid=da864a40ece446cd',
    focus:
      'Hands-on IT support practitioner with CI/CD exposure and compliance-driven onboarding.',
    highlights: [
      'Automated Excel logistics reporting and QA checks saving $250K annually.',
      'Championed Power BI Premium dashboards and Redis deployments for real-time analytics.',
      'Delivered RG146-compliant customer outreach while handling Salesforce and Workday tasks.',
    ],
    skills: [
      'python',
      'sql',
      'power bi',
      'excel',
      'google sheets',
      'azure data studio',
      'power automate',
      'process automation',
      'atlassian jira',
      'eclipse ide',
      'anaconda',
      'google apis',
      'exact crm',
      'workday',
      'servicenow',
      'rg146',
      'itil 4 foundation',
      'istqb',
      'qualtrics',
      'oracle sql',
      'selenium',
    ],
  },
  {
    id: 'sales-representative-cv',
    name: 'Sales Representative CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/Ed89DbgPrtNJuysthv_L4JUBAB90Ucb4i6wqlT6mmUhaSg?e=guWNyf',
    focus:
      'High-velocity SDR profile with compliance-ready messaging and analytics-informed demos.',
    highlights: [
      'Delivers 20–30 outbound calls per day with 40% show rates and 10% conversions.',
      'Runs Salesforce and Exact CRM cadences with validation rules and automated flows.',
      'Balances phone sales with analytics demos including polygon.io dashboards.',
    ],
    skills: [
      'salesforce',
      'exact crm',
      'xero',
      'myob',
      'excel',
      'google sheets',
      'outbound calls',
      'call centre',
      'nps',
      'qa',
      'rg146',
      'finance compliance',
      'general insurance',
      'order processing',
      'ms office',
      'sharepoint',
      'motorola solutions',
      'power bi',
      'power automate',
      'polygon.io',
    ],
  },
  {
    id: 'sales-executive-cv',
    name: 'Sales Executive CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EQffVjK_CAdIkuUJkWpmpAYBbntWbLVErhRYszTs8rOf9A?e=8C57UP',
    focus:
      'Account executive and field sales hybrid with compliance-ready processes and analytics demos.',
    highlights: [
      'Pairs property inspections with analytics storytelling to accelerate buyer commitment.',
      'Migrated safety data into Microsoft Cloud while securing $200K+ training grants.',
      'Executes Salesforce flows and Power Automate onboarding to remove manual updates.',
    ],
    skills: [
      'salesforce',
      'exact crm',
      'xero',
      'myob',
      'excel',
      'google sheets',
      'outbound calls',
      'call centre',
      'nps',
      'qa',
      'rg146',
      'finance compliance',
      'general insurance',
      'order processing',
      'ms office',
      'sharepoint',
      'motorola solutions',
      'power bi',
      'power automate',
      'polygon.io',
    ],
  },
  {
    id: 'banking-consultant-cv',
    name: 'Banking Consultant CV',
    file: 'https://1drv.ms/w/c/da864a40ece446cd/EQd4SR64P9NLrzkHXyA-pWMBqTqP_JZcOIqwhdCf1393Sw?e=5tf2aD',
    focus:
      'Banking and financial services consultant with analytics demos and compliance mastery.',
    highlights: [
      'Runs Salesforce and Exact CRM cadences that protect data accuracy by 15%.',
      'Delivers RG146-aligned updates and mortgage processing support for institutional clients.',
      'Automates analytics dashboards and Redis deployments to speed investment reporting.',
    ],
    skills: [
      'salesforce',
      'exact crm',
      'xero',
      'myob',
      'excel',
      'google sheets',
      'outbound calls',
      'call centre',
      'nps',
      'qa',
      'rg146',
      'finance compliance',
      'general insurance',
      'order processing',
      'ms office',
      'sharepoint',
      'motorola solutions',
      'niche rms',
      'fidelity',
      'corelogic',
      'power bi',
      'power automate',
      'polygon.io',
    ],
  },
];

const resumeLibrary = baseResumes.map((resume) => ({
  ...resume,
  promptProfile: buildPromptProfile(resume),
}));

module.exports = {
  resumeLibrary,
  buildPromptProfile,
};
