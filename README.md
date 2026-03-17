#   

AI-powered WhatsApp assistant for a nutritionist: handles organizational questions, appointment booking, medical query detection (handoff to doctor), and follow-up messages.

## Features

- **Organizational FAQs**: Opening hours, location, prices, booking info
- **Appointment booking**: Multi-step flow with Google Calendar sync
- **Medical query detection**: Stops AI, sends "The doctor will reply to you shortly."
- **Handoff mode**: Doctor continues manually from WhatsApp Business
- **Follow-up messages**: Reminders and post-visit check-ins
- **Admin panel**: Clinic settings, conversations, bookings, follow-up templates

## Prerequisites

- Node.js 20+
- PostgreSQL
- Meta WhatsApp Business API account
- OpenAI API key
- Google Cloud project with Calendar API

## Quick Start

### 1. Clone and install

```bash
cd vakelien
npm install
```

### 2. Environment

```bash
# Windows PowerShell:
Copy-Item .env.example .env

# Mac/Linux:
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nutritionist_booking?schema=public"`

### 3. Database (PostgreSQL required)

**Option A – Docker (recommended if you have Docker):**
```bash
npm run db:start
```

When the DB is up, apply schema changes and seed:
```bash
npx prisma generate
npm run db:push
npm run db:seed
```

**Option B – Full docker-compose:**
```bash
docker-compose up -d db
```

**Option C – Local PostgreSQL:** Start your PostgreSQL service and ensure it listens on port 5432.

Then:
```bash
npm run db:push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Admin: http://localhost:3000/admin  
Login: `admin@clinic.local` / `changeme123` (change in seed or env)

### 5. Scheduler (follow-ups)

In a separate terminal:

```bash
npm run scheduler
```

## WhatsApp Setup

1. Create a Meta Business account and WhatsApp Business API app
2. Get Phone Number ID and Access Token
3. Set webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
4. Verify token: use `WHATSAPP_VERIFY_TOKEN` from .env
5. Subscribe to `messages` webhook

## Google Calendar Setup

1. Create a Google Cloud project
2. Enable Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Use OAuth Playground to get refresh token:
   - https://developers.google.com/oauthplayground
   - Scope: `https://www.googleapis.com/auth/calendar`
5. Set `GOOGLE_CALENDAR_ID` (e.g. `primary` or your calendar ID)

## Demo Flows

1. **Organizational**: "Quali sono gli orari?" → Bot answers from clinic config
2. **Booking**: "Voglio prenotare" → Bot collects name, service, date, time → Confirms
3. **Medical**: "Che dieta per il diabete?" → "Il dottore le risponderà a breve." + handoff
4. **Follow-up**: Scheduler creates reminders 24h/2h before, 1d/3d after appointments

## Project Structure

```
/app
  /admin          - Admin panel pages
  /api            - API routes (webhooks, auth, admin)
/components       - (optional)
/lib
  /ai             - Intent classification, organizational response
  /booking        - State machine
  /calendar       - Google Calendar
  /conversation   - Engine
  /whatsapp       - Client
/prisma           - Schema, migrations, seed
/scripts          - Scheduler
/docs             - Architecture
```

## Docker

```bash
docker-compose up -d
```

Runs app on :3000, scheduler, PostgreSQL on :5432.

## Cost Optimization

- Single Next.js app
- gpt-4o-mini for classification/responses
- No vector DB, no RAG
- Lightweight cron for follow-ups
- VPS-friendly (see DEPLOYMENT.md)
