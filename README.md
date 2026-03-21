# Digital Catalog Agent 🛍️

> Final Year Project / Design Lab — *Work in Progress*

An AI-powered digital catalog platform built for small and local retailers in India. The idea is simple: a shopkeeper should be able to create a professional product catalog just by speaking in their own language — no typing, no technical knowledge required.

---

## The Idea

Most small businesses in India don't have an online presence. The barriers are real — language, digital literacy, and the complexity of existing tools. This project tackles that by combining voice input, AI-generated product listings, and a shareable catalog link that works on any device.

This is my original idea, designed and built as part of my **Design Lab / Final Year Project**. Still actively being developed.

---

## Features

- Voice input in 6 Indian languages — Hindi, Tamil, Telugu, Kannada, Bengali, English
- AI-generated product name, description, and category from voice or text
- Camera/image input with AI analysis
- Shareable public catalog link for customers
- Multi-language UI across all pages
- Payment settings — UPI, bank details, QR code, WhatsApp contact
- Export catalog to seller platforms
- Voice command navigation throughout the app
- Mobile-first design

---

## Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS
- React Router

**Backend**
- Vercel Serverless Functions (Node.js)
- Supabase (PostgreSQL)
- JWT authentication

**AI**
- Google Gemini API
- Perplexity API (fallback)

**Deployment**
- Vercel (frontend + API)
- Supabase (database)

---

## Project Structure

```
AI-Catalog-Agent/
├── client/          # React frontend
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── hooks/
├── api/             # Vercel serverless functions
│   ├── auth/
│   ├── products/
│   ├── ai/
│   ├── payment/
│   └── _lib/        # Shared db + auth utilities
└── server/          # Express server (local dev)
    └── prisma/      # DB schema
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- Gemini API key

### Environment Variables

Create a `.env` file in `client/`:
```
VITE_API_URL=/api
```

Set these in Vercel (or a root `.env` for local):
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
```

### Run Locally

```bash
# Install dependencies
npm install

# Start frontend
cd client && npm run dev

# Start API server
cd server && npm run dev
```

---

## Status

🚧 **Actively in development** — new features and improvements are being added regularly.

---

## Author

**Dev Anand M**  
Final Year Student — Design Lab / Capstone Project  
