# AI Catalog Agent - Installation Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**
- **Supabase Account** (free tier available)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-catalog-agent.git
cd ai-catalog-agent

# Install all dependencies (root, client, and server)
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

### 3. Database Setup

Follow the [Supabase Setup Guide](./supabase_setup_guide.md) to:
- Create Supabase project
- Run database migration
- Configure connection strings

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Start Development

```bash
# Start both client and server in development mode
npm run dev

# Or start individually:
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3000
```

## Package Dependencies Overview

### Server Dependencies

#### Core Framework
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `helmet` - Security middleware
- `compression` - Response compression
- `express-rate-limit` - Rate limiting

#### Database & ORM
- `@prisma/client` - Database ORM client
- `@supabase/supabase-js` - Supabase client library

#### Authentication & Security
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token handling
- `express-validator` - Input validation
- `joi` - Schema validation

#### AI Services
- `openai` - OpenAI GPT integration
- `@google/generative-ai` - Google Gemini integration
- `@anthropic-ai/sdk` - Anthropic Claude integration

#### File Upload & Processing
- `multer` - File upload middleware
- `sharp` - Image processing
- `cloudinary` - Cloud image storage
- `aws-sdk` - AWS S3 integration

#### Payment Processing
- `stripe` - Stripe payment integration
- `razorpay` - Razorpay payment integration

#### Email Services
- `nodemailer` - Email sending
- `@sendgrid/mail` - SendGrid integration

#### Utilities
- `axios` - HTTP client
- `uuid` - UUID generation
- `winston` - Logging
- `redis` / `ioredis` - Caching

### Client Dependencies

#### Core React
- `react` - React library
- `react-dom` - React DOM rendering
- `react-router-dom` - Client-side routing

#### State Management & Data Fetching
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `@supabase/supabase-js` - Supabase client

#### UI & Styling
- `tailwindcss` - Utility-first CSS framework
- `lucide-react` - Icon library
- `framer-motion` - Animation library
- `clsx` / `tailwind-merge` - Conditional styling

#### Forms & Validation
- `react-hook-form` - Form handling
- `react-hot-toast` - Toast notifications

#### Media & File Handling
- `react-dropzone` - Drag & drop file uploads
- `react-webcam` - Camera integration
- `html2canvas` - Screenshot generation
- `jspdf` - PDF generation
- `qrcode` - QR code generation

#### Voice & Speech
- `react-speech-recognition` - Speech recognition
- `regenerator-runtime` - Async/await support

#### Utilities
- `date-fns` - Date manipulation
- `axios` - HTTP client

## Available Scripts

### Root Level
```bash
npm run dev              # Start both client and server
npm run build            # Build both client and server
npm run test             # Run all tests
npm run lint             # Lint all workspaces
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run clean            # Clean all node_modules and dist folders
npm run install:all      # Install dependencies for all workspaces
```

### Server Scripts
```bash
npm run dev:server       # Start server in development mode
npm run start            # Start server in production mode
npm run test:server      # Run server tests
npm run db:migrate       # Run database migrations
npm run db:deploy        # Deploy migrations to production
npm run db:seed          # Seed database with sample data
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database (development only)
```

### Client Scripts
```bash
npm run dev:client       # Start client in development mode
npm run build:client     # Build client for production
npm run preview          # Preview production build
npm run test:client      # Run client tests
```

## Environment Variables Required

### Essential (Minimum to run)
- `DATABASE_URL` - Supabase database connection
- `JWT_SECRET` - JWT signing secret
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### AI Services (Choose at least one)
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

### Optional Features
- Image upload: `CLOUDINARY_*` or `AWS_*` variables
- Payments: `STRIPE_*` or `RAZORPAY_*` variables
- Email: `SENDGRID_*` or `SMTP_*` variables
- Shopify: `SHOPIFY_*` variables

## Troubleshooting

### Common Issues

1. **Node version mismatch**
   ```bash
   node --version  # Should be >= 18.0.0
   npm install -g npm@latest
   ```

2. **Prisma client not generated**
   ```bash
   npm run db:generate
   ```

3. **Port already in use**
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   # Or change PORT in .env
   ```

4. **Database connection issues**
   - Check Supabase credentials in `.env`
   - Verify IP whitelist in Supabase dashboard
   - Test connection: `npm run db:studio`

5. **Missing environment variables**
   ```bash
   # Check if .env exists and has required variables
   cat .env | grep -E "(DATABASE_URL|JWT_SECRET|SUPABASE_URL)"
   ```

### Development Tips

1. **Use separate terminals** for client and server during development
2. **Check logs** in both client and server terminals for errors
3. **Use Prisma Studio** to inspect database: `npm run db:studio`
4. **Test API endpoints** with tools like Postman or curl
5. **Enable verbose logging** by setting `DEBUG=ai-catalog:*` in .env

## Production Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
git push heroku main
```

### Environment Variables for Production
- Set all required environment variables in your hosting platform
- Use production database URL
- Set `NODE_ENV=production`
- Configure proper CORS origins

## Support

- Check the [Supabase Setup Guide](./supabase_setup_guide.md)
- Review the [Project Documentation](./README.md)
- Create an issue in the repository for bugs
- Check console logs for detailed error messages