import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CTA } from '../../lib/marketing/config';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    if (!name || !email || !message) {
      setError('Please fill in all required fields.');
      return;
    }
    // TODO: connect an email service (Resend/Formspree)
    setError('');
    setSubmitted(true);
    form.reset();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-4 text-lg text-slate-600">Get in touch to learn more or book a demo.</p>
      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-slate-700">
                Organization
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="therapist">Therapist</option>
                <option value="clinic">Clinic</option>
                <option value="parent">Parent</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {submitted && <p className="text-sm text-green-600">Message sent (placeholder). We’ll get back to you soon.</p>}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Send Message
            </button>
          </form>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Contact Details (placeholder)</h2>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>Email: mannan796@gmail.com</li>
              <li>Phone: +923055547012</li>
              <li>Address: Model Town, Lahore, Pakistan</li>
              <li>Hours: Mon-Fri 9:00 AM - 5:00 PM</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Get Started</h2>
            <p className="mt-2 text-slate-600">Ready to streamline your practice?</p>
            <Link
              to={CTA.getStarted}
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
