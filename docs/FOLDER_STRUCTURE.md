# Folder Structure

```
vakelien/
├── app/
│   ├── admin/                 # Admin panel
│   │   ├── login/             # Login page
│   │   ├── conversations/     # Conversation list & detail
│   │   ├── bookings/          # Booking list
│   │   ├── settings/          # Clinic & services config
│   │   ├── follow-ups/        # Follow-up templates
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/              # Login, logout
│   │   ├── admin/             # Admin CRUD APIs
│   │   └── webhooks/
│   │       └── whatsapp/      # WhatsApp webhook
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── ai/
│   │   ├── intent-classifier.ts
│   │   └── organizational-response.ts
│   ├── booking/
│   │   └── state-machine.ts
│   ├── calendar/
│   │   └── google-calendar.ts
│   ├── conversation/
│   │   └── engine.ts
│   ├── whatsapp/
│   │   └── client.ts
│   ├── auth.ts
│   ├── config.ts
│   ├── db.ts
│   └── types.ts
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   └── scheduler.ts
├── __tests__/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```
