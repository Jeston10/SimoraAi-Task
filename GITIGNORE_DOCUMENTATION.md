# .gitignore Documentation

## Overview

This `.gitignore` file is comprehensive and covers all necessary files and directories that should not be committed to version control for a Next.js + Remotion + TypeScript project.

## Categories

### 1. Dependencies
- `node_modules/` - All npm/yarn/pnpm dependencies
- `.pnp.*` - Yarn PnP files
- `.yarn/` - Yarn v2+ files

### 2. Environment Variables & Sensitive Files
- `.env` - All environment variable files
- `.env*.local` - Local environment files
- `*.key`, `*.pem` - Private keys and certificates
- `secrets/` - Any secrets directory
- `**/api-keys.json` - API key files

### 3. Build & Output Files
- `/.next/` - Next.js build output
- `/out/` - Next.js export output
- `/build/` - Build directories
- `*.tsbuildinfo` - TypeScript build info

### 4. Remotion Specific
- `/remotion` - Remotion cache/bundle
- `remotion-bundle/` - Remotion bundle output
- `remotion-cache/` - Remotion cache

### 5. Video Files & Media
- `*.mp4`, `*.mov`, `*.avi` - Video files
- `/public/uploads/*` - Uploaded videos (keeps .gitkeep)
- `/temp/*` - Temporary files (keeps .gitkeep)
- `videos/`, `media/`, `uploads/` - Media directories

### 6. IDE & Editor Files
- `.vscode/` - VSCode settings (except shared configs)
- `.idea/` - IntelliJ IDEA files
- `*.sublime-*` - Sublime Text files
- `*.swp`, `*.swo` - Vim swap files

### 7. OS Files
- `.DS_Store` - macOS
- `Thumbs.db` - Windows
- `*~` - Linux backup files

### 8. Logs & Debug
- `*.log` - All log files
- `npm-debug.log*` - npm debug logs
- `yarn-debug.log*` - yarn debug logs

### 9. Cache & Temporary
- `.cache/` - Cache directories
- `.turbo/` - Turborepo cache
- `*.tmp`, `*.temp` - Temporary files

### 10. Testing
- `/coverage/` - Test coverage reports
- `*.lcov` - Coverage data

## Important Notes

### Files That ARE Committed
- `package.json` - Dependencies manifest
- `package-lock.json` - Lock file (for npm)
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config
- `tailwind.config.ts` - Tailwind config
- `remotion.config.ts` - Remotion config
- `env.example` - Example environment file (no secrets)
- Source code files (`.ts`, `.tsx`, `.js`, `.jsx`)
- Documentation files (`.md`)

### Files That Are NOT Committed
- `node_modules/` - Dependencies (install with `npm install`)
- `.env` - Environment variables (use `env.example` as template)
- `.next/` - Build output (generated)
- Video files - Large media files
- API keys and secrets
- IDE-specific settings

## Security Checklist

✅ **Never commit:**
- `.env` files
- API keys
- Private keys (`.pem`, `.key`)
- Credentials files
- Secrets directories
- Video files with sensitive content

✅ **Always commit:**
- `env.example` (template without secrets)
- Configuration files
- Source code
- Documentation

## Usage

1. **Before first commit:**
   ```bash
   # Verify sensitive files are ignored
   git status
   
   # Check if .env is ignored
   git check-ignore .env
   ```

2. **If you accidentally committed sensitive files:**
   ```bash
   # Remove from git but keep locally
   git rm --cached .env
   git commit -m "Remove sensitive file"
   ```

3. **Verify what will be committed:**
   ```bash
   git status
   git ls-files
   ```

## Common Patterns

### Ignore all files except specific ones:
```
# Ignore everything in uploads/
/public/uploads/*
# But keep .gitkeep
!/public/uploads/.gitkeep
```

### Ignore file extensions:
```
# Ignore all video files
*.mp4
*.mov
*.avi
```

### Ignore directories:
```
# Ignore entire directory
node_modules/
.vscode/
```

## Project-Specific Exclusions

This project specifically ignores:
- Video files (`.mp4`, `.mov`, etc.)
- Caption files (`.srt`, `.vtt`) if generated locally
- Render output directories
- Remotion cache and bundle files
- Uploaded media files
- Temporary processing files

## Maintenance

- Review `.gitignore` periodically
- Add new patterns as needed
- Remove obsolete patterns
- Keep it organized by category

---

**Last Updated**: [Current Date]
**Version**: 1.0

