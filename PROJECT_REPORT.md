# Digital Catalog Agent - Comprehensive Project Report

## Project Overview

**Digital Catalog Agent** is a full-stack web application designed to help small Indian retailers and artisans create professional digital product catalogs using voice input in their local languages. The application leverages AI to generate product descriptions, making it accessible to users with limited digital literacy.

### Team
- **Dev Anand**
- **Hemanth**
- **Dhanushree**

### Contact
- Email: p3ace.2.life@gmail.com

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution](#solution)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Features](#features)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Multi-Language Support](#multi-language-support)
9. [Voice Command System](#voice-command-system)
10. [AI Integration](#ai-integration)
11. [Deployment](#deployment)
12. [Project Structure](#project-structure)
13. [Installation & Setup](#installation--setup)
14. [Future Enhancements](#future-enhancements)

---

## Problem Statement

Small businesses in India face significant barriers to going digital:

### 1. Low Digital Skills
Many shopkeepers find technology confusing. Complex apps and forms are overwhelming for users who are not tech-savvy.

### 2. Language Barriers
Most digital tools are in English, excluding millions of users who prefer local languages like Hindi, Tamil, Telugu, Kannada, Bengali, etc.

### 3. No Online Presence
Without a digital catalog, businesses miss opportunities to reach new customers online and expand their market reach.

---

## Solution

Digital Catalog Agent addresses these challenges through:

### Voice-First Approach
- No typing or technical knowledge required
- Users can describe products by speaking in their native language
- AI converts voice input into professional product listings

### Multi-Language Support
Full support for 6 Indian languages:
- English
- Hindi (हिंदी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Bengali (বাংলা)

### AI-Powered Product Generation
- Automatic product name, description, and category generation
- Price suggestions based on product type
- Works with voice input in any supported language

### Shareable Catalogs
- Generate unique catalog links for each seller
- Share on WhatsApp, Facebook, or any platform
- Customers can view products and contact sellers directly

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| React Router DOM | 6.21.0 | Client-side routing |
| Vite | 5.0.8 | Build tool & dev server |
| Tailwind CSS | 3.3.6 | Styling framework |
| Axios | 1.6.2 | HTTP client |
| Lucide React | 0.294.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime environment |
| Express | 4.18.2 | Web framework |
| Prisma | 5.7.0 | ORM & database toolkit |
| PostgreSQL | - | Database (via Supabase) |
| JWT | 9.0.2 | Authentication |
| bcrypt | 5.1.1 | Password hashing |
| Multer | 1.4.5 | File uploads |

### AI & External Services
| Service | Purpose |
|---------|---------|
| Perplexity AI (Sonar model) | Product description generation, voice command interpretation |
| Web Speech API | Browser-based speech recognition |
| Speech Synthesis API | Text-to-speech for accessibility |

### Deployment
| Platform | Purpose |
|----------|---------|
| Vercel | Frontend hosting & serverless functions |
| Supabase | PostgreSQL database hosting |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │ Components  │  │      Context            │ │
│  │ - Landing   │  │ - VoiceInput│  │ - AuthContext           │ │
│  │ - Dashboard │  │ - VoiceCmd  │  │ - LanguageContext       │ │
│  │ - AddProduct│  │ - UI        │  │   (6 languages)         │ │
│  │ - EditProd  │  │ - Layout    │  └─────────────────────────┘ │
│  │ - Payment   │  │ - Protected │                              │
│  │ - Export    │  │   Route     │                              │
│  │ - PublicCat │  └─────────────┘                              │
│  └─────────────┘                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS FUNCTIONS                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ /api/auth   │  │ /api/products│ │ /api/ai                 │ │
│  │ - signup    │  │ - CRUD ops  │  │ - generate-product      │ │
│  │ - login     │  │             │  │ - parse-voice-update    │ │
│  │ - me        │  │             │  │ - interpret-command     │ │
│  └─────────────┘  └─────────────┘  │ - chat                  │ │
│  ┌─────────────┐  ┌─────────────┐  │ - read-page             │ │
│  │/api/payment │  │/api/catalog │  └─────────────────────────┘ │
│  │ - get/save  │  │ - public    │                              │
│  └─────────────┘  └─────────────┘                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│    SUPABASE (PostgreSQL)│    │    PERPLEXITY AI        │
│  ┌───────────────────┐  │    │  ┌───────────────────┐  │
│  │ Users             │  │    │  │ Sonar Model       │  │
│  │ Products          │  │    │  │ - Text generation │  │
│  │ PaymentSettings   │  │    │  │ - Command parsing │  │
│  └───────────────────┘  │    │  └───────────────────┘  │
└─────────────────────────┘    └─────────────────────────┘
```

---

## Features

### 1. User Authentication
- Email/password registration and login
- JWT-based session management
- Protected routes for authenticated users
- Automatic token refresh and logout on expiry

### 2. Product Management
- Create products using voice or text input
- AI-generated product names, descriptions, and categories
- Image upload support (Base64 encoding)
- Edit and delete products
- Product categorization (Grocery, Clothing, Handicraft, Electronics, Other)

### 3. Voice Input System
- Browser-based speech recognition (Web Speech API)
- Support for 6 Indian languages
- Real-time transcription display
- Voice-to-text for product descriptions

### 4. Voice Command Navigation
- Global voice commands for app navigation
- Commands work in all 6 supported languages
- Mixed language support (Hinglish, Tanglish, etc.)
- Commands include:
  - "Dashboard" / "डैशबोर्ड" / "டாஷ்போர்டு"
  - "Add product" / "उत्पाद जोड़ो" / "பொருள் சேர்"
  - "Export" / "निर्यात" / "ஏற்றுமதி"
  - "Payment" / "भुगतान" / "கட்டணம்"
  - "Read page" (accessibility feature)
  - "Help" for command list

### 5. Voice Product Editing
- Update product fields using voice commands
- "Update price to 500" / "Price 200 rupees karo"
- "Change category to clothing"
- "Save" / "Cancel" commands in all languages
- Special handling for Tamil speech recognition quirks ("cancel" → "cancer")

### 6. Payment Settings
- Multiple UPI ID support
- Bank account details (Account Name, Number, IFSC, Bank Name)
- QR code upload for payments
- WhatsApp contact number for customer inquiries

### 7. Public Catalog
- Shareable catalog links (`/catalog/:userId`)
- Product grid with images and details
- Product detail modal with full information
- WhatsApp contact button with pre-filled message
- Payment options display (UPI, Bank, QR)

### 8. Export to Platforms
- Shareable catalog link generation
- Export formats for:
  - Amazon Seller Central
  - Flipkart Seller Hub
  - Google Shopping
  - WhatsApp Business

### 9. Accessibility Features
- Voice commands for navigation
- "Read Page" feature for visually impaired users
- Text-to-speech responses
- High contrast UI elements
- Screen reader compatible

### 10. AI Voice Assistant
- Conversational AI for help and guidance
- Context-aware responses based on current page
- Markdown-free, concise responses
- Auto-dismiss feedback with read time calculation

---

## Database Schema

### Prisma Schema (PostgreSQL)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id              Int              @id @default(autoincrement())
  name            String
  email           String           @unique
  passwordHash    String
  createdAt       DateTime         @default(now())
  products        Product[]
  paymentSettings PaymentSettings?
}

model Product {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String
  category    String
  price       Float
  language    String
  imageUrl    String?
  createdAt   DateTime @default(now())
}

model PaymentSettings {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  upiData       String?  // JSON string for UPI array
  bankAccount   String?  // JSON string for bank details
  qrCodeUrl     String?  // Base64 or URL for QR code
  phoneNumber   String?  // WhatsApp contact number
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
}
```

### Entity Relationships

```
User (1) ──────────── (N) Product
  │
  └──────────────────── (1) PaymentSettings
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth?action=signup` | Register new user |
| POST | `/api/auth?action=login` | User login |
| GET | `/api/auth?action=me` | Get current user |

### Products (`/api/products`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List user's products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Payment (`/api/payment`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment` | Get payment settings |
| PUT | `/api/payment` | Save payment settings |

### Public Catalog (`/api/catalog`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalog/:userId` | Get public catalog |

### AI (`/api/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai?action=generate-product` | Generate product details from description |
| POST | `/api/ai?action=parse-voice-update` | Parse voice command for product update |
| POST | `/api/ai?action=interpret-command` | Interpret navigation command |
| POST | `/api/ai?action=chat` | AI chat assistant |
| POST | `/api/ai?action=read-page` | Generate page description for accessibility |

### Demo (`/api/demo`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demo/products` | Get demo products |

---

## Multi-Language Support

### Supported Languages

| Code | Language | Script | Speech Code |
|------|----------|--------|-------------|
| en | English | Latin | en-IN |
| hi | Hindi | Devanagari | hi-IN |
| ta | Tamil | Tamil | ta-IN |
| te | Telugu | Telugu | te-IN |
| kn | Kannada | Kannada | kn-IN |
| bn | Bengali | Bengali | bn-IN |

### Translation Coverage

The application includes translations for:
- Navigation elements
- Landing page content
- Dashboard UI
- Product forms
- Payment settings
- Voice command feedback
- Error messages
- Accessibility features

### Language Context Implementation

```javascript
// LanguageContext.jsx
const translations = {
  en: { /* 200+ translation keys */ },
  hi: { /* Hindi translations */ },
  ta: { /* Tamil translations */ },
  te: { /* Telugu translations */ },
  kn: { /* Kannada translations */ },
  bn: { /* Bengali translations */ }
};

// Usage in components
const { t, language, setLanguage } = useLanguage();
<h1>{t('hero_title')}</h1>
```

---

## Voice Command System

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VoiceCommandButton                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Mic Button  │  │ Quick       │  │ Help Panel          │ │
│  │ (Start/Stop)│  │ Actions     │  │ (Command List)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              useVoiceCommands Hook                   │   │
│  │  - Speech Recognition (Web Speech API)              │   │
│  │  - Command Matching (local patterns)                │   │
│  │  - AI Fallback (Perplexity)                        │   │
│  │  - Text-to-Speech (Speech Synthesis API)           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Command Categories

#### Navigation Commands
```javascript
const commands = {
  dashboard: ['dashboard', 'catalog', 'my products', 'डैशबोर्ड', 'டாஷ்போர்டு', ...],
  addProduct: ['add product', 'new product', 'उत्पाद जोड़ो', 'பொருள் சேர்', ...],
  export: ['export', 'publish', 'निर्यात', 'ஏற்றுமதி', ...],
  payment: ['payment', 'bank', 'upi', 'भुगतान', 'கட்டணம்', ...],
  // ... more commands
};
```

#### Product Update Commands (Edit Page)
```javascript
const saveCommands = [
  'save', 'done', 'finish', 'ok',
  'சேவ் பண்ணு', 'சேமி', // Tamil
  'सेव करो', 'हो गया', // Hindi
  // ... all 6 languages
];

const cancelCommands = [
  'cancel', 'back', 'exit',
  'கேன்சல் பண்ணு', 'கேன்சர் பண்ணு', // Tamil (including "cancer" variant)
  'कैंसल करो', 'वापस जाओ', // Hindi
  // ... all 6 languages
];
```

### Speech Recognition Quirks

Tamil speech recognition has a known issue where "cancel" is transcribed as "cancer" (கேன்சர்). The system handles this by including both variants in the cancel command list.

---

## AI Integration

### Perplexity AI (Sonar Model)

#### Configuration
```javascript
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const response = await fetch(PERPLEXITY_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.7
  })
});
```

### AI Functions

#### 1. Product Generation
- Input: Product description in any language
- Output: JSON with name, description, category, price, unit
- Handles Indian language scripts (Tamil, Hindi, etc.)

#### 2. Voice Command Parsing
- Input: Voice transcript + current product state
- Output: Action (update/save/cancel), field, value
- Local pattern matching first, AI fallback

#### 3. Navigation Command Interpretation
- Input: Voice transcript
- Output: Action name + confidence score
- Maps to app routes

#### 4. Chat Assistant
- Input: User question + page context
- Output: Concise, markdown-free response
- Limited to app-related queries

#### 5. Page Reader (Accessibility)
- Input: Page content + page name
- Output: Detailed page description for screen readers
- Pre-defined descriptions for common pages

---

## Deployment

### Vercel Configuration

```json
// client/vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment Variables

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres.[project]:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project]:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# AI
PERPLEXITY_API_KEY="pplx-..."
```

### Deployment Steps

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set root directory to `client`
4. Configure environment variables in Vercel dashboard
5. Deploy

### Database Migration (Supabase)

For new columns (e.g., phoneNumber):
```sql
ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
```

---

## Project Structure

```
digital-catalog-agent/
├── .kiro/
│   └── specs/
│       └── digital-catalog-landing/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── api/                          # Vercel serverless functions
│   ├── _lib/
│   │   ├── auth.js              # JWT utilities
│   │   └── db.js                # Prisma client
│   ├── ai/
│   │   ├── chat.js
│   │   ├── generate-product.js
│   │   ├── interpret-command.js
│   │   ├── parse-voice-update.js
│   │   └── read-page.js
│   ├── auth/
│   │   ├── login.js
│   │   ├── me.js
│   │   └── signup.js
│   ├── catalog/
│   │   └── [userId].js
│   ├── demo/
│   │   └── products.js
│   ├── payment/
│   │   └── index.js
│   ├── products/
│   │   ├── [id].js
│   │   └── index.js
│   ├── health.js
│   └── package.json
├── client/
│   ├── api/                      # Duplicate for Vercel deployment
│   ├── prisma/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios API client
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Container.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── index.js
│   │   │   ├── ui/
│   │   │   │   ├── Alert.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Select.jsx
│   │   │   │   └── index.js
│   │   │   ├── LanguageSelector.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── VoiceCommandButton.jsx
│   │   │   └── VoiceInput.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── LanguageContext.jsx
│   │   ├── hooks/
│   │   │   └── useVoiceCommands.js
│   │   ├── pages/
│   │   │   ├── AddProduct.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Demo.jsx
│   │   │   ├── EditProduct.jsx
│   │   │   ├── ExportCatalog.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PaymentSettings.jsx
│   │   │   ├── PublicCatalog.jsx
│   │   │   └── Signup.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
├── server/                       # Local development server
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   │   ├── ai.js
│   │   │   ├── auth.js
│   │   │   ├── catalog.js
│   │   │   ├── demo.js
│   │   │   ├── payment.js
│   │   │   └── products.js
│   │   └── index.js
│   ├── tests/
│   │   ├── ai.property.test.js
│   │   ├── auth.property.test.js
│   │   ├── cascade.property.test.js
│   │   ├── products.property.test.js
│   │   └── setup.js
│   ├── uploads/
│   ├── .env
│   ├── jest.config.js
│   └── package.json
├── node_modules/
├── .env.example
├── .env.vercel
├── .gitignore
├── package.json
├── package-lock.json
├── Procfile
└── PROJECT_REPORT.md
```

---

## Installation & Setup

### Prerequisites
- Node.js ≥ 18.0.0
- npm or yarn
- PostgreSQL database (or Supabase account)
- Perplexity AI API key

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd digital-catalog-agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create `server/.env`:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PERPLEXITY_API_KEY="pplx-..."
```

4. **Run database migrations**
```bash
npm run db:migrate
```

5. **Start development servers**
```bash
npm run dev
```

This starts both:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Production Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set root directory: `client`
4. Add environment variables
5. Deploy

---

## Future Enhancements

### Planned Features

1. **Razorpay Integration**
   - Payment links for direct transactions
   - UPI intent for seamless payments

2. **Image Recognition**
   - Auto-generate product details from photos
   - Category detection from images

3. **Inventory Management**
   - Stock tracking
   - Low stock alerts

4. **Analytics Dashboard**
   - Catalog views
   - Popular products
   - Customer engagement metrics

5. **Direct Platform Integration**
   - One-click publish to Amazon, Flipkart
   - API-based catalog sync

6. **Offline Support**
   - Progressive Web App (PWA)
   - Offline product creation
   - Background sync

7. **Multi-Store Support**
   - Multiple catalogs per user
   - Store branding options

---

## Conclusion

Digital Catalog Agent successfully addresses the digital divide faced by small Indian retailers by providing:

- **Accessibility**: Voice-first approach eliminates typing barriers
- **Localization**: Full support for 6 Indian languages
- **AI Assistance**: Intelligent product description generation
- **Simplicity**: Clean, mobile-first UI design
- **Shareability**: Easy catalog sharing via WhatsApp and social media

The application demonstrates how modern web technologies combined with AI can create inclusive digital tools that empower small businesses to establish their online presence.

---

*Report generated: December 22, 2024*
*Version: 1.0.0*
