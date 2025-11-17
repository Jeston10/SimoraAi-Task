# ⚡ Quick Start - Integration Setup

## 🚀 5-Minute Setup Guide

### Step 1: Get OpenAI API Key (2 minutes)

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add credits: https://platform.openai.com/account/billing (minimum $5)

### Step 2: Create `.env.local` File (1 minute)

1. In your project root, create file: `.env.local`
2. Add this line:
   ```env
   OPENAI_API_KEY=sk-paste-your-key-here
   ```
3. Save the file

### Step 3: Test It (2 minutes)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:3000

3. Upload a test video and generate captions

**✅ Done!** Your app is now functional.

---

## 📋 What's Next?

### For Production (Recommended)
- Set up Vercel Blob Storage (see `INTEGRATION_GUIDE.md`)
- Deploy to Vercel

### For Enhanced Features (Optional)
- Set up Sentry for error tracking
- Add analytics

---

## 📚 Full Documentation

- **Detailed Guide**: See `INTEGRATION_GUIDE.md`
- **Checklist**: See `INTEGRATION_CHECKLIST.md`
- **Troubleshooting**: See `INTEGRATION_GUIDE.md` → Troubleshooting section

---

**Need Help?** Check `INTEGRATION_GUIDE.md` for detailed instructions.

