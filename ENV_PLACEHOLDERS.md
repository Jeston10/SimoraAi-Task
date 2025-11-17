# 🔑 All .env Placeholders Requiring API Keys

## Quick Reference - All Placeholders

Here are **ALL** placeholders in your `.env.local` file that require API keys or credentials:

---

## ⚠️ REQUIRED (Choose One Option Per Category)

### 1. Speech-to-Text (STT) - Choose ONE:

#### Option A: Hugging Face (FREE ✅)
```env
HUGGINGFACE_API_KEY=hf_your-huggingface-token-here
```
- **Get from**: https://huggingface.co/settings/tokens
- **Cost**: FREE
- **Format**: Starts with `hf_`

#### Option B: OpenAI (Paid)
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- **Get from**: https://platform.openai.com/api-keys
- **Cost**: ~$0.006/minute
- **Format**: Starts with `sk-`

**You need AT LEAST ONE of the above.**

---

### 2. File Storage - Choose ONE:

#### Option A: Supabase (FREE ✅)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=videos
```
- **Get from**: https://supabase.com/ → Your Project → Settings → API
- **Cost**: FREE (1GB storage, 2GB bandwidth/month)
- **Format**: 
  - URL: `https://xxxxx.supabase.co`
  - Key: Long JWT token (keep secret!)
  - Bucket: `videos` (or custom)

#### Option B: Vercel Blob (Paid)
```env
VERCEL_BLOB_STORAGE_TOKEN=vercel_blob_rw_your-token-here
```
- **Get from**: Vercel Dashboard → Storage → Blob
- **Cost**: Paid
- **Format**: Starts with `vercel_blob_rw_`

**You need AT LEAST ONE of the above.**

---

## ✅ OPTIONAL (Not Required)

### 3. Provider Selection (Auto-detects by default)
```env
STT_PROVIDER=auto
STORAGE_PROVIDER=auto
```
- **Default**: `auto` (recommended)
- **Options**: `huggingface`, `openai`, `supabase`, `vercel`, `auto`

---

### 4. Application Configuration
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAX_VIDEO_SIZE_MB=100
MAX_VIDEO_DURATION_SECONDS=600
```
- **Default**: Works without these
- **Production**: Set `NEXT_PUBLIC_APP_URL` to your deployed URL

---

### 5. Logging
```env
LOG_LEVEL=info
```
- **Default**: `info`
- **Options**: `debug`, `info`, `warn`, `error`

---

### 6. Error Tracking (Optional)
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```
- **Get from**: https://sentry.io/
- **Cost**: FREE tier available
- **Format**: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

---

### 7. AssemblyAI (Not Currently Used)
```env
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
```
- **Get from**: https://www.assemblyai.com/
- **Status**: Placeholder for future use

---

### 8. AWS (For Remotion Cloud Rendering - Not Currently Used)
```env
REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```
- **Get from**: AWS Console
- **Status**: Placeholder for future use

---

## 📋 Minimum Required Checklist (Free Setup)

For a **100% FREE** setup, you only need these 4 values:

- [ ] `HUGGINGFACE_API_KEY` - Get from https://huggingface.co/settings/tokens
- [ ] `SUPABASE_URL` - Get from Supabase project settings
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase project settings  
- [ ] `SUPABASE_STORAGE_BUCKET` - Create bucket in Supabase (default: `videos`)

**Total: 4 API keys/credentials needed for free setup**

---

## 📋 Minimum Required Checklist (Paid Setup)

If using paid services:

- [ ] `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- [ ] `VERCEL_BLOB_STORAGE_TOKEN` - Get from Vercel dashboard

**Total: 2 API keys needed for paid setup**

---

## 🎯 Summary

| Category | Free Option | Paid Option | Required? |
|----------|-------------|-------------|-----------|
| **Speech-to-Text** | `HUGGINGFACE_API_KEY` | `OPENAI_API_KEY` | ✅ Yes (one) |
| **File Storage** | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` | `VERCEL_BLOB_STORAGE_TOKEN` | ✅ Yes (one) |
| **Error Tracking** | `NEXT_PUBLIC_SENTRY_DSN` | - | ❌ Optional |
| **Logging** | `LOG_LEVEL` | - | ❌ Optional |
| **App Config** | `NEXT_PUBLIC_APP_URL` | - | ❌ Optional |

---

## 🚀 Quick Start (Free Setup)

Copy this to your `.env.local`:

```env
# Required for FREE setup
HUGGINGFACE_API_KEY=hf_your-token-here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=videos
```

Then get the actual values:
1. **Hugging Face**: https://huggingface.co/settings/tokens
2. **Supabase**: https://supabase.com/ → Your Project → Settings → API

---

**For detailed setup instructions, see**: `FREE_INTEGRATIONS_GUIDE.md`

