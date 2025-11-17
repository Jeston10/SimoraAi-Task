# 🔌 Integration Guide - Step-by-Step Setup

## Overview

This guide will walk you through setting up all required and optional integrations for your Remotion Captioning Platform.

---

## 📋 Quick Checklist

### Required (Must Have)
- [ ] OpenAI API Key
- [ ] Create `.env.local` file

### Recommended (For Production)
- [ ] Vercel Blob Storage
- [ ] Vercel Account (for deployment)

### Optional (Nice to Have)
- [ ] Sentry (Error Tracking)
- [ ] Analytics (Google Analytics, etc.)

---

## 🔴 Step 1: OpenAI API Key (REQUIRED)

### Why You Need It
- Required for caption generation using Whisper API
- Without this, caption generation will not work

### How to Get It

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/
   - Sign up or log in

2. **Navigate to API Keys**
   - Click on your profile (top right)
   - Select "View API keys"
   - Or go directly to: https://platform.openai.com/api-keys

3. **Create New API Key**
   - Click "Create new secret key"
   - Give it a name (e.g., "Remotion Captioning")
   - **IMPORTANT**: Copy the key immediately - you won't see it again!
   - Format: `sk-...` (starts with `sk-`)

4. **Add Credits (If Needed)**
   - Go to: https://platform.openai.com/account/billing
   - Add payment method
   - Add credits (minimum $5 recommended)
   - Whisper API pricing: ~$0.006 per minute of audio

### Add to Project

1. **Create `.env.local` file** (if it doesn't exist)
   ```bash
   # In your project root directory
   touch .env.local
   ```

2. **Add the API key**
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Verify**
   - Make sure the file is named exactly `.env.local`
   - Make sure it's in the project root (same folder as `package.json`)
   - Make sure there are no spaces around the `=` sign
   - Make sure the key starts with `sk-`

---

## 🔵 Step 2: Vercel Blob Storage (RECOMMENDED)

### Why You Need It
- Stores uploaded video files
- Required for production deployment
- Without this, videos use placeholder URLs (development only)

### How to Set It Up

#### Option A: If Deploying to Vercel

1. **Create Vercel Account**
   - Visit: https://vercel.com/
   - Sign up (free tier available)
   - Connect your GitHub account (recommended)

2. **Create a New Project**
   - Click "Add New" → "Project"
   - Import your repository
   - Or create a new project

3. **Create Blob Storage**
   - In your Vercel project dashboard
   - Go to "Storage" tab
   - Click "Create Database"
   - Select "Blob"
   - Name it (e.g., "video-storage")
   - Select region (choose closest to your users)
   - Click "Create"

4. **Get Storage Token**
   - Go to Storage settings
   - Click on your blob storage
   - Go to "Settings" tab
   - Copy the "Token" (starts with `vercel_blob_`)
   - Format: `vercel_blob_rw_...`

5. **Add to Environment Variables**
   - In Vercel project dashboard
   - Go to "Settings" → "Environment Variables"
   - Add new variable:
     - Name: `VERCEL_BLOB_STORAGE_TOKEN`
     - Value: `vercel_blob_rw_...` (your token)
     - Environment: Production, Preview, Development (select all)
   - Click "Save"

#### Option B: For Local Development

1. **Get Token from Vercel Dashboard**
   - Follow steps 1-4 from Option A
   - Copy the token

2. **Add to `.env.local`**
   ```env
   VERCEL_BLOB_STORAGE_TOKEN=vercel_blob_rw_your-token-here
   ```

### Verify Setup

1. **Check Storage Status**
   - The app will log storage status on startup
   - Look for: "File uploaded successfully" in logs

2. **Test Upload**
   - Upload a test video
   - Check Vercel dashboard → Storage → Your blob
   - You should see the uploaded file

---

## 🟡 Step 3: Sentry (Error Tracking) - OPTIONAL

### Why You Need It
- Track errors in production
- Monitor application health
- Get alerts for critical issues

### How to Set It Up

1. **Create Sentry Account**
   - Visit: https://sentry.io/
   - Sign up (free tier available)
   - Verify your email

2. **Create a New Project**
   - Click "Create Project"
   - Select "Next.js" as platform
   - Give it a name (e.g., "Remotion Captioning")
   - Click "Create Project"

3. **Get DSN (Data Source Name)**
   - After creating project, you'll see setup instructions
   - Copy the DSN
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

4. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs
   ```

5. **Run Sentry Wizard** (Recommended)
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   - This will automatically configure Sentry for Next.js
   - Follow the prompts
   - It will ask for your DSN

6. **Manual Setup (If not using wizard)**
   
   Add to `.env.local`:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

   Update `lib/monitoring.ts`:
   - Uncomment the Sentry import and initialization code
   - Follow Sentry Next.js documentation

7. **Verify Setup**
   - Deploy or run in production mode
   - Check Sentry dashboard for events
   - Test by triggering an error

---

## 🟢 Step 4: Analytics (OPTIONAL)

### Google Analytics 4

1. **Create Google Analytics Account**
   - Visit: https://analytics.google.com/
   - Sign up
   - Create a new property
   - Get your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Add to Project**
   - Install: `npm install @next/third-parties`
   - Add to `app/layout.tsx`:
   ```tsx
   import { GoogleAnalytics } from '@next/third-parties/google'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <GoogleAnalytics gaId="G-XXXXXXXXXX" />
         </body>
       </html>
     )
   }
   ```

3. **Add to `.env.local`** (optional)
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

### Other Analytics Options
- Mixpanel
- Amplitude
- PostHog
- Custom analytics

See `lib/monitoring.ts` for integration examples.

---

## 📝 Complete `.env.local` Template

Create a file named `.env.local` in your project root with:

```env
# ============================================
# REQUIRED - Must have for basic functionality
# ============================================

# OpenAI API Key for Whisper (Speech-to-Text)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================
# RECOMMENDED - For production deployment
# ============================================

# Vercel Blob Storage Token
# Get from: Vercel Dashboard > Storage > Your Blob > Settings
VERCEL_BLOB_STORAGE_TOKEN=vercel_blob_rw_your-token-here

# ============================================
# OPTIONAL - For enhanced features
# ============================================

# Sentry DSN for error tracking
# Get from: https://sentry.io/ > Your Project > Settings > Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Logging Configuration
# Options: debug, info, warn, error
# Default: debug (development), info (production)
LOG_LEVEL=info

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## ✅ Verification Steps

### 1. Verify Environment Variables

**Check if `.env.local` exists:**
```bash
# In project root
ls -la .env.local  # Linux/Mac
dir .env.local     # Windows
```

**Verify file contents:**
- Make sure `OPENAI_API_KEY` is set
- Make sure it starts with `sk-`
- No spaces around `=`
- No quotes around values (unless needed)

### 2. Test OpenAI API Key

```bash
# Test the API key (replace with your key)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key-here"
```

If successful, you'll see a JSON response with models.

### 3. Test Application

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Check Console for Errors**
   - Should see: "Starting video upload" (when uploading)
   - Should NOT see: "OPENAI_API_KEY is not configured"

3. **Test Upload**
   - Upload a test MP4 video
   - Should upload successfully

4. **Test Caption Generation**
   - Generate captions for uploaded video
   - Should generate captions successfully

### 4. Verify Storage (If Configured)

1. **Check Logs**
   - Look for: "File uploaded successfully"
   - Should NOT see: "VERCEL_BLOB_STORAGE_TOKEN not configured"

2. **Check Vercel Dashboard**
   - Go to Storage → Your blob
   - Should see uploaded files

---

## 🚨 Troubleshooting

### Issue: "OPENAI_API_KEY is not configured"

**Solutions:**
1. Check `.env.local` file exists in project root
2. Check the key is named exactly `OPENAI_API_KEY`
3. Check there are no spaces: `OPENAI_API_KEY=sk-...` (not `OPENAI_API_KEY = sk-...`)
4. Restart the dev server after adding the key
5. Make sure the key starts with `sk-`

### Issue: "VERCEL_BLOB_STORAGE_TOKEN not configured"

**Solutions:**
1. This is OK for development (uses placeholder URLs)
2. For production, add the token to `.env.local`
3. Check token format: `vercel_blob_rw_...`
4. Restart dev server after adding

### Issue: Environment variables not loading

**Solutions:**
1. Make sure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
2. Make sure it's in project root (same folder as `package.json`)
3. Restart the dev server
4. Clear Next.js cache: `rm -rf .next` then restart

### Issue: API key invalid

**Solutions:**
1. Verify key at: https://platform.openai.com/api-keys
2. Check if you have credits: https://platform.openai.com/account/billing
3. Make sure you copied the full key (starts with `sk-`)
4. Check for extra spaces or characters

### Issue: Storage upload fails

**Solutions:**
1. Verify token is correct in Vercel dashboard
2. Check token has write permissions (`vercel_blob_rw_...`)
3. Check storage quota in Vercel dashboard
4. Verify network connectivity

---

## 📞 Support Resources

### OpenAI
- Documentation: https://platform.openai.com/docs
- API Status: https://status.openai.com/
- Support: https://help.openai.com/

### Vercel
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

### Sentry
- Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Support: https://sentry.io/support/

---

## 🎯 Next Steps After Integration

1. ✅ **Test all features**
   - Upload video
   - Generate captions
   - Preview with different styles
   - Export video

2. ✅ **Deploy to Production**
   - See `SETUP_INSTRUCTIONS.md` for deployment guide
   - Add environment variables in Vercel dashboard

3. ✅ **Monitor**
   - Set up Sentry alerts
   - Monitor error logs
   - Track usage analytics

---

## 📋 Quick Reference

### Required Keys
- `OPENAI_API_KEY` - Get from: https://platform.openai.com/api-keys

### Recommended Keys
- `VERCEL_BLOB_STORAGE_TOKEN` - Get from: Vercel Dashboard > Storage

### Optional Keys
- `NEXT_PUBLIC_SENTRY_DSN` - Get from: https://sentry.io/
- `NEXT_PUBLIC_GA_ID` - Get from: https://analytics.google.com/

---

**Status**: Ready for Integration  
**Next**: Follow steps above to set up your environment variables

