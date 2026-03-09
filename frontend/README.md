# Simba

Compare 150+ telecom plans from all 8 licensed Saudi carriers. Find your perfect plan in seconds.

## Features

- **Smart Plan Finder** — Answer a few quick questions and get personalized plan recommendations
- **Browse & Filter** — Search, sort, and filter all plans by carrier, price, data, calls, and more
- **Side-by-Side Compare** — Compare up to 3 plans at once with a detailed feature-by-feature overlay
- **Plan Details** — Detailed breakdown of each plan with specs, pricing, and direct links to carrier sites
- **Google Sign-In** — Firebase Authentication with popup and redirect fallback
- **Onboarding Flow** — Guided first-time user experience introducing key features
- **Bilingual** — Full English and Arabic support with RTL layout
- **Analytics** — Google Analytics 4, Mixpanel, and Microsoft Clarity with unified tracking, dynamic page titles, user identification, and custom events
- **Responsive** — Mobile-first design with bottom tab bar and sticky desktop navigation

## Carriers

STC · Mobily · Zain · Virgin Mobile · Jawwy · Lebara · Yaqoot · Salam

## Tech Stack

- **React 19** + **Vite 7**
- **Tailwind CSS 4**
- **Firebase** (Auth + Firestore)
- **React Router 7**
- **Lucide React** icons

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID (`G-XXXXXXXXXX`) |
| `VITE_MIXPANEL_TOKEN` | Mixpanel project token |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity project ID |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/       # Shared UI (Navigation, Footer, CompareBar, Onboarding, etc.)
├── context/          # React contexts (Auth, Language, Compare)
├── data/             # Plan data and carrier definitions
├── lib/              # Utilities (Firebase config, analytics, gradient)
├── pages/            # Route pages (Home, Plans, PlanDetail, Finder, Profile, About)
└── App.jsx           # Root component with routing
```
