# Cookagent development instructions

## Product
Cookagent is a mobile-first AI-powered recipe management PWA for personal use.

The first MVP must support:
- local-first recipe storage
- offline recipe viewing
- recipe ingestion from pasted text and images
- LLM extraction into a structured recipe format
- review-before-save
- recipe editing
- tags and filters
- printable recipe reading view
- human-readable backup/export

## Tech direction
Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod
- Dexie / IndexedDB
- modular architecture

Prefer long-term maintainability over speed.

## Coding rules
- Keep code modular.
- Use strict TypeScript.
- Use Zod schemas for persisted data.
- Do not store API keys in client-side code.
- Do not save raw recipe input by default.
- Do not implement features not requested in the current task.
- Avoid large single-file implementations.
- Prefer simple, readable UI over decorative UI.

## Commands
After changes, run:
- npm run lint
- npm run typecheck if available
- npm run build

If a command is unavailable, explain why and add it only if appropriate.

## Workflow
For each task:
1. Inspect the existing code first.
2. Make the smallest coherent change.
3. Validate with available checks.
4. Summarize changed files and any follow-up work.
