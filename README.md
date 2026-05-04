# Cookagent

Cookagent is a mobile-first Next.js PWA foundation for personal AI-powered recipe management.

## Stack

- Next.js App Router
- TypeScript (strict)
- Tailwind CSS

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Current scope

This initial foundation intentionally excludes:
- database/local-first data logic
- LLM ingestion logic
- Google Drive integration
