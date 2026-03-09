# Simba

A Saudi Arabian telecom plan comparison and recommendation platform. Browse, filter, compare, and get AI-powered personalized recommendations from 150+ mobile plans across all 8 licensed Saudi carriers (STC, Mobily, Zain, Virgin Mobile, Jawwy, Lebara, Yaqoot, and Salam).

## Features

- **Smart Plan Finder** — Interactive questionnaire that recommends the best plans based on your priorities (data usage, budget, international calls, 5G, etc.)
- **Browse & Filter** — Full plan catalog with advanced filtering by carrier, price, data, minutes, plan type, and more
- **Side-by-Side Comparison** — Compare up to 3 plans with detailed feature-by-feature breakdown
- **AI Advisor Chat** — OpenAI-powered conversational assistant for personalized plan recommendations
- **Bilingual Support** — Full English and Arabic with RTL layout
- **User Accounts** — Google Sign-In, saved preferences, plan likes/dislikes, and comments
- **Analytics** — Google Analytics 4, Mixpanel, and Microsoft Clarity integration

## Tech Stack

### Frontend
- React 19, TypeScript, Vite 7
- Tailwind CSS 4, Radix UI
- Firebase Auth, React Router 7
- Lucide React icons

### Backend
- Node.js, Express 5.1, TypeScript
- Firebase Admin (Firestore + Auth)
- OpenAI API

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (Auth & Firestore)
- OpenAI API key

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Environment Variables

**Frontend** (`frontend/.env`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:3001
VITE_GA_MEASUREMENT_ID=...
VITE_MIXPANEL_TOKEN=...
VITE_CLARITY_PROJECT_ID=...
```

**Backend** (`backend/.env`):
```
PORT=3001
PRODUCTION_URL=https://simba.app
OPENAI_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### Development

```bash
# Frontend (http://localhost:5173)
npm run dev:frontend

# Backend (http://localhost:3001)
npm run dev:backend
```

### Production Build

```bash
npm run build:frontend
npm run build:backend
npm run start
```

## Project Structure

```
├── frontend/
│   └── src/
│       ├── pages/          # Route pages (Home, Plans, Finder, Advisor, Profile, etc.)
│       ├── components/     # Reusable UI components
│       ├── context/        # React Context (Auth, Language, Compare)
│       ├── lib/            # Firebase, analytics, API utilities
│       ├── data/           # Plan data & scoring logic
│       ├── hooks/          # Custom React hooks
│       ├── types/          # TypeScript definitions
│       └── assets/         # Images, fonts, icons
├── backend/
│   └── src/
│       ├── routes/         # API routes (plans, advisor, interactions)
│       ├── middleware/      # Firebase auth middleware
│       ├── lib/            # Firebase Admin setup
│       └── data/           # Plan definitions
└── package.json            # Root scripts for monorepo
```
