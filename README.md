# FIJI CRM - USD Phi Gamma Delta

A chapter management and alumni relations CRM for the University of San Diego Phi Gamma Delta chapter.

## Features

- **Google OAuth Sign-in** - Brothers sign in with their Google accounts
- **Member Directory** - Search and filter brothers by name, industry, location, graduation year
- **AI-Powered Search** - Natural language chatbot to find brothers ("Who works in tech in SF?")
- **Mass Texting** - Send SMS to groups of brothers via Twilio with reusable templates
- **Dashboard** - Chapter stats, industry/geographic distribution charts
- **Role-based Access** - Admin, Officer, and Member roles

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: PostgreSQL with pgvector extension (Vercel Postgres)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5 with Google OAuth
- **AI**: OpenAI (text-embedding-3-small + GPT-4o-mini)
- **SMS**: Twilio
- **UI**: Tailwind CSS + shadcn/ui + Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Google OAuth credentials
- OpenAI API key
- Twilio account (for SMS features)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local` and fill in your credentials:
   ```
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="generate-a-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   OPENAI_API_KEY="sk-..."
   TWILIO_ACCOUNT_SID="..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_PHONE_NUMBER="+1..."
   ```

3. Enable pgvector in your database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Deploying to Vercel

1. Push your code to a GitHub repo
2. Connect the repo to Vercel
3. Add a Vercel Postgres database (enables pgvector)
4. Set all environment variables in Vercel dashboard
5. Deploy!

## FIJI Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Royal Purple | `#3D1F6F` | Primary color |
| Purple Light | `#5B3A8C` | Hover states |
| Purple Dark | `#2A1050` | Active states |
| Gold | `#C4A747` | Accent/highlights |

---

*Not Merely for College Days Alone*
