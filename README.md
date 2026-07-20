# MyChats

A RAG-powered PDF chat application built with Next.js 16. Upload a PDF, and the app extracts, chunks, and embeds its text into a vector database so you can have a natural language conversation grounded in the document's content.

## How It Works

```
User uploads PDF
       ↓
pdfjs-dist extracts text
       ↓
Text is chunked (500-char windows, 100-char overlap)
       ↓
OpenAI text-embedding-3-small (768-dim) → vector per chunk
       ↓
Chunks + vectors stored in Neon PostgreSQL + pgvector
       ↓
User asks a question
       ↓
Question is embedded → cosine similarity search → top 3 chunks
       ↓
Chunks injected as context → Gemma 4 31B generates a streamed answer
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| AI (Chat) | OpenRouter — `google/gemma-4-31b-it:free` |
| Embeddings | OpenRouter — `openai/text-embedding-3-small` (768 dimensions) |
| Database | Neon PostgreSQL + pgvector (HNSW index) |
| PDF Parsing | pdfjs-dist |
| Styling | Tailwind CSS 4, Lucide icons |
| Animation | Motion (Framer Motion successor) |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free tier works)
- An [OpenRouter](https://openrouter.ai) account with an API key

### 1. Clone and install

```bash
git clone <your-repo-url>
cd mychats
npm install
```

### 2. Set up environment variables

Create `.env.local`:

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database schema is created automatically on first request — no migrations needed.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Streaming chat endpoint
│   │   ├── health/route.ts            # GET /api/health — DB connectivity check
│   │   └── documents/
│   │       ├── upload/route.ts        # PDF upload, embed, store
│   │       ├── list/route.ts          # List uploaded documents
│   │       └── delete/route.ts        # Delete document + all chunks
│   ├── globals.css                    # Theme tokens, Tailwind config
│   ├── layout.tsx                     # Root layout with Error Boundary
│   └── page.tsx                       # Main client page
├── components/
│   ├── chat/
│   │   ├── chatwindow.tsx             # Chat orchestrator
│   │   ├── emptystate.tsx             # Upload prompt + suggestion pills
│   │   ├── sidebar.tsx                # Document list + upload
│   │   ├── messageinput.tsx           # Text input + send
│   │   ├── messagelist.tsx            # Scrollable message container
│   │   ├── messagebubble.tsx          # Single message (user/assistant)
│   │   └── codeblock.tsx              # Syntax-highlighted code blocks
│   ├── documents/
│   │   ├── fileupload.tsx             # Drag-and-drop PDF upload
│   │   └── documentlist.tsx           # Document list with delete
│   └── ui/
│       ├── error-boundary.tsx         # React Error Boundary with retry
│       ├── skeleton.tsx               # Loading skeleton
│       └── toast.tsx                  # Toast notifications
├── lib/
│   ├── db.ts                          # Neon client, schema, vector search
│   ├── openai-client.ts               # Shared OpenAI/OpenRouter client
│   ├── pdf-parser.ts                  # PDF text extraction + chunking
│   ├── rate-limit.ts                  # In-memory sliding-window rate limiter
│   └── retry.ts                       # Exponential backoff with jitter
├── services/
│   ├── ai.ts                          # Chat completions (streaming)
│   └── embeddings.ts                  # Single + batch embedding calls
└── types/
    └── chat.ts                        # Shared TypeScript types
```

## Key Features

### RAG Pipeline
- **PDF ingestion**: Extracts text via pdfjs-dist, chunks with 500-char windows and 100-char overlap
- **Batch embedding**: Chunks are embedded in a single API call (up to 2048 per batch) via OpenAI's embedding endpoint
- **Vector search**: pgvector HNSW index for fast cosine similarity lookup, returning top 3 relevant chunks per query
- **Streaming responses**: Chat answers stream token-by-token via Server-Sent Events

### Reliability
- **Retry with backoff**: All external API calls (chat, embeddings) retry up to 3 times with exponential backoff and jitter on transient errors (429, 503, timeouts, connection resets)
- **Upload cancellation**: AbortController lets users cancel in-flight uploads; cleanup on failure removes orphaned DB rows
- **Error boundary**: React Error Boundary wraps the entire app with a fallback UI and retry button
- **Health check**: `GET /api/health` verifies DB connectivity, useful for uptime monitoring

### Security
- **CSP headers**: Content-Security-Policy restricts script, style, connect, and frame sources
- **Additional headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **No powered-by header**: `poweredByHeader: false` in Next.js config
- **Input validation**: Upload limited to 20 MB / 500 chunks; chat messages capped at 10,000 characters and 50 messages per request
- **Error sanitization**: API errors return safe messages without internal details
- **Rate limiting**: In-memory sliding-window limiter per IP (20 requests/minute)

### UX
- **Per-document chat history**: Messages saved to localStorage keyed by document ID
- **Optimistic delete**: Documents disappear instantly on delete without a loading state
- **Hydration-safe**: `useSyncExternalStore` for all localStorage reads (null on server, value on client)
- **Responsive**: Collapsible sidebar on mobile, persistent on desktop
- **Theme**: Emerald green accent with WCAG-compliant contrast ratios in both light and dark modes

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send messages, get a streamed response |
| `POST` | `/api/documents/upload` | Upload a PDF for embedding |
| `GET` | `/api/documents/list` | List all uploaded documents |
| `DELETE` | `/api/documents/delete` | Delete a document and its chunks |
| `GET` | `/api/health` | Database health check |

## Database Schema

```sql
CREATE TABLE documents (
  id             TEXT PRIMARY KEY,
  content        TEXT NOT NULL,
  embedding      VECTOR(768) NOT NULL,
  document_id    TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  chunk_index    INTEGER NOT NULL,
  total_chunks   INTEGER NOT NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

-- B-tree index for fast document lookups and deletes
CREATE INDEX documents_document_id_idx
  ON documents (document_id);
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
