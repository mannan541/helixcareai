# Web Deployment Report - HelixCareAI

## Current State
The web app is deployed at: https://helixcareai.vercel.app/

## Issue
The root URL (/) is currently showing the login page instead of the landing page. The landing page component (LandingPage) with Login button was created and routed correctly at path '/'. But Vercel deployment is serving the app - there may be:
1. Auth state auto-redirecting to /app/dashboard or login if it thinks user is authenticated/unauthenticated?
2. Possible stale build or different routing behavior

## Build Configuration
- vercel.json uses builds with @vercel/static-build, src: web/package.json, distDir: dist
- SPA rewrites configured to serve index.html for all routes
- Root path '/' should render LandingPage component

## Code Structure
- Router: `web/src/app/router/index.tsx` defines '/' as LandingPage
- LandingPage: `web/src/features/marketing/pages/landing-page.tsx` - shows "HelixCareAI" header with "Login" button linking to /login
- AuthGuard checks isAuthenticated; unauthenticated users see login, but root (/) is not behind AuthGuard

## Possible Cause
Check if there's any automatic redirect in the app. For example, if user has auth token in localStorage, AuthGuard might affect navigation? But root '/' is public (LandingPage). The route definition looks correct.

## Routes
- / → LandingPage (public)
- /login → Login page
- /register → Register page
- /app/dashboard → Dashboard (protected by AuthGuard)

## Deployment Info
- Git repo: https://github.com/mannan541/helixcareai
- Latest commit: 8027736
- Vercel project: helixcareai (aliased to helixcareai.vercel.app)

## Recommendation for Diagnosis
Share with Claude to check: 
1. If the app has any redirect logic on initial load (e.g., check auth and redirect to /login)
2. If the router is working correctly
3. Browser console/network issues
4. Need to inspect the deployed app behavior
