import { Link } from 'react-router-dom';
import { CTA } from '../../lib/marketing/config';

const services = [
  { title: 'Patient Intake and Records', desc: 'Enter information once; keep records organized and secure.' },
  { title: 'Scheduling and Reminders', desc: 'Conflict detection, authorization-aware booking, automated caregiver reminders.' },
  { title: 'Session Documentation and Data Collection', desc: 'Customizable data grids, goals, prompt levels, mastery criteria.' },
  { title: 'Progress Tracking and Reporting', desc: 'Goal progress over time, supervisor-friendly summaries, exportable reports.' },
  { title: 'Billing and Insurance Support', desc: 'Map session data to billing requirements, prepare claims, track through payment.' },
  { title: 'Authorization Management', desc: 'Track units, renewal dates, and approval status.' },
  { title: 'Parent/Caregiver Collaboration', desc: 'View schedules, review/sign notes, access resources.' },
  { title: 'AI Insights and Automation', desc: 'Surface patterns, draft summaries, suggest goals, reduce repetitive admin.' },
  { title: 'Onboarding and Training', desc: 'Guided setup tailored to your practice.' },
  { title: 'Support and Customization', desc: 'Responsive support as you grow.' },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Services</h1>
      <p className="mt-4 text-lg text-slate-600">Comprehensive tools to streamline every step of your practice workflow.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.title} className="rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>
      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-slate-900">Plans (placeholder)</h2>
        <p className="mt-2 text-slate-600">Pricing scales with practice size. Contact us for details.</p>
        {/* TODO: replace with real plans/pricing */}
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {['Starter', 'Professional', 'Enterprise'].map((plan) => (
            <div key={plan} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{plan}</h3>
              <p className="mt-2 text-sm text-slate-600">For practices of different sizes.</p>
              <Link to={CTA.bookDemo} className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                Contact us →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
