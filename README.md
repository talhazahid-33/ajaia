# Ajaia

Ajaia is a small document editor: create and edit rich-text documents, share them with other users, import files, and see who is currently viewing a document.

This repository is a **pnpm monorepo** with two packages and a PostgreSQL database.

```
Ajaia/
├── frontend/          Next.js app (editor UI)
├── backend/           NestJS API + Socket.IO
├── ARCHITECTURE.md    System design
└── AI_WORKFLOW.md     How Cursor was used during development
```

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 16, React 19, Tiptap, Tailwind CSS, socket.io-client |
| Backend | NestJS 11, Socket.IO, Prisma 7 |
| Database | PostgreSQL |

Content is saved over REST with a 2-second debounce. Socket.IO is **presence only** (who is on a document). There is no live collaborative editing.

For internals, see [ARCHITECTURE.md](./ARCHITECTURE.md). For how AI was used on this project, see [AI_WORKFLOW.md](./AI_WORKFLOW.md).

---

## Features

- **Auth** — email + plaintext password login; the client sends `x-user-id` on later requests (no JWT/OAuth)
- **Documents** — create, rename (owner), edit (owner/editor), delete (owner)
- **Editor** — Tiptap rich text; autosave; refresh to reload the latest saved content
- **Sharing** — owner shares by email as Editor or Viewer; list splits owned vs shared
- **Import** — `.txt`, `.md`, `.docx` up to 5MB; parsed in memory, original file is not stored
- **Presence** — avatars of users currently viewing a document

### Access

| Role | Title | Content / import | Shares | Delete |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes |
| Editor | No | Yes | No | No |
| Viewer | No | Read only | No | No |

---

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 11
- PostgreSQL (local or hosted, e.g. Supabase)

---

## Setup

### 1. Backend env

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
PORT=5000
```

- `DATABASE_URL` — used by the running Nest process (pooled URL is fine)
- `DIRECT_URL` — used by Prisma CLI (`db push` / migrate) so it can bypass a pooler
- `PORT` — API port (frontend expects `5000` in local `.env.local` below)

### 2. Frontend env

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Install and generate Prisma

```bash
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma db push
```

```bash
cd frontend
pnpm install
```

### 4. Demo users

There is no seed script. Insert at least two users so you can test sharing (plain-text passwords on purpose for this MVP):

```sql
INSERT INTO users (id, name, email, password, created_at)
VALUES
  (gen_random_uuid(), 'Ada', 'ada@example.com', 'password', now()),
  (gen_random_uuid(), 'Ben', 'ben@example.com', 'password', now());
```

Or use Prisma Studio from `backend/`:

```bash
pnpm exec prisma studio
```

---

## Run locally

Two terminals:

```bash
# API — http://localhost:5000
cd backend
pnpm start:dev
```

```bash
# UI — http://localhost:3000
cd frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with a demo user, then create or open a document.

---

## Scripts

**Backend** (`backend/`)

| Command | Purpose |
| --- | --- |
| `pnpm start:dev` | Nest watch mode |
| `pnpm build` | `prisma generate` then Nest build |
| `pnpm start:prod` | Run compiled `dist/main` |
| `pnpm exec prisma generate` | Generate Prisma client |
| `pnpm exec prisma db push` | Sync schema to Postgres |
| `pnpm test` | Unit tests |

**Frontend** (`frontend/`)

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |

---

## API (short)

Authenticated HTTP routes require header `x-user-id`. Login does not.

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/login` | `{ email, password }` |
| `GET` | `/auth/me` | Current user |
| `GET` | `/documents` | `{ owned, shared }` |
| `POST` | `/documents` | Create |
| `GET` / `PATCH` / `DELETE` | `/documents/:id` | Read / update / delete |
| `POST` | `/documents/import` | New document from file |
| `POST` | `/documents/:id/import` | Append file to document |
| `GET` / `POST` | `/documents/:id/shares` | List / add share (owner) |
| `PATCH` / `DELETE` | `/documents/:id/shares/:shareId` | Update role / revoke |

Socket.IO (same origin as the API): connect with `auth: { userId }`, then `joinDocument` / `leaveDocument`. The server emits `presence` snapshots `{ users: [{ id, name }] }`. Document content is never sent on the socket.

Full route and schema detail is in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Import

Supported types: `.txt`, `.md`, `.docx`. Maximum size **5MB**.

- Documents list → **Upload file** creates a new owned document
- Editor → **Import file** appends to the open document (owner or editor)
