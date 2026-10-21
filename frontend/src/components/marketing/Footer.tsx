import { Link } from 'react-router-dom';
import LogoMark from './LogoMark';
import { NAV, CTA, SITE } from '../../lib/marketing/config';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="text-lg font-semibold text-slate-900">{SITE.name}</span>
            </div>
            <p className="mt-4 max-w-md text-sm text-slate-600">
              Secure, cloud-based autism therapy management platform bringing clinical, administrative, and financial workflows together.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-sm text-slate-600 hover:text-slate-900">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Product</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to={CTA.getStarted} className="text-sm text-slate-600 hover:text-slate-900">
                  Get Started
                </Link>
              </li>
              <li>
                <Link to={CTA.login} className="text-sm text-slate-600 hover:text-slate-900">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-600 hover:text-slate-900">
                  Book a Demo
                </Link>
              </li>
            </ul>
            <h3 className="mt-6 text-sm font-semibold text-slate-900">Contact (placeholder)</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>email: mannan796@gmail.com</li>
              <li>phone: +923055547012</li>
              <li>address: Model Town, Lahore, Pakistan</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-8 sm:flex sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">© {SITE.year} {SITE.name}. All rights reserved.</p>
          <div className="mt-4 flex gap-6 sm:mt-0">
            <Link to="/privacy" className="text-sm text-slate-500 hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-slate-500 hover:text-slate-900">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
