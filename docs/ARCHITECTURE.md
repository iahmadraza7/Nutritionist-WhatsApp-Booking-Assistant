# Nutritionist WhatsApp Booking Assistant - Architecture

## Overview

AI-powered WhatsApp assistant for a nutritionist that handles organizational questions, appointment booking, detects medical queries (handoff to doctor), and supports follow-up messages. Optimized for ~40 patients/month.

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WhatsApp       │────▶│  Next.js API      │────▶│  PostgreSQL     │
│  Cloud API      │     │  (Webhook)        │     │  (Prisma)       │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌───────────┐ ┌───────────┐ ┌──────────────┐
            │  OpenAI   │ │  Google   │ │  Cron Jobs   │
            │  (Intent) │ │  Calendar │ │  (Follow-up) │
            └───────────┘ └───────────┘ └──────────────┘
```

## Core Components

### 1. WhatsApp Webhook (`/api/webhooks/whatsapp`)
- Receives incoming messages from Meta
- Validates webhook signature
- Persists messages to DB
- Triggers conversation engine

### 2. Conversation Engine (`lib/conversation/`)
- Routes each message through intent classification
- Manages booking state machine
- Handles handoff detection
- Orchestrates responses

### 3. Intent Classifier (`lib/ai/intent-classifier.ts`)
- Labels: ORGANIZATIONAL, BOOK_APPOINTMENT, CHECK_BOOKING, RESCHEDULE_BOOKING, CANCEL_BOOKING, MEDICAL_QUERY, HUMAN_HANDOFF, OTHER
- Rule-based first pass + LLM fallback
- Conservative medical detection (when unsure → MEDICAL_QUERY)

### 4. Booking State Machine (`lib/booking/state-machine.ts`)
- States: idle, awaiting_name, awaiting_service, awaiting_date, awaiting_time, awaiting_confirmation, booked, handoff
- One question at a time
- Google Calendar integration for availability

### 5. Google Calendar Service (`lib/calendar/`)
- List availability
- Create booking events
- Single clinic calendar for MVP

### 6. Follow-up Scheduler (`lib/scheduler/`)
- node-cron for scheduled jobs
- Templates: reminder 24h before, 2h before, 1 day after, 3 days after
- Stored in ScheduledMessage table

### 7. Admin Panel (`/app/admin/`)
- Clinic config, FAQs, services, business hours
- Conversation list, booking list
- Handoff toggle, follow-up templates
- No doctor chat UI - manual reply stays on WhatsApp Business

## Data Flow

1. **Incoming WhatsApp** → Webhook validates → Message stored → Conversation engine
2. **Engine** → Check handoff status → If handoff: no auto-reply
3. **Engine** → Intent classification → Route to handler
4. **Organizational** → Inject clinic config → OpenAI response → Send WhatsApp
5. **Booking** → State machine → Collect data → Calendar check → Create event → Confirm
6. **Medical** → Set handoff → Send "The doctor will reply to you shortly." → Stop

## Security

- Webhook signature validation (Meta)
- Admin auth (simple session)
- Input sanitization
- Secrets in env
- Basic rate limiting on webhook

## Cost Optimization

- Single Next.js app (no microservices)
- Standard OpenAI API (no embeddings/RAG)
- Lightweight cron (no Redis/queue)
- PostgreSQL (no vector DB)
- VPS-friendly Docker deployment
