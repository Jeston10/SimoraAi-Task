# 🔧 Optional API Keys Configuration Guide

## Overview

Let's configure the optional API keys in your `env.template` (lines 21-29). Here's what each one does and whether you need it:

---

## 1. ✅ Sentry (Error Monitoring) - **RECOMMENDED**

### Status: **Implemented & Ready to Use**

**What it does:**
- Tracks errors and exceptions in production
- Provides detailed error reports with stack traces
- Helps debug issues in deployed applications
- **FREE tier available** (5,000 events/month)

**Do you need it?**
- ✅ **Yes, if deploying to production** (highly recommended)
- ❌ **No, if just testing locally**

### Setup Steps:

#### Step 1: Create Sentry Account
1. Go to: https://sentry.io/
2. Click "Get Started" (free)
3. Sign up with GitHub, Google, or email
4. Verify your email

#### Step 2: Create Project
1. After login, click "Create Project"
2. Select **"Next.js"** as platform
3. Give it a name: `remotion-captioning`
4. Click "Create Project"

#### Step 3: Get DSN
1. After project creation, you'll see the DSN
2. **Copy the DSN** (format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)
3. It looks like: `https://abc123@o123456.ingest.sentry.io/1234567`

#### Step 4: Install Sentry Package
```bash
npm install @sentry/nextjs
```

#### Step 5: Run Sentry Wizard (Recommended)
```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Configure Sentry automatically
- Create `sentry.client.config.ts` and `sentry.server.config.ts`
- Update `next.config.js` if needed

#### Step 6: Add to `.env.local`
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

#### Step 7: Enable Sentry in Code
The code is already ready in `lib/monitoring.ts`. After installing, it will work automatically.

**Cost**: FREE (5,000 events/month) ✅

---

## 2. ❌ AssemblyAI - **NOT NEEDED**

### Status: **Not Currently Used**

**What it does:**
- Alternative speech-to-text service
- Was planned as a fallback option

**Do you need it?**
- ❌ **No** - You're already using Hugging Face (FREE)
- ❌ **Not implemented** in the current codebase
- ❌ **Not necessary** - Hugging Face works great

**Action**: Leave it commented out or remove it.

```env
# AssemblyAI (Optional - not currently used)
# ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
```

---

## 3. ❌ AWS Keys - **NOT NEEDED YET**

### Status: **Not Currently Implemented**

**What it does:**
- For Remotion cloud rendering on AWS Lambda
- Would enable serverless video rendering

**Do you need it?**
- ❌ **No** - Video rendering is currently simulated
- ❌ **Not implemented** - Would require additional setup
- ❌ **Optional** - Only needed for production cloud rendering

**Current Status:**
- Video rendering uses local CLI script (`scripts/render-cli.ts`)
- Web rendering is simulated (returns placeholder)
- AWS integration would be a future enhancement

**Action**: Leave it commented out for now.

```env
# AWS (Optional - for Remotion cloud rendering)
# REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
# REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

---

## 📋 Summary & Recommendations

| API Key | Status | Need It? | Cost | Priority |
|---------|--------|----------|------|----------|
| **Sentry** | ✅ Implemented | ✅ Yes (production) | FREE | 🔴 High |
| **AssemblyAI** | ❌ Not used | ❌ No | Paid | ⚪ None |
| **AWS Keys** | ❌ Not implemented | ❌ No (yet) | Paid | ⚪ Low |

---

## ✅ Recommended Configuration

### For Local Development:
```env
# Error Monitoring (Optional)
# NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# AssemblyAI (Not needed - using Hugging Face)
# ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# AWS (Not implemented yet)
# REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
# REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```
**All commented out** - Not needed for local testing.

### For Production:
```env
# Error Monitoring (Recommended)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# AssemblyAI (Not needed)
# ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# AWS (Not implemented yet)
# REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
# REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```
**Only Sentry enabled** - For error tracking in production.

---

## 🚀 Quick Setup (Sentry Only)

If you want to set up Sentry now:

1. **Create account**: https://sentry.io/
2. **Create Next.js project** in Sentry
3. **Copy DSN** from project settings
4. **Install package**: `npm install @sentry/nextjs`
5. **Run wizard**: `npx @sentry/wizard@latest -i nextjs`
6. **Add to `.env.local`**: `NEXT_PUBLIC_SENTRY_DSN=your-dsn-here`

**Time**: ~5 minutes
**Cost**: FREE ✅

---

## 📝 Updated env.template Recommendation

For your `env.template`, you can keep it as is (all commented) or update to:

```env
# Error Monitoring (Optional - Recommended for production)
# Get from: https://sentry.io/ > Create Project > Copy DSN
# Install: npm install @sentry/nextjs
# Run: npx @sentry/wizard@latest -i nextjs
# NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# AssemblyAI (Not currently used - using Hugging Face instead)
# ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# AWS (Not implemented yet - for future Remotion cloud rendering)
# REMOTION_AWS_ACCESS_KEY_ID=your-aws-access-key
# REMOTION_AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

---

## 🎯 Bottom Line

**For now:**
- ✅ **Sentry**: Set up if deploying to production (recommended)
- ❌ **AssemblyAI**: Not needed (using Hugging Face)
- ❌ **AWS**: Not needed (not implemented)

**You can skip all of these for local development!** They're all optional.

---

**Next**: Focus on testing your app with Hugging Face and Supabase. Add Sentry later when deploying to production.

