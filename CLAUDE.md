# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

There are no lint or test scripts configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in values before running locally:

- `GOOGLE_SHEET_URL` — Google Apps Script web app URL for registrant data
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary credentials
- `CLOUDINARY_FOLDER` — (optional) Cloudinary upload folder, defaults to `parshuram-yatra`

## Architecture

This is a **Next.js 14 App Router** project (TypeScript, no Tailwind — plain CSS in `src/app/globals.css`). The entire UI lives in a single client component (`src/app/page.tsx`).

### Core data flow

1. **Template selection** — `src/lib/posterTemplates.ts` defines two `PosterTemplate` objects (design-space coordinates, colors). The active template drives both the canvas render and CSS theme variables (`--template-primary`, `--template-secondary`).

2. **Poster rendering** — `src/components/PosterCanvas.tsx` draws everything on an HTML `<canvas>` using the Canvas 2D API (no external image library). Re-renders whenever `templateId`, `name`, or `selfieUrl` change. Calls `onReady(dataUrl)` with a PNG data URL once drawn.

3. **Image compression** — Before preview, large selfies (>2MB) are re-encoded to JPEG at 90% quality, capped at 1600px. Files still exceeding 3MB after compression are rejected client-side.

4. **Registration sync** — On download, `page.tsx` calls `POST /api/register` in the background (non-blocking). Requests are serialized via `syncChainRef` to prevent duplicate Sheet rows from rapid downloads. The API route (`src/app/api/register/route.ts`) uploads the selfie to Cloudinary (keyed by mobile number as `m_{digits}`, overwriting on re-registration), then upserts a row in Google Sheets via an Apps Script web app.

5. **Sharing** — `src/components/ShareButtons.tsx` uses the Web Share API (`navigator.share`) to share the poster image file directly, or falls back to clipboard copy.

### Key constraints

- Name must be 5–40 characters (full name with surname). Mobile must be exactly 10 digits.
- Selfie is capped at 3MB after compression. The Cloudinary public_id is always `m_{10-digit-mobile}`, so re-registering the same mobile overwrites the previous image.
- The `PosterCanvas` image cache (`imageCache` Map) persists across renders within a session to avoid re-fetching template background images.
- The Apps Script must respond with `{ schemaVersion: 2, action: "add"|"update"|"delete" }` — the API route validates this and returns 502 if the script is outdated.
- Path alias `@/*` maps to `src/*`.
