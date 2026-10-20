import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🩺</div>
            <div className="text-xl font-bold text-sky-600">HelixCareAI</div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Autism Therapy Management Platform
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-3xl mx-auto">
            Streamline therapy sessions, track progress, and leverage AI-powered insights for better outcomes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/login"
              className="rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 sm:text-base"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          © 2026 HelixCareAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
