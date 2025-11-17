# 🆓 Free & Open-Source Integrations Guide

## Overview

Your project now supports **100% FREE** alternatives to paid services! All functionality is preserved while using open-source solutions.

---

## ✅ What's Been Changed

### 1. Speech-to-Text (STT)
- **Before**: OpenAI Whisper API (Paid: ~$0.006/minute)
- **Now**: Hugging Face Inference API (FREE, unlimited)
- **Model**: openai/whisper-large-v3 (same quality as OpenAI)

### 2. File Storage
- **Before**: Vercel Blob Storage (Paid)
- **Now**: Supabase Storage (FREE: 1GB storage, 2GB bandwidth/month)
- **Open Source**: Yes, Supabase is open-source

### 3. Error Tracking
- **Before**: Sentry (Free tier available)
- **Now**: Still Sentry (free tier), but structure ready for alternatives

---

## 🚀 Quick Start (100% Free Setup)

### Step 1: Get Hugging Face API Key (FREE)

1. **Create Account**
   - Go to: https://huggingface.co/
   - Click "Sign Up" (completely free)
   - Verify your email

2. **Get API Token**
   - Go to: https://huggingface.co/settings/tokens
   - Click "New token"
   - Name it (e.g., "Remotion Captioning")
   - Select "Read" permission
   - Click "Generate token"
   - **Copy the token** (starts with `hf_`)

3. **Add to `.env.local`**
   ```env
   HUGGINGFACE_API_KEY=hf_your-token-here
   ```

**That's it!** You now have FREE speech-to-text.

---

### Step 2: Get Supabase Storage (FREE)

1. **Create Account**
   - Go to: https://supabase.com/
   - Click "Start your project" (free tier)
   - Sign up with GitHub (recommended) or email

2. **Create Project**
   - Click "New Project"
   - Choose organization (or create one)
   - Fill in:
     - **Name**: remotion-captioning (or any name)
     - **Database Password**: Generate a strong password (save it!)
     - **Region**: Choose closest to you
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get Credentials**
   - Go to: Settings → API
   - Copy **Project URL** (format: `https://xxxxx.supabase.co`)
   - Copy **service_role** key (under "Project API keys")
     - ⚠️ **Keep this secret!** Never commit it to Git

4. **Create Storage Bucket**
   - Go to: Storage (left sidebar)
   - Click "New bucket"
   - Name: `videos`
   - Make it **Public** (toggle "Public bucket")
   - Click "Create bucket"

5. **Add to `.env.local`**
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_STORAGE_BUCKET=videos
   ```

**Done!** You now have FREE file storage.

---

## 📝 Complete `.env.local` Template (Free Version)

```env
# ============================================
# FREE SETUP - No paid services required!
# ============================================

# Hugging Face API Key (FREE - Speech-to-Text)
# Get from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=hf_your-token-here

# Supabase Storage (FREE - File Storage)
# Get from: https://supabase.com/ > Your Project > Settings > API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=videos

# Provider Selection (optional - auto-detects)
STT_PROVIDER=auto
STORAGE_PROVIDER=auto

# ============================================
# Optional Configuration
# ============================================

# Logging
LOG_LEVEL=info

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔄 How Auto-Detection Works

The app automatically selects providers based on available credentials:

### STT Provider Priority:
1. **Hugging Face** (if `HUGGINGFACE_API_KEY` is set) ✅ FREE
2. **OpenAI** (if `OPENAI_API_KEY` is set) - Paid fallback

### Storage Provider Priority:
1. **Supabase** (if `SUPABASE_URL` is set) ✅ FREE
2. **Vercel Blob** (if `VERCEL_BLOB_STORAGE_TOKEN` is set) - Paid fallback

### Manual Override:
Set `STT_PROVIDER` or `STORAGE_PROVIDER` to force a specific provider:
```env
STT_PROVIDER=huggingface  # Force Hugging Face
STORAGE_PROVIDER=supabase  # Force Supabase
```

---

## 💰 Cost Comparison

| Service | Before (Paid) | Now (Free) | Savings |
|---------|---------------|------------|---------|
| Speech-to-Text | ~$0.006/min | $0 | 100% |
| File Storage | Vercel pricing | 1GB free | 100% |
| **Total** | **~$0.01-0.10/video** | **$0** | **100%** |

---

## 🎯 Free Tier Limits

### Hugging Face
- ✅ **Unlimited** requests for open-source models
- ✅ No credit card required
- ✅ No expiration

### Supabase
- ✅ **1GB** storage (free tier)
- ✅ **2GB** bandwidth/month (free tier)
- ✅ No credit card required
- ✅ Free tier never expires

**For most projects, this is more than enough!**

---

## 🔧 Fallback Behavior

The app has intelligent fallback:

1. **Primary provider fails** → Automatically tries fallback
2. **Both providers fail** → Returns helpful error message
3. **No providers configured** → Clear error message with setup instructions

---

## ✅ Verification

After setup, verify everything works:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Check logs:**
   - Should see: "Using Hugging Face Whisper API"
   - Should see: "Uploading file to Supabase Storage"

3. **Test features:**
   - Upload a video ✅
   - Generate captions ✅
   - Preview captions ✅

---

## 🆘 Troubleshooting

### "HUGGINGFACE_API_KEY is not configured"
- Make sure token is in `.env.local`
- Make sure token starts with `hf_`
- Restart dev server after adding

### "Supabase credentials not configured"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Make sure you copied the **service_role** key (not anon key)
- Restart dev server

### "Bucket not found"
- Make sure bucket name matches `SUPABASE_STORAGE_BUCKET`
- Default is `videos`
- Create bucket in Supabase dashboard if missing

### Hugging Face API slow/failing
- First request may take longer (model loading)
- If rate limited, wait a few seconds and retry
- Check Hugging Face status: https://status.huggingface.co/

---

## 📚 Additional Resources

### Hugging Face
- Documentation: https://huggingface.co/docs/api-inference
- Models: https://huggingface.co/models?pipeline_tag=automatic-speech-recognition
- Community: https://huggingface.co/community

### Supabase
- Documentation: https://supabase.com/docs
- Storage Guide: https://supabase.com/docs/guides/storage
- Community: https://github.com/supabase/supabase

---

## 🎉 Benefits of Free Setup

1. ✅ **No costs** - Completely free
2. ✅ **Open source** - Both services are open-source
3. ✅ **Same quality** - Same Whisper model as OpenAI
4. ✅ **No credit card** - No payment required
5. ✅ **Generous limits** - More than enough for most projects
6. ✅ **Easy setup** - Simple configuration
7. ✅ **Automatic fallback** - Smart error handling

---

**Status**: ✅ **100% FREE SETUP READY**

**Next**: Follow the steps above to configure your free services!

