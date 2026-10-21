// Centralized marketing content/config. Replace placeholders with real values when available.
// All content is original; do not copy from vendors.
export const SITE = {
  name: 'HelixCareAI',
  year: new Date().getFullYear(),
  description: 'Secure, cloud-based autism therapy management platform bringing clinical, administrative, and financial workflows together.',
};

export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Platform', href: '/platform' },
  { label: 'Contact', href: '/contact' },
];

export const CTA = {
  login: '/login',
  getStarted: '/login',
  bookDemo: '/contact',
};

export const STATS_PLACEHOLDER = [
  { label: 'Sessions logged', value: '—', note: 'TODO: replace with verified metrics' },
  { label: 'Practices onboarded', value: '—', note: 'TODO: replace with verified metrics' },
  { label: 'Time saved on admin', value: '—', note: 'TODO: replace with verified metrics' },
];

export const TESTIMONIALS: Array<{ quote: string; name: string; role: string; org: string }> = [
  // TODO: replace with real, verified testimonials
];

export const FAQ = [
  {
    q: 'Who is HelixCareAI for?',
    a: 'ABA, speech-language, and occupational therapy practices—from solo providers to multi-site clinics. Families access relevant information through the portal.',
  },
  {
    q: 'Is my data secure?',
    a: 'We focus on access control, encryption in transit and at rest, and clear auditability. Compliance claims (e.g. HIPAA/SOC 2/FERPA/GDPR) are marked for confirmation — contact us for security documentation.',
  },
  {
    q: 'Does it work for ABA, speech, and OT?',
    a: 'Yes. Core workflows support all three disciplines, though some advanced capabilities may be in development; items are clearly labeled where relevant.',
  },
  {
    q: 'Can it replace my spreadsheets and paper forms?',
    a: 'HelixCareAI centralizes intake, scheduling, documentation, progress tracking, and billing so you can retire many manual processes.',
  },
  {
    q: 'Does it work with my existing tools or EHR?',
    a: 'Integrations depend on your environment. We evaluate common needs case by case — please reach out to discuss.',
  },
  {
    q: 'Is it only for large clinics?',
    a: 'No. HelixCareAI scales from solo providers to growing and multi-site clinics.',
  },
  {
    q: 'How is AI used, and does it replace clinicians?',
    a: 'AI assists with drafting summaries, surfacing patterns, and suggesting next goals to reduce admin work. It supports clinical judgment — it does not replace clinicians.',
  },
  {
    q: 'How does onboarding and support work?',
    a: 'We provide guided onboarding and responsive support tailored to your practice size.',
  },
  {
    q: 'What does it cost?',
    a: 'Plans scale with practice size. Contact us for current pricing.',
  },
  {
    q: 'What devices are supported?',
    a: 'Modern web browsers on desktop, tablet, and mobile. A responsive experience is optimized for common clinical workflows.',
  },
];
