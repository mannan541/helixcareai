import { useState } from 'react';
import { Link } from 'react-router-dom';
import LogoMark from './LogoMark';
import { NAV, CTA, SITE } from '../../lib/marketing/config';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-lg font-semibold text-slate-900">{SITE.name}</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} to={item.href} className="text-sm text-slate-700 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
          <Link to={CTA.login} className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Login
          </Link>
          <Link
            to={CTA.getStarted}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Get Started
          </Link>
        </div>
        <button
          type="button"
          className="md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen(!open)}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>
      {open && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={CTA.login}
              className="block rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              to={CTA.getStarted}
              className="block rounded-md px-3 py-2 text-base font-semibold text-blue-600 hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
