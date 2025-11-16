# Technical Specification - Remotion Captioning Platform

## 🏗️ Architecture Overview

### **System Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload UI  │  │   Preview    │  │   Export     │      │
│  │   Component  │  │   Player     │  │   Button     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server (Vercel)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Upload API  │  │ Caption API  │  │  Render API  │      │
│  │   Route      │  │   Route      │  │   Route      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File Storage │  │  STT Service │  │   Remotion   │      │
│  │  (Vercel     │  │  (OpenAI/    │  │   Renderer   │      │
│  │   Blob)      │  │  AssemblyAI) │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack Details

### **Frontend Stack**
| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Next.js | 14.2+ | Framework | App Router, API routes, serverless functions |
| React | 18.2+ | UI Library | Required by Next.js and Remotion |
| TypeScript | 5.3+ | Language | Type safety, better DX |
| Remotion | 4.0+ | Video Rendering | Core requirement for caption overlay |
| @remotion/player | 4.0+ | Preview | Real-time preview in browser |
| @remotion/cli | 4.0+ | Rendering | Server-side video rendering |
| Tailwind CSS | 3.4+ | Styling | Utility-first, fast development |
| shadcn/ui | Latest | Components | Pre-built accessible components |

### **Backend Stack**
| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Next.js API Routes | Built-in | API Endpoints | Serverless, integrated with frontend |
| OpenAI SDK | 4.20+ | STT Service | Whisper API integration |
| FFmpeg | Latest | Video Processing | Audio extraction, final composition |
| Vercel Blob | Latest | File Storage | Integrated with Vercel, easy setup |

### **Development Tools**
| Technology | Purpose |
|------------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| TypeScript | Type checking |
| Git | Version control |

---

## 🔌 API Design

### **1. Upload Video Endpoint**
```
POST /api/upload
Content-Type: multipart/form-data

Request:
  - file: File (MP4 only, max 100MB)

Response:
  {
    "success": true,
    "videoId": "uuid",
    "videoUrl": "https://...",
    "duration": 120.5,
    "message": "Video uploaded successfully"
  }
```

### **2. Generate Captions Endpoint**
```
POST /api/captions/generate
Content-Type: application/json

Request:
  {
    "videoId": "uuid",
    "language": "hi" | "en" | "auto"
  }

Response:
  {
    "success": true,
    "captions": [
      {
        "id": 1,
        "start": 0.0,
        "end": 3.5,
        "text": "Hello, this is a test."
      },
      ...
    ],
    "language": "hi"
  }
```

### **3. Render Video Endpoint**
```
POST /api/render
Content-Type: application/json

Request:
  {
    "videoId": "uuid",
    "captions": [...],
    "style": "bottom" | "top" | "karaoke",
    "quality": "720p" | "1080p"
  }

Response:
  {
    "success": true,
    "jobId": "uuid",
    "status": "processing" | "completed" | "failed",
    "progress": 45,
    "outputUrl": "https://..." // when completed
  }
```

---

## 🎨 Caption Style Specifications

### **Style 1: Bottom-Centered (Standard)**
```typescript
{
  position: "bottom",
  alignment: "center",
  fontSize: 32,
  fontFamily: "Noto Sans, Noto Sans Devanagari",
  color: "#FFFFFF",
  backgroundColor: "transparent",
  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
  padding: "10px 20px",
  borderRadius: 4,
  bottomOffset: "10%"
}
```

### **Style 2: Top-Bar (News-Style)**
```typescript
{
  position: "top",
  alignment: "center",
  fontSize: 28,
  fontFamily: "Noto Sans, Noto Sans Devanagari",
  color: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.7)",
  textShadow: "none",
  padding: "15px 30px",
  borderRadius: 0,
  topOffset: "5%",
  width: "100%"
}
```

### **Style 3: Karaoke-Style**
```typescript
{
  position: "bottom",
  alignment: "center",
  fontSize: 36,
  fontFamily: "Noto Sans, Noto Sans Devanagari",
  color: "#FFFFFF",
  backgroundColor: "transparent",
  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
  padding: "10px 20px",
  borderRadius: 4,
  bottomOffset: "10%",
  highlightColor: "#FFD700",
  wordByWord: true,
  animationDuration: 300
}
```

---

## 📊 Data Models

### **Video Model**
```typescript
interface Video {
  id: string;
  originalUrl: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  uploadedAt: Date;
  status: "uploaded" | "processing" | "ready" | "error";
}
```

### **Caption Model**
```typescript
interface Caption {
  id: number;
  start: number;      // seconds
  end: number;        // seconds
  text: string;       // Can contain Hindi (Devanagari) and English
  words?: Word[];     // For karaoke-style
}

interface Word {
  text: string;
  start: number;
  end: number;
}
```

### **Render Job Model**
```typescript
interface RenderJob {
  id: string;
  videoId: string;
  captions: Caption[];
  style: "bottom" | "top" | "karaoke";
  quality: "720p" | "1080p";
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;   // 0-100
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

---

## 🔐 Environment Variables

```env
# API Keys
OPENAI_API_KEY=sk-...
ASSEMBLYAI_API_KEY=... (optional fallback)

# Storage
VERCEL_BLOB_STORAGE_TOKEN=...
VERCEL_BLOB_STORAGE_URL=...

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
MAX_VIDEO_SIZE_MB=100
MAX_VIDEO_DURATION_SECONDS=600

# Remotion
REMOTION_AWS_ACCESS_KEY_ID=... (if using AWS for rendering)
REMOTION_AWS_SECRET_ACCESS_KEY=...
```

---

## 🎯 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Upload Time | < 30s for 50MB | Depends on connection |
| Caption Generation | < 60s for 5min video | STT API dependent |
| Preview Load | < 2s | Remotion Player initialization |
| Render Time | < 5min for 5min video | Depends on complexity |
| Page Load | < 3s | Lighthouse score > 90 |

---

## 🛡️ Security Considerations

1. **File Upload Security**
   - Validate file type (MP4 only)
   - Check file size limits
   - Scan for malicious content (basic)
   - Use secure file storage

2. **API Security**
   - Rate limiting on API routes
   - Authentication (if needed for production)
   - CORS configuration
   - Input validation and sanitization

3. **Data Privacy**
   - Temporary storage (auto-delete after 24h)
   - No permanent storage of user videos
   - Secure API key handling

---

## 🧪 Testing Strategy

### **Unit Tests**
- Caption parsing utilities
- Style rendering functions
- Data transformation logic

### **Integration Tests**
- API endpoint testing
- STT service integration
- Remotion composition rendering

### **E2E Tests**
- Complete user flow
- Video upload → Caption → Preview → Export

### **Manual Testing Checklist**
- [ ] Upload various video sizes
- [ ] Test with Hindi, English, and Hinglish audio
- [ ] Verify all 3 caption styles
- [ ] Test preview functionality
- [ ] Test export functionality
- [ ] Test error scenarios
- [ ] Test on different browsers
- [ ] Test responsive design

---

## 📈 Scalability Considerations

### **Current Limitations**
- Vercel serverless functions: 10s timeout (Hobby), 60s (Pro)
- File size limits: 100MB max
- Render jobs: May need separate service for long videos

### **Future Improvements**
- Implement job queue (Redis/Bull)
- Use separate rendering service (Render.com)
- Implement video chunking for large files
- Add caching layer for frequently used assets

---

## 🔄 Version Compatibility Matrix

### **Verified Compatible Versions**
```
Next.js 14.2.5
├── React 18.2.0
├── TypeScript 5.3.3
├── Remotion 4.0.0
│   ├── @remotion/player 4.0.0
│   ├── @remotion/cli 4.0.0
│   └── remotion 4.0.0
├── Tailwind CSS 3.4.1
└── OpenAI SDK 4.20.1
```

**Note**: All versions will be verified during Phase 0 setup.

---

## 📚 External Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)

---

**Last Updated**: Planning Phase
**Next Review**: After Phase 0 completion

