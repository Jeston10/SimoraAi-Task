# 🔑 Supabase Credentials Guide

## ⚠️ Important: URL vs Keys

### SUPABASE_URL (What you need)
- **This is NOT a key** - it's your project URL
- **Format**: `https://xxxxx.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Where to find**: Settings → API → "Project URL"
- **Public**: ✅ Safe to share (it's just a URL)

### SUPABASE_SERVICE_ROLE_KEY (What you need)
- **This is a SECRET key** - keep it private!
- **Format**: Long JWT token starting with `eyJ...`
- **Where to find**: Settings → API → "service_role" key (NOT anon key!)
- **Secret**: ⚠️ Never share or commit to Git

---

## ❌ Common Mistake

**DON'T use the "anon public" key for SUPABASE_URL!**

- `SUPABASE_URL` = Your project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` = The **service_role** key (NOT anon key)

---

## ✅ Correct Setup

### Step 1: Get SUPABASE_URL
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings → API**
4. Find **"Project URL"** (not keys section)
5. Copy the URL (format: `https://xxxxx.supabase.co`)

**Example**:
```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

### Step 2: Get SUPABASE_SERVICE_ROLE_KEY
1. In the same page (Settings → API)
2. Scroll to **"Project API keys"** section
3. Find **"service_role"** key (NOT "anon public")
4. Click the eye icon to reveal it
5. Copy the entire key (long JWT token)

**Example**:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQxNzY5MzIwLCJleHAiOjE5NTczNDUzMjB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔍 How to Identify

### SUPABASE_URL
- ✅ Starts with `https://`
- ✅ Ends with `.supabase.co`
- ✅ Looks like a website URL
- ✅ Example: `https://abcdefghijklmnop.supabase.co`

### SUPABASE_SERVICE_ROLE_KEY
- ✅ Starts with `eyJ` (JWT token)
- ✅ Very long string (hundreds of characters)
- ✅ Found under "service_role" (NOT "anon public")
- ✅ Has "service_role" label in Supabase dashboard

### Anon Public Key (DON'T USE)
- ❌ Also starts with `eyJ`
- ❌ Found under "anon public" label
- ❌ **NOT what you need** - this is for client-side only
- ❌ Doesn't have storage upload permissions

---

## ⚠️ Why Service Role Key?

The **service_role** key is needed because:
- ✅ Has full access to storage (upload/delete files)
- ✅ Can bypass Row Level Security (RLS)
- ✅ Required for server-side operations
- ✅ Safe to use in API routes (server-side only)

The **anon public** key:
- ❌ Limited permissions
- ❌ Cannot upload files to storage
- ❌ Restricted by RLS policies
- ❌ Only for client-side use

---

## ✅ Correct .env.local Example

```env
# Project URL (public, safe to share)
SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# Service Role Key (SECRET - keep private!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQxNzY5MzIwLCJleHAiOjE5NTczNDUzMjB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Storage bucket name
SUPABASE_STORAGE_BUCKET=videos
```

---

## 🔍 Visual Guide

In Supabase Dashboard → Settings → API, you'll see:

```
Project URL
https://abcdefghijklmnop.supabase.co  ← Copy this for SUPABASE_URL

Project API keys
┌─────────────────────────────────────┐
│ anon public                         │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6...    │  ← DON'T use this
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ service_role                        │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6...    │  ← USE THIS for SUPABASE_SERVICE_ROLE_KEY
└─────────────────────────────────────┘
```

---

## ✅ Quick Checklist

- [ ] `SUPABASE_URL` = Project URL (starts with `https://`, ends with `.supabase.co`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = service_role key (NOT anon public)
- [ ] `SUPABASE_STORAGE_BUCKET` = `videos` (or your bucket name)

---

## 🆘 If You Used Anon Key

If you accidentally used the anon key:
1. **Don't worry** - it won't work, but it's safe
2. **Fix it**: Replace with service_role key
3. **Restart** your dev server after fixing

---

**Summary**: 
- `SUPABASE_URL` = Your project URL (public)
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (secret, NOT anon)

