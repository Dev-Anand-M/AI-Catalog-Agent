# Google Gemini API Setup

The app now supports Google Gemini as a fallback AI provider when Perplexity is unavailable.

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Adding to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (starts with `AIza...`)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your app for changes to take effect

## How It Works

The app tries AI providers in this order:
1. **Perplexity** (primary) - if `PERPLEXITY_API_KEY` is set
2. **Gemini** (fallback) - if Perplexity fails or key is missing

You can use either one or both API keys. Having both provides redundancy.

## Free Tier Limits

**Gemini 1.5 Flash (Free)**:
- 15 requests per minute
- 1 million requests per day
- 1,500 requests per day (free tier)

This is more than enough for a small retail catalog app!

## Testing

After adding the key, test by:
1. Creating a new product with voice/text
2. Using voice commands on edit page
3. Checking the AI chat assistant

The app will automatically use Gemini if Perplexity is unavailable.
