export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-4 text-slate-600">Last updated: {new Date().getFullYear()}</p>
      <div className="mt-8 space-y-4 text-slate-700">
        <p>This is a placeholder privacy policy. Content will be updated with our actual practices.</p>
        <p>We prioritize secure data handling and access controls.</p>
      </div>
    </div>
  );
}
