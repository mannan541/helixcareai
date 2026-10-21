import { Link } from 'react-router-dom';
import { CTA } from '../../lib/marketing/config';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">About HelixCareAI</h1>
      <p className="mt-6 text-lg text-slate-600">
        HelixCareAI is a secure, cloud-based autism therapy management platform that brings clinical, administrative,
        and financial workflows into one place.
      </p>
      <section className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Mission</h2>
          <p className="mt-2 text-slate-600">Help therapy practices spend less time on paperwork and more time on care.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Vision</h2>
          <p className="mt-2 text-slate-600">Connected, person-centered care through simple, reliable tools.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Our Story</h2>
          <p className="mt-2 text-slate-600">
            Built from firsthand awareness of the administrative load in therapy practices. We focus on practical
            workflows that reduce errors, rework, and burnout.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Core Values</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-600">
            <li>Empathy</li>
            <li>Evidence-based practice</li>
            <li>Privacy and security</li>
            <li>Accessibility</li>
            <li>Collaboration</li>
          </ul>
        </div>
      </section>
      <div className="mt-12">
        <Link
          to={CTA.getStarted}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
