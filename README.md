# Japan Family Trip

A private, shared itinerary for the Smith family’s August 2026 Japan trip. The app includes the full editable calendar, JSON and printable PDF backups, a read-only **My Day** view for kids, offline trip access, private tickets and reservation files, an approval-gated AI document Inbox, a trip assistant, and an emergency directory.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run lint
npm run build
```

## Required configuration

Set secrets in the hosting environment (or an ignored local `.env` file):

- `FAMILY_EDITOR_ACCESS_CODE`: full calendar and write access.
- `FAMILY_VIEWER_ACCESS_CODE`: read-only My Day access.
- `FAMILY_SESSION_SECRET`: a separate high-entropy secret used to sign 30-day role sessions.
- `OPENAI_API_KEY`: optional; enables model-backed Inbox analysis and trip answers. Without it, both features use safe local fallbacks.
- `OPENAI_TRIP_MODEL`: optional model override; defaults to `gpt-5.6-terra`.

`FAMILY_ACCESS_CODE` remains a legacy editor-code fallback. New deployments should configure the separate editor and viewer codes plus a distinct session secret.

The hosting configuration declares:

- D1 binding `DB` for trip state, attachments, Inbox drafts, and personal emergency contacts.
- Private R2 binding `ATTACHMENTS` for uploaded files. Objects are served only through authenticated application routes; no public bucket URLs are exposed.

The runtime creates its required tables and indexes defensively. SQL definitions also live in `db/migrations/` and `db/schema.ts`.

## Access and data boundaries

- Viewers are read-only and are directed to My Day. They cannot edit the itinerary, approve Inbox drafts, upload files, or change emergency contacts.
- Editors can change the calendar, manage files and contacts, and explicitly approve or reject AI Inbox drafts.
- AI analysis never receives mutation tools. Supported PDFs, DOCX files, images, emails, and text files are read as untrusted evidence with OpenAI request storage disabled. A suggestion is stored as an immutable review draft and cannot change the trip until an editor confirms the exact proposed diff.
- Uploaded files and protected APIs use private, no-store responses. A file is hidden from viewers until an editor separately marks it as viewer-approved.
- Offline mode stores an explicitly requested trip copy in the browser. Protected API responses and personal emergency contacts are never placed in the service-worker cache. A family member can separately opt in to a device-only emergency-contact copy in IndexedDB after acknowledging that anyone who unlocks the device may read it; the copy is read-only offline and can be removed without changing shared contacts. Offline editor changes are queued and stop on a version conflict instead of overwriting newer shared data.
- Official emergency numbers and public safety/news links remain available from the offline shell. Live information still requires a connection.

## Agenda protection

The canonical seed itinerary is guarded by `tests/agenda-integrity.test.mjs`, including its expected SHA-256 digest, item count, unique IDs, dates, and trip range. Run `npm test` before merging any calendar or storage change.

## Deployment note

This branch contains application code and binding declarations only. It does not create or modify production D1/R2 resources and has not been deployed. Configure real bindings and secrets, apply the migrations if your deployment process requires them, and run the complete test suite before release.
