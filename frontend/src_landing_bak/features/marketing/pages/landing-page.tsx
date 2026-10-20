import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="font-bold text-xl">HelixCareAI</div>
          <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Login
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <section className="container py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            Autism Therapy Management Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline therapy sessions, track progress, and leverage AI-powered insights for better outcomes.
          </p>
          <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:opacity-90">
            Get Started
          </Link>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 HelixCareAI. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
