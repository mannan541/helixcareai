import { Link } from 'react-router-dom';
import { CTA } from '../../lib/marketing/config';

export default function PlatformPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Platform / Software Details</h1>
      <p className="mt-4 text-lg text-slate-600">
        A secure, cloud-based platform connecting clinical, administrative, and financial workflows in one place.
      </p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-slate-700">
          <strong>Definition:</strong> Autism therapy software is a secure, cloud-based platform that connects a practice's
          clinical, administrative, and financial workflows (intake, scheduling, documentation, outcomes tracking, and
          billing) in one place.
        </p>
      </div>
      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">AI Capabilities</h2>
        <p className="text-slate-600">
          Progress pattern detection, draft session summaries, suggested next goals, and workflow automation. AI supports
          and does not replace clinical judgment.
        </p>
        {/* TODO: confirm exactly which AI features are live */}
      </section>
      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Security and Privacy</h2>
        <p className="text-slate-600">
          Encryption in transit and at rest, role-based access, access/audit logs, secure data handling.
        </p>
        <p className="text-sm text-slate-500">
          {/* [confirm before publishing] */} Compliance certifications/BAA availability require confirmation.
        </p>
      </section>
      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Supported Devices</h2>
        <p className="text-slate-600">Web, tablet, and mobile via modern browsers.</p>
      </section>
      <div className="mt-12">
        <Link
          to={CTA.bookDemo}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Book a Demo
        </Link>
      </div>
    </div>
  );
}
