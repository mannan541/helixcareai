import { Link } from 'react-router-dom';
import { CTA } from '../../lib/marketing/config';
import { IMG } from '../../lib/marketing/images';

const modules = [
  { title: 'Patient Intake and Records', desc: 'Enter information once; keep records organized and secure.' },
  { title: 'Smart Scheduling', desc: 'Conflict detection, authorization-aware booking, automated caregiver reminders.' },
  { title: 'Clinical Documentation and Data Collection', desc: 'Customizable data grids, goals, prompt levels, mastery criteria, real-time graphs.' },
  { title: 'Progress Tracking and Reports', desc: 'Goal progress over time, supervisor-friendly summaries, exportable reports.' },
  { title: 'Billing and Insurance', desc: 'Map session data to billing requirements, prepare claims, track through payment.' },
  { title: 'Authorization Management', desc: 'Track units, renewal dates, and approval status.' },
  { title: 'Parent/Caregiver Portal', desc: 'View schedules, review/sign notes, access resources; less phone tag.' },
  { title: 'AI Insights and Automation', desc: 'Surface patterns, draft summaries, suggest goals, reduce repetitive admin.' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Less admin. More therapy.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Streamline therapy sessions, track progress, and leverage AI-powered insights for better outcomes.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to={CTA.getStarted}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-base"
              >
                Get Started
              </Link>
              <Link
                to={CTA.bookDemo}
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:text-base"
              >
                Book a Demo
              </Link>
            </div>
          </div>
          <div>
            <img
              src={IMG.laptopDashboard}
              alt="Therapy management dashboard on a laptop"
              className="w-full rounded-xl shadow-lg"
              loading="lazy"
              width="1200"
              height="800"
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-slate-700">Built for ABA, speech, and occupational therapy practices</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="h-8 w-24 rounded bg-slate-200" aria-label="placeholder logo" />
            <div className="h-8 w-24 rounded bg-slate-200" aria-label="placeholder logo" />
            <div className="h-8 w-24 rounded bg-slate-200" aria-label="placeholder logo" />
            <div className="h-8 w-24 rounded bg-slate-200" aria-label="placeholder logo" />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">The Administrative Knot</h2>
          <p className="mt-6 text-lg text-slate-600">
            Manual coordination (spreadsheets, paper packets, sticky notes, switching between tabs) causes scheduling errors,
            missed documentation, delayed claims, and burnout. HelixCareAI replaces that with one connected workflow so
            therapists spend their time on care, not paperwork.
          </p>
        </div>
      </section>

      {/* Pipeline */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Intake-to-Invoice Pipeline</h2>
            <p className="mt-4 text-lg text-slate-600">Nothing falls through the cracks between steps.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { step: '1', title: 'Intake', desc: 'Secure digital forms capture demographics, insurance details, and consents once.' },
              { step: '2', title: 'Scheduling', desc: 'Calendars check staff availability, rooms, and authorization limits before confirming.' },
              { step: '3', title: 'Session Data Capture', desc: 'Structured templates for targets, prompt levels, and behavior data—turned into live graphs.' },
              { step: '4', title: 'Billing and Follow-up', desc: 'Session data flows into claim-ready records tied to goals, with claim status tracking.' },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Core Modules</h2>
          <p className="mt-4 text-lg text-slate-600">Everything you need in one connected platform.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="rounded-xl border border-slate-200 p-6 shadow-sm transition hover:shadow-md">
              <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Every day on manual processes is time your team doesn't get back.
          </h2>
          <p className="mt-4 text-lg text-blue-100">See HelixCareAI in action.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={CTA.getStarted}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 sm:text-base"
            >
              Get Started
            </Link>
            <Link
              to={CTA.bookDemo}
              className="rounded-lg border border-white/80 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:text-base"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
