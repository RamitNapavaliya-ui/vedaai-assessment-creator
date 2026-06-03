# VedaAI – AI Assessment Creator

> **Live Demo:** [Add your deployed URL here]  
> **GitHub:** [Add your repo URL here]

An AI-powered full-stack platform that lets teachers create structured question papers in seconds.

---

## Architecture

```
┌──────────────────────────────────────────┐
│           Frontend  (Next.js 14)         │
│   Zustand · WebSocket · Tailwind CSS     │
└─────────────────┬────────────────────────┘
                  │ REST + WebSocket
┌─────────────────▼────────────────────────┐
│          Backend  (Node + Express)        │
│   BullMQ · Redis · MongoDB · WebSocket   │
└──────────┬───────────────┬───────────────┘
           │               │
     ┌─────▼─────┐   ┌─────▼─────┐
     │  MongoDB  │   │   Redis   │
     │ (data)    │   │ (cache/q) │
     └───────────┘   └───────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Zustand, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Cache / Queue | Redis, BullMQ |
| Real-time | WebSocket (ws) |
| AI | OpenAI GPT-4o-mini (mock fallback included) |
| PDF | PDFKit (pure Node.js, no Chrome needed) |

## Features

- Assignment creation form with full validation
- PDF / TXT file upload for reference material
- AI-generated structured question papers (Sections A, B, C)
- Difficulty tagging per question (Easy / Moderate / Hard)
- Real-time generation progress via WebSocket
- BullMQ background job processing
- Redis caching of generated results
- PDF export (PDFKit)
- Regenerate action
- Assignment history page
- Mobile responsive UI
- Demo mode (works without OpenAI key)

## Local Setup

### Prerequisites
- Node.js 18+
- Docker Desktop (for MongoDB + Redis)

### 1. Start MongoDB and Redis
```bash
docker run -d -p 27017:27017 --name vedaai-mongo mongo:7
docker run -d -p 6379:6379 --name vedaai-redis redis:7-alpine
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env (optional, has demo mode)
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000**

## Environment Variables

**backend/.env**
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/vedaai
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Deployment

- **Frontend** → Vercel
- **Backend** → Railway / Render
- **MongoDB** → MongoDB Atlas (free tier)
- **Redis** → Upstash (free tier)
