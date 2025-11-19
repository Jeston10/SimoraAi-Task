# Remotion Captioning Platform

A full-stack web application that allows users to upload MP4 videos, automatically generate captions using speech-to-text, and render those captions onto videos using Remotion. Supports Hinglish (Hindi + English) with multiple caption style presets.

## 🎯 Features

- ✅ **Video Upload**: Upload MP4 videos with drag & drop interface
- ✅ **Auto-Captioning**: Automatic speech-to-text using OpenAI Whisper API
- ✅ **Hinglish Support**: Proper rendering of mixed Hindi (Devanagari) and English text
- ✅ **Caption Styles**: 3 predefined caption style presets
  - Bottom-centered subtitles (standard)
  - Top-bar captions (news-style)
  - Karaoke-style highlighting
- ✅ **Real-time Preview**: Preview captions with Remotion Player
- ✅ **Video Export**: Export final captioned video as MP4

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher (comes with Node.js)
- **OpenAI API Key**: For speech-to-text functionality
- **Vercel Account** (optional): For deployment and blob storage

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd remotion-captioning-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory and add your API keys:
   ```env
   # OpenAI API (required for speech-to-text)
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Vercel Blob Storage (optional - for small file uploads < 3.5MB)
   VERCEL_BLOB_STORAGE_TOKEN=your-vercel-blob-token-here
   VERCEL_BLOB_STORAGE_URL=your-vercel-blob-url-here
   
   # Supabase (required for large file uploads > 3.5MB)
   # Get these from: Supabase Dashboard > Settings > API
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_STORAGE_BUCKET=videos
   
   # Supabase Client-side (required for direct uploads)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=videos
   ```
   
   **Note**: For large file uploads (>3.5MB), Supabase configuration is required. Without it, only files smaller than 3.5MB can be uploaded.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Technology Stack

### Frontend
- **Next.js 14.2+**: React framework with App Router
- **React 18.2+**: UI library
- **TypeScript 5.3+**: Type-safe development
- **Remotion 4.0+**: Video rendering and composition
- **Tailwind CSS 3.4+**: Utility-first CSS framework

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **OpenAI Whisper API**: Speech-to-text service
- **Vercel Blob Storage**: File storage for videos

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking

## 📁 Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── upload/        # Video upload handler
│   │   ├── captions/      # Caption generation
│   │   └── render/        # Video rendering
│   ├── remotion/          # Remotion compositions
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
├── types/                 # TypeScript type definitions
├── public/                # Static assets
│   └── uploads/           # Uploaded videos (temporary)
└── temp/                  # Temporary files
```

## 🔧 Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run remotion`: Open Remotion Studio

## 📝 API Endpoints

### POST `/api/upload`
Upload a video file (MP4 only, max 100MB)

### POST `/api/captions/generate`
Generate captions from video audio using STT

### POST `/api/render`
Render video with captions using Remotion

## 🎨 Caption Styles

### 1. Bottom-Centered (Standard)
- White text with black outline
- Centered at bottom 10% of screen
- Standard subtitle style

### 2. Top-Bar (News-Style)
- Semi-transparent background bar
- Text at top 10% of screen
- News broadcast style

### 3. Karaoke-Style
- Word-by-word highlighting
- Animated progress indicator
- Golden highlight color

## 📤 Video Export

### Web Export
1. Generate captions for your video
2. Select your preferred caption style
3. Choose export quality (720p or 1080p)
4. Click "Export Video"
5. Wait for rendering to complete
6. Download your captioned video

**Note**: Web export has limitations due to serverless function timeouts. For longer videos or production use, use CLI rendering.

### CLI Rendering (Recommended for Production)

For better performance and longer videos, use the CLI render script:

1. **Save your captions to a JSON file**:
   ```json
   [
     {
       "id": 1,
       "start": 0.0,
       "end": 3.5,
       "text": "Hello, this is a test."
     }
   ]
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Run the render script**:
   ```bash
   npx tsx scripts/render-cli.ts <videoPath> <captionsFile> <style> <quality> <output>
   ```

   **Example**:
   ```bash
   npx tsx scripts/render-cli.ts ./video.mp4 ./captions.json bottom 1080p ./output.mp4
   ```

   **Parameters**:
   - `videoPath`: Path to your MP4 video file
   - `captionsFile`: Path to JSON file with captions
   - `style`: `bottom`, `top`, or `karaoke`
   - `quality`: `720p` or `1080p`
   - `output`: Output path for rendered video

4. **Wait for rendering to complete** - progress will be shown in the console

**Requirements for CLI Rendering**:
- Node.js 18+
- FFmpeg installed on your system
- Sufficient disk space for output video

## 🌐 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure environment variables**
   - Add all variables from `.env.local`
   - Set up Vercel Blob Storage

4. **Deploy**
   - Vercel will automatically deploy on push
   - Your app will be live at `your-project.vercel.app`

### Environment Variables for Production

Make sure to set these in your Vercel project settings (Settings > Environment Variables):

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key for speech-to-text

**Required for Large File Uploads (>3.5MB):**
- `SUPABASE_URL` - Your Supabase project URL (from Dashboard > Settings > API > Project URL)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Dashboard > Settings > API > service_role key - **keep this secret!**)
- `SUPABASE_STORAGE_BUCKET` - Storage bucket name (default: "videos")
- `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL (public, safe to expose)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key (from Dashboard > Settings > API > anon public key)
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` - Same as SUPABASE_STORAGE_BUCKET (default: "videos")

**Optional (for small files < 3.5MB):**
- `VERCEL_BLOB_STORAGE_TOKEN` - Vercel Blob Storage token
- `VERCEL_BLOB_STORAGE_URL` - Vercel Blob Storage URL
- `NEXT_PUBLIC_APP_URL` - Your app URL (for production)

**Important Notes:**
- Files larger than 3.5MB require Supabase configuration
- Without Supabase, only files smaller than 3.5MB can be uploaded (due to Vercel's 4.5MB serverless function limit)
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) - keep it secret and never expose it to the client

## 🔍 Caption Generation Method

This project uses **OpenAI Whisper API** for speech-to-text transcription:

1. Video is uploaded and stored temporarily
2. Audio is extracted from the video
3. Audio is sent to OpenAI Whisper API
4. Captions are returned with timestamps
5. Captions are formatted and stored

**Language Support**: 
- English
- Hindi
- Hinglish (mixed Hindi and English)

## 🛠️ Development

### Adding New Caption Styles

1. Create a new style component in `app/remotion/styles/`
2. Add style configuration
3. Update style selector component
4. Test with sample videos

### Testing Hinglish Support

Use videos with mixed Hindi and English audio to verify:
- Font rendering (Noto Sans Devanagari)
- Text alignment
- Character encoding
- Mixed language sentences

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For issues or questions, please contact the project maintainer.

## 📞 Support

For setup issues or questions:
1. Check the troubleshooting section below
2. Review the project documentation
3. Check GitHub issues (if applicable)

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Module not found" errors
- **Solution**: Run `npm install` again

**Issue**: Remotion not working
- **Solution**: Ensure Remotion packages are installed: `npm install remotion @remotion/player @remotion/cli`

**Issue**: API key errors
- **Solution**: Verify `.env.local` file exists and contains valid API keys

**Issue**: Video upload fails
- **Solution**: Check file size (max 100MB) and format (MP4 only)

**Issue**: Caption generation fails
- **Solution**: Verify OpenAI API key is valid and has credits

## 📊 Project Status

**Current Phase**: Phase 0 - Project Setup ✅

**Next Steps**: Phase 1 - Core Infrastructure Setup

---

**Built with ❤️ using Next.js, Remotion, and OpenAI**

