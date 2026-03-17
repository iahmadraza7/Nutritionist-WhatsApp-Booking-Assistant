# Deployment Guide - Low-Cost VPS

## Target: ~40 patients/month

Recommended: **Hetzner** or **DigitalOcean** small VPS (~€4-6/month).

## Option 1: Docker on VPS

### 1. Server setup

```bash
# Ubuntu 22.04
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

### 2. Deploy

```bash
git clone <repo> /opt/nutritionist-bot
cd /opt/nutritionist-bot
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

### 3. Reverse proxy (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use Let's Encrypt for HTTPS (required for WhatsApp webhook).

### 4. Environment

- `DATABASE_URL`: PostgreSQL (Docker or managed)
- `WHATSAPP_*`: From Meta Developer Console
- `OPENAI_API_KEY`: From OpenAI
- `GOOGLE_CALENDAR_*`: From Google Cloud
- `NEXTAUTH_SECRET`: `openssl rand -hex 32`

## Option 2: Railway / Render (no VPS)

- **Railway**: Connect repo, add PostgreSQL, set env vars. ~$5/month.
- **Render**: Similar. Free tier for PostgreSQL, paid for web service.

## Option 3: Single VPS without Docker

```bash
# Install Node 20, PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs postgresql -y

# Create DB
sudo -u postgres createdb nutritionist_booking
sudo -u postgres createuser -P nutritionist

# Deploy
cd /opt/nutritionist-bot
npm install
npm run build
npx prisma migrate deploy
npm run db:seed

# Run with PM2
npm install -g pm2
pm2 start npm --name "app" -- start
pm2 start npm --name "scheduler" -- run scheduler
pm2 save && pm2 startup
```

## WhatsApp Webhook

1. Meta App Dashboard → WhatsApp → Configuration
2. Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
3. Verify Token: same as `WHATSAPP_VERIFY_TOKEN`
4. Subscribe: `messages`

## Cost Estimate (monthly)

| Item              | Cost      |
|-------------------|-----------|
| VPS (1GB RAM)     | €4-6      |
| PostgreSQL        | Included  |
| OpenAI (~40 conv) | ~$2-5     |
| WhatsApp API      | Free*     |
| **Total**         | **~€10**  |

*WhatsApp: free for first 1000 conversations/month.

## Monitoring

- Check `/admin` dashboard for conversations, bookings
- Logs: `docker-compose logs -f app` or `pm2 logs`
- Ensure scheduler is running for follow-ups
