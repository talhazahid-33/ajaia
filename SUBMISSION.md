# Submission — Ajaia

Ajaia is a document editor: rich-text editing, sharing, file import, and real-time presence for who is viewing a document.

**Repository:** [github.com/talhazahid-33/ajaia](https://github.com/talhazahid-33/ajaia)

## Demo video

Walkthrough of login, documents, editing, sharing, import, and presence:

[Watch on Loom](PASTE_LOOM_URL_HERE)

## What was built

| Area | What you get |
| --- | --- |
| Editor | Tiptap rich text, 2s debounced REST autosave, refresh from the latest saved document |
| Sharing | Owner / editor / viewer; owned vs shared lists; share by email |
| Import | `.txt`, `.md`, `.docx` (5MB max), parsed in memory — files are not stored |
| Presence | Socket.IO shows who is on a document; content is not synced live |
| Auth | Lightweight email + password login; `x-user-id` on the API (not JWT/OAuth) |

Stack: Next.js (frontend), NestJS (API), PostgreSQL via Prisma.

## Scope choices

- Presence only, not CRDT / live collaborative editing
- Plain-text demo users instead of production auth
- REST remains the source of truth for document content

## Docs

- [README.md](./README.md) — setup and how to run
- [ARCHITECTURE.md](./ARCHITECTURE.md) — frontend, backend, and database
- [AI_WORKFLOW.md](./AI_WORKFLOW.md) — how Cursor was used
