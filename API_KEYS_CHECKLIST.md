# 🔑 API Keys & Credentials Checklist

## Complete List of Required Placeholders

This document lists **ALL** placeholders in your `.env.local` file that require API keys or credentials.

---

## ✅ REQUIRED (For Basic Functionality)

### 1. Speech-to-Text (STT) Provider - Choose ONE

#### Option A: Hugging Face (FREE - RECOMMENDED) ✅
```env
HUGGINGFACE_API_KEY=hf_your-huggingface-token-here
```
- **Status**: ⚠️ **REQUIRED** (if using free setup)
- **Get from**: https://huggingface.co/settings/tokens
- **Cost**: FREE (unlimited)
- **Format**: Starts with `hf_`
- **Steps**:
  1. Go to https://huggingface.co/ and create account
  2. Go to https://huggingface.co/settings/tokens
  3. Click "New token"
  4. Select "Read" permission
  5. Copy the token

#### Option B: OpenAI (Paid - Optional Fallback)
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- **Status**: ⚠️ **REQUIRED** (if not using Hugging Face)
- **Get from**: https://platform.openai.com/api-keys
- **Cost**: ~$0.006 per minute of audio
- **Format**: Starts with `sk-`
- **Steps**:
  1. Go to https://platform.openai.com/
  2. Sign up or log in
  3. Go to https://platform.openai.com/api-keys
  4. Click "Create new secret key"
  5. Copy the key
  6. Add credits at https://platform.openai.com/account/billing

**Note**: You need **AT LEAST ONE** of the above (Hugging Face recommended for free setup).

---

### 2. File Storage Provider - Choose ONE

#### Option A: Supabase Storage (FREE - RECOMMENDED) ✅
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=videos
```
- **Status**: ⚠️ **REQUIRED** (if using free setup)
- **Get from**: https://supabase.com/
- **Cost**: FREE (1GB storage, 2GB bandwidth/month)
- **Format**: 
  - URL: `https://xxxxx.supabase.co`
  - Key: Long string (keep secret!)
  - Bucket: `videos` (or custom name)
- **Steps**:
  1. Go to https://supabase.com/ and create account
  2. Create a new project
  3. Go to Settings → API
  4. Copy "Project URL" (SUPABASE_URL)
  5. Copy "service_role" key (SUPABASE_SERVICE_ROLE_KEY)
  6. Go to Storage → Create bucket named "videos"
  7. Set bucket to "Public"

#### Option B: Vercel Blob Storage (Paid - Optional Fallback)
```env
VERCEL_BLOB_STORAGE_TOKEN=vercel_blob_rw_your-token-here
```
- **Status**: ⚠️ **REQUIRED** (if not using Supabase)
- **Get from**: Vercel Dashboard > Storage > Blob
- **Cost**: Paid (varies)
- **Format**: Starts with `vercel_blob_rw_`
- **Steps**:
  1. Go to https://vercel.com/ and create account
  2. Create a new project
  3. Go to Storage tab → Create Database → Select "Blob"
  4. Go to Storage settings → Copy the token

**Note**: You need **AT LEAST ONE** of the above (Supabase recommended for free setup).

---

## 🔧 OPTIONAL Configuration

### 3. Provider Selection (Optional - Auto-detects)
```env
STT_PROVIDER=auto
STORAGE_PROVIDER=auto
```
- **Status**: ✅ **OPTIONAL**
- **Options**: 
  - `auto` (default) - Auto-detects based on available keys
  - `huggingface` or `openai` for STT
  - `supabase` or `vercel` for storage
- **Default**: `auto` (recommended)

---

### 4. Logging Configuration (Optional)
```env
LOG_LEVEL=info
```
- **Status**: ✅ **OPTIONAL**
- **Options**: `debug`, `info`, `warn`, `error`
- **Default**: `info`

---

### 5. Application URL (Optional)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
- **Status**: ✅ **OPTIONAL**
- **Default**: `http://localhost:3000` (for local development)
- **Production**: Set to your deployed URL (e.g., `https://your-app.vercel.app`)

---

### 6. Error Tracking (Optional)
```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
```
- **Status**: ✅ **OPTIONAL**
- **Get from**: https://sentry.io/
- **Cost**: FREE tier available
- **Steps**:
  1. Go to https://sentry.io/ and create account
  2. Create a new project
  3. Copy the DSN (Data Source Name)
- **Note**: Only needed if you want error tracking

---

### 7. AssemblyAI (Optional - Alternative STT)
```env
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
```
- **Status**: ✅ **OPTIONAL** (not currently used)
- **Get from**: https://www.assemblyai.com/
- **Cost**: Paid
- **Note**: This is a placeholder for future use

---

## 📋 Quick Checklist

### Minimum Required (Free Setup) ✅
- [ ] `HUGGINGFACE_API_KEY` - Get from https://huggingface.co/settings/tokens
- [ ] `SUPABASE_URL` - Get from Supabase project settings
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase project settings
- [ ] `SUPABASE_STORAGE_BUCKET` - Create bucket in Supabase (default: `videos`)

### Minimum Required (Paid Setup)
- [ ] `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- [ ] `VERCEL_BLOB_STORAGE_TOKEN` - Get from Vercel dashboard

### Optional (Recommended)
- [ ] `LOG_LEVEL` - Set to `info` (default)
- [ ] `NEXT_PUBLIC_APP_URL` - Set for production

### Optional (Nice to Have)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - For error tracking

---

## 🎯 Recommended Free Setup

For a **100% FREE** setup, you only need:

```env
# Required for FREE setup
HUGGINGFACE_API_KEY=hf_your-token-here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=videos

# Optional (auto-detects)
STT_PROVIDER=auto
STORAGE_PROVIDER=auto
LOG_LEVEL=info
```

**Total Cost**: $0 ✅

---

## 📝 Example `.env.local` (Free Setup)

```env
# ============================================
# REQUIRED - Free Setup
# ============================================

# Hugging Face (FREE - Speech-to-Text)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (FREE - File Storage)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQxNzY5MzIwLCJleHAiOjE5NTczNDUzMjB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_STORAGE_BUCKET=videos

# ============================================
# OPTIONAL Configuration
# ============================================

# Provider Selection (auto-detects)
STT_PROVIDER=auto
STORAGE_PROVIDER=auto

# Logging
LOG_LEVEL=info

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🆘 Need Help?

- **Hugging Face Setup**: See `FREE_INTEGRATIONS_GUIDE.md`
- **Supabase Setup**: See `FREE_INTEGRATIONS_GUIDE.md`
- **General Setup**: See `INTEGRATION_GUIDE.md`

---

**Status**: ✅ **All placeholders documented**

**Next**: Get your API keys and add them to `.env.local`!

