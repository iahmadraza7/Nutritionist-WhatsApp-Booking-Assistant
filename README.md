# Nutritionist Hybrid Booking Chatbot

Hybrid booking system for a nutritionist clinic:

- public web chatbot for FAQs, booking, and rescheduling
- Google Calendar as the availability/source-of-truth layer
- WhatsApp used for automatic reminders and follow-ups
- medical questions redirected to the doctor instead of answered by AI

## Main Features

- **Public chat route** at `/chat`
- **Booking flow** with full name, WhatsApp number, service, date, time, and confirmation
- **Rescheduling flow** that finds future bookings by WhatsApp number
- **Medical escalation** on web chat with redirect to doctor WhatsApp/manual contact
- **Google Calendar sync** for create and reschedule operations
- **Admin panel** for clinic settings, services, FAQs, bookings, conversations, and follow-up templates
- **Flexible follow-up templates** with editable relative timing and placeholders

Supported placeholders in reminder/follow-up text:

- `{{patient_name}}`
- `{{appointment_date}}`
- `{{appointment_time}}`
- `{{service_name}}`

## Stack

- Next.js 14
- Prisma + PostgreSQL
- OpenAI API
- Google Calendar API
- WhatsApp Cloud API

## Quick Start

```bash
cd vakelien
npm install
Copy-Item .env.example .env
```

Set your real values in `.env`, especially:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Then initialize the database:

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

Run the app:

```bash
npm run dev
```

Run the scheduler in a second terminal:

```bash
npm run scheduler
```

## Routes

- Public chat: `http://localhost:3000/chat`
- Admin: `http://localhost:3000/admin`
- Demo alias: `http://localhost:3000/demo/chat`

Default admin login:

- Email: `admin@clinic.local`
- Password: `changeme123`

## Default Clinic Seed

The seed sets MVP-friendly defaults for this nutritionist use case:

- Monday-Friday: `15:00-19:00`
- Saturday/Sunday: closed
- Services:
  - First visit: `60 min`
  - Weighing: `20 min`
- Reminder template: `1 day before`
- Diet follow-up template: `5 days after`, first visit only

## Testing

```bash
npm test -- --runInBand
npm run build
```

## Security Notes

- Keep live API keys only in `.env`
- Do not store plaintext keys in repo files
- Revoke and regenerate any key that was previously shared in chat or copied into local text files

## Cost Notes

For a small clinic with around 40 patients/month, the system is designed to stay lightweight:

- a small number of OpenAI chat/classification calls
- one reminder plus optional follow-up per booking
- single Next.js app plus lightweight scheduler
