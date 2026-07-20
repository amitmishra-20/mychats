# RAG Chat Application — Implementation Plan & Context

> **Read this file first.** It contains the full architecture, every design decision, and
> phase-by-phase instructions so any AI agent can pick up where we left off.

---

## 1. Project Overview

This is a **Next.js 16 chat application** with **RAG (Retrieval-Augmented Generation)**.
Users can upload PDFs and chat with an AI that answers **only based on the uploaded document content**.

**Tech Stack:**
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **LLM:** Google Gemini 2.5 Flash (free tier API — no Ollama, no GPU needed)
- **Embeddings:** Google Gemini Embedding API (`gemini-embedding-001`, 3072 dimensions)
- **Vector DB:** Neon Postgres + pgvector (free tier, serverless, scales to zero)
- **PDF Parsing:** pdfjs-dist (Mozilla's PDF.js)
- **Deployment:** Vercel (serverless, $0/month)

**Why this stack:**
- Gemini free tier = no API costs, no credit card needed
- Neon pgvector = serverless vector search, no Docker, no running server process
- Vercel = zero-config deployment, auto-scaling, free tier covers portfolio usage
- No Python, no ML frameworks — pure JavaScript/TypeScript

---

## 2. How RAG Works (Conceptual)

```
INDEXING (one-time per PDF):
  PDF → pdfjs-dist extracts text → Split into ~300-word chunks
  → Each chunk embedded via Gemini Embedding API → Stored in Neon Postgres

QUERYING (every user message):
  User question → Embedded via Gemini → Vector search in Neon (cosine similarity)
  → Top 3 most relevant chunks retrieved → Injected as system context
  → Gemini Flash generates answer constrained to that context only
```

**Key concepts:**
- **Embedding:** Converts text into a vector (list of 3072 numbers) where similar meanings produce similar numbers
- **Cosine similarity:** Measures how close two vectors are — higher = more semantically similar
- **Chunking:** Splitting large documents into small pieces so retrieval is precise
- **Context injection:** Prepending retrieved chunks to the system prompt so the LLM only answers from your data

---

## 3. Architecture Diagram

```
Browser (React)
  ├── ChatWindow (state: messages, selectedDocumentId, isLoading)
  │     ├── MessageList → MessageBubble (per message)
  │     ├── MessageInput (text input + Send/Stop)
  │     └── TypewriterEffect (welcome screen)
  ├── Sidebar
  │     ├── FileUpload (drag-and-drop PDF)
  │     └── DocumentList (list uploaded docs, select/delete)
  │
  └── fetch("/api/chat", { messages, documentId })
        ↓
Next.js Server (Vercel)
  ├── POST /api/chat
  │     ├── Embed user question (Gemini Embedding API)
  │     ├── Search top 3 chunks (Neon pgvector SQL)
  │     ├── Build system prompt with retrieved context
  │     └── Stream response (Gemini 2.5 Flash API)
  │
  ├── POST /api/documents/upload
  │     ├── Extract text from PDF (pdfjs-dist)
  │     ├── Chunk into ~300-word pieces
  │     ├── Embed each chunk (Gemini Embedding API)
  │     └── Store chunks + embeddings (Neon SQL INSERT)
  │
  ├── GET /api/documents/list
  │     └── SELECT DISTINCT document_id, file_name FROM documents
  │
  ├── DELETE /api/documents/delete
  │     └── DELETE FROM documents WHERE document_id = ?
  │
  └── POST /api/documents/init
        └── CREATE TABLE documents + pgvector extension + HNSW index

Neon Postgres (serverless)
  └── documents table
        id (TEXT PK), content (TEXT), embedding (VECTOR(3072)),
        document_id (TEXT), file_name (TEXT), chunk_index (INT),
        total_chunks (INT), created_at (TIMESTAMP)
        + HNSW index on embedding column
```

---

## 4. File Structure

```
mychats/
  app/
    layout.tsx                          # Root layout (fonts, metadata) — NO CHANGE
    page.tsx                            # Home page (Sidebar + ChatWindow) — MODIFY (pass doc state)
    globals.css                         # Tailwind + shadcn theme — NO CHANGE
    api/
      chat/route.ts                     # POST /api/chat — REWRITE (add RAG retrieval)
      documents/
        upload/route.ts                 # POST /api/documents/upload — NEW
        list/route.ts                   # GET /api/documents/list — NEW
        delete/route.ts                 # DELETE /api/documents/delete — NEW
        init/route.ts                   # POST /api/documents/init — NEW (one-time DB setup)
  components/
    chat/
      chatwindow.tsx                    # Main chat — tracks selectedDocumentId, streams responses, error banner, localStorage persistence
      sidebar.tsx                       # Sidebar — upload + doc list + RAG indicator
      messageinput.tsx                  # Textarea input with auto-resize
      messagelist.tsx                   # Message list — auto-scroll
      messagebubble.tsx                 # Message bubble — markdown rendering
      emptystate.tsx                    # Welcome screen with suggestions
      codeblock.tsx                     # Code block — NO CHANGE
    documents/
      fileupload.tsx                    # Drag-and-drop PDF upload
      documentlist.tsx                  # Document list with select/delete
    ui/
      typewriter-effect.tsx            # Welcome animation — NO CHANGE
  services/
    ai.ts                               # LLM service — REWRITE (Ollama → Gemini)
    embeddings.ts                       # Embedding service — NEW (Gemini Embedding API)
  types/
    chat.ts                             # TypeScript types — MODIFY (add Document interface)
  lib/
    utils.ts                            # shadcn cn() utility — NO CHANGE
    db.ts                               # Neon SQL client + schema — NEW
    pdf-parser.ts                       # PDF text extraction + chunking — NEW
  .env.local                            # Environment variables — NEW
  .gitignore                            # Add .env.local
  package.json                          # MODIFY (swap ollama for @google/genai)
  next.config.ts                        # NO CHANGE
  tsconfig.json                         # NO CHANGE
  RAG_IMPLEMENTATION_PLAN.md            # This file
```

---

## 5. Environment Variables

```env
# .env.local
GEMINI_API_KEY=your_key_from_aistudio.google.com
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**How to get these:**
1. **GEMINI_API_KEY:** Go to https://aistudio.google.com → Get API key → Create new key → Copy
2. **DATABASE_URL:** Go to Vercel Dashboard → Storage → Create Database → Select Neon → Connect → Copy connection string

---

## 6. Dependencies

**Install:**
```bash
npm install @google/genai @neondatabase/serverless pdfjs-dist uuid
npm install -D @types/uuid
```

**Remove:**
```bash
npm uninstall ollama
```

**Why each package:**
| Package | Purpose | Why not X? |
|---------|---------|------------|
| `@google/genai` | Official Google AI SDK (chat + embeddings) | No other free API offers both chat + embeddings |
| `@neondatabase/serverless` | Neon Postgres HTTP driver (works in serverless) | ChromaDB requires a running server process |
| `pdfjs-dist` | PDF text extraction (browser + server) | Only production-ready browser PDF parser |
| `uuid` | Generate unique document/chunk IDs | Built-in crypto.randomUUID() works too but uuid is explicit |

---

## 7. Database Schema

```sql
-- Run once via POST /api/documents/init
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,                    -- e.g. "uuid-chunk-0"
  content TEXT NOT NULL,                  -- The actual text chunk (~300 words)
  embedding VECTOR(3072) NOT NULL,        -- Gemini embedding vector
  document_id TEXT NOT NULL,              -- UUID linking all chunks of one PDF
  file_name TEXT NOT NULL,                -- Original PDF filename
  chunk_index INTEGER NOT NULL,           -- 0, 1, 2, ... within document
  total_chunks INTEGER NOT NULL,          -- Total chunks for this document
  created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops);
```

**Why HNSW index:** Without it, every query compares the question vector against ALL stored vectors (brute force). HNSW creates a graph index that makes similarity search O(log N) instead of O(N).

---

## 8. Phase-by-Phase Implementation

### Phase 0: Dependencies & Environment
- [x] `npm uninstall ollama`
- [x] `npm install @google/genai @neondatabase/serverless pdfjs-dist uuid`
- [x] `npm install -D @types/uuid`
- [x] Create `.env.local` with `GEMINI_API_KEY` and `DATABASE_URL` placeholders
- [x] Update `.gitignore` to include `.env.local`

### Phase 1: Database Setup
- [x] Create `lib/db.ts` — Neon SQL client + `initDatabase()` + `searchChunks()`
- [x] Create `app/api/documents/init/route.ts` — One-time table creation endpoint

### Phase 2: PDF Processing
- [x] Create `lib/pdf-parser.ts` — `extractTextFromPDF()` + `chunkText()`

### Phase 3: Embedding Service
- [x] Create `services/embeddings.ts` — `embedText()` + `embedTexts()` using Gemini Embedding API

### Phase 4: AI Service Rewrite
- [x] Rewrite `services/ai.ts` — Replace Ollama with Gemini 2.5 Flash streaming

### Phase 5: Document Upload API
- [x] Create `app/api/documents/upload/route.ts` — PDF upload → extract → embed → store

### Phase 6: Chat API with RAG
- [x] Rewrite `app/api/chat/route.ts` — Add retrieval before generation

### Phase 7: Document Management APIs
- [x] Create `app/api/documents/list/route.ts`
- [x] Create `app/api/documents/delete/route.ts`

### Phase 8: Frontend Components
- [x] Create `components/documents/fileupload.tsx`
- [x] Create `components/documents/documentlist.tsx`
- [x] Modify `components/chat/sidebar.tsx` — Add upload + doc list
- [x] Modify `components/chat/chatwindow.tsx` — Track selectedDocumentId
- [x] Modify `app/page.tsx` — Wire up document state between Sidebar and ChatWindow

### Phase 9: Types Update
- [x] Modify `types/chat.ts` — Add Document interface

### Phase 10: Deployment
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Add env vars in Vercel dashboard
- [ ] Enable pgvector in Neon dashboard
- [ ] Test deployment

---

## 9. Current Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | DONE | ollama removed, @google/genai + @neondatabase/serverless + pdfjs-dist + uuid installed, .env.local created |
| Phase 1 | DONE | lib/db.ts (Neon client + searchChunks) + /api/documents/init route created |
| Phase 2 | DONE | lib/pdf-parser.ts (extractTextFromPDF + chunkText) created |
| Phase 3 | DONE | services/embeddings.ts (embedText + embedTexts via Gemini) created |
| Phase 4 | DONE | services/ai.ts rewritten: Ollama → Gemini 2.5 Flash with context parameter |
| Phase 5 | DONE | /api/documents/upload route created (PDF → extract → embed → store) |
| Phase 6 | DONE | /api/chat route rewritten with RAG retrieval (embed → search → inject context) |
| Phase 7 | DONE | /api/documents/list + /api/documents/delete routes created |
| Phase 8 | DONE | FileUpload + DocumentList components, Sidebar + ChatWindow + page.tsx modified |
| Phase 9 | DONE | types/chat.ts updated with Document interface |
| Phase 10 | PENDING | No deployment config |

---

## 10. Known Issues from Current Codebase

1. ~~`compnents/` is misspelled~~ — FIXED. Directory renamed to `components/`, all imports updated.
2. **`Conversation` type is unused** — Defined in `types/chat.ts` but never imported anywhere.
3. ~~Sidebar is non-functional~~ — FIXED. Sidebar now has working upload, document list, and RAG indicator.
4. **No input validation** — API routes don't validate message structure.
5. ~~No error UI~~ — FIXED. ChatWindow shows error banner; EmptyState component added.
6. **Message truncation** — `chatwindow.tsx` silently slices to last 20 messages with no token awareness.
7. **No user authentication** — Any visitor can upload and chat. User flagged this as a concern but not yet implemented.
8. **No deployment config** — Not yet pushed to GitHub or Vercel.

---

## 11. Session-Based Rate Limiting

No user auth needed. Cookie-based session ID tracks request counts per visitor.

**Limits:**
| Action | Limit | Window |
|--------|-------|--------|
| Chat messages | 20 | 1 hour (sliding) |
| PDF uploads | 5 | 24 hours (sliding) |

**Implementation:** `lib/rate-limit.ts`
- Generates a random session ID, stored in `rl_session` cookie (`httpOnly`, `secure` in prod, 24h expiry)
- In-memory `Map<sessionId, { chats, uploads, windowStart }>` tracks counts
- Sliding window: counters reset when the window expires
- Returns `429 Too Many Requests` with `Retry-After` header + human-readable message

**Tradeoffs:**
- Resets on serverless cold start (acceptable — free tier itself resets daily)
- Not per-user-authenticated — any visitor gets their own session
- No database cost for tracking

---

## 12. localStorage Persistence

- **Selected document:** Saved to `localStorage("selectedDocumentId")` in `page.tsx`. Restored on mount via lazy initializer.
- **Chat messages:** Saved to `localStorage("chatMessages")` in `chatwindow.tsx`. Restored on mount via lazy initializer. Cleared when user switches documents or starts new chat.
- **Note:** This is per-browser, not per-user. Clearing browser data wipes everything. For a portfolio project this is acceptable.

---

## 13. How to Continue This Project

1. **Read this file first** to understand the full context
2. **Check "Current Progress"** section above to see which phases are done
3. **Continue from the next pending phase**
4. **After completing a phase**, update the progress table in this file
5. **Run `npm run lint`** after each phase to catch errors

---

## 14. API Reference

### POST /api/chat
**Request:** `{ messages: Message[], documentId?: string }`
**Response:** Streaming text/plain (SSE-style chunks)

### POST /api/documents/upload
**Request:** FormData with `file` field (PDF)
**Response:** `{ documentId, fileName, chunks, pages }`

### GET /api/documents/list
**Response:** `[{ document_id, file_name, total_chunks, uploaded_at }]`

### DELETE /api/documents/delete
**Request:** `{ documentId: string }`
**Response:** `{ success: true }`

### POST /api/documents/init
**Response:** `{ success: true }` (creates tables)

---

## 15. Free Tier Limits Reference

| Service | Free Limit | Enough For |
|---------|-----------|------------|
| Gemini Chat | 5-10 RPM, ~1000 RPD | Demo/portfolio traffic |
| Gemini Embeddings | 100 RPM, 1K RPD | Indexing hundreds of PDFs |
| Neon Postgres | 512MB, 100 compute-hrs/mo | ~80K vectors |
| Vercel | 100GB bandwidth | Portfolio project traffic |

---

## 16. Deployment Checklist

- [ ] Google AI Studio account created, API key obtained
- [ ] Neon database created via Vercel Marketplace
- [ ] pgvector extension enabled in Neon dashboard
- [ ] `.env.local` configured with both keys
- [ ] `POST /api/documents/init` called once to create tables
- [ ] Pushed to GitHub
- [ ] Connected to Vercel
- [ ] Env vars added in Vercel dashboard
- [ ] Test upload + chat flow on deployed URL
