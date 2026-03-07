# HelixCareAI RAG (Local AI) Setup

Production-ready RAG using **Ollama** (llama3) and **sentence-transformers** (all-MiniLM-L6-v2) via a Python embedding service.

## Prerequisites

- **PostgreSQL** with pgvector extension
- **Python 3.10+** (for embedding service)
- **Ollama** installed and running (for LLM)
- **Node.js** (backend)

## 1. PostgreSQL

Ensure the schema is applied (includes `therapy_embeddings` and vector extension):

```bash
cd backend
npm run db:schema
```

Or run manually:

```bash
psql $DATABASE_URL -f database/schema.sql
```

## 2. Python Embedding Service

Uses **sentence-transformers** with model **all-MiniLM-L6-v2** (384 dimensions).

```bash
cd embedding-service
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

If you don’t use a venv, install with `pip install -r requirements.txt` then run:

```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

- **Endpoint:** `POST http://localhost:8000/embed`
- **Body:** `{ "text": "therapy notes" }`
- **Response:** `{ "embedding": [ ... 384 floats ... ] }`
- **Health:** `GET http://localhost:8000/health`

First run will download the model (~80MB).

## 3. Ollama

Install from [ollama.ai](https://ollama.ai), then:

```bash
ollama pull llama3
ollama serve   # or start Ollama app; usually runs on :11434
```

- **API:** `POST http://localhost:11434/api/generate`
- **Model:** `llama3` (set `OLLAMA_MODEL` in env to override)

## 4. Node Backend

```bash
cd backend
npm install
```

Optional env (in `.env` or `.env.development.local`):

- `EMBEDDING_SERVICE_URL=http://localhost:8000`
- `OLLAMA_URL=http://localhost:11434`
- `OLLAMA_MODEL=llama3`

Start the server:

```bash
npm run dev
```

## 5. Run Order

1. Start **PostgreSQL**
2. Start **embedding service** (Python): `cd embedding-service && uvicorn main:app --port 8000`
3. Start **Ollama**: `ollama serve` and `ollama pull llama3`
4. Start **Node server**: `cd backend && npm run dev`

## API: AI Chat (RAG)

**POST** `/api/ai/chat`  

To use this from the HelixCareAI app’s AI chat screen, call this endpoint instead of `/api/chat/ask` (e.g. in `chat_repository.dart` use `'/api/ai/chat'` with the same body: `childId`, `question`).

**Headers:** `Authorization: Bearer <JWT>`

**Request:**

```json
{
  "childId": "uuid-of-the-child",
  "question": "How did the child perform last week?"
}
```

**Response:**

```json
{
  "answer": "The child showed improvement in communication..."
}
```

Flow: question is embedded → top 5 similar therapy notes are retrieved from `therapy_embeddings` → context + question sent to Ollama → answer returned.

## Session Integration

When a therapy session is **created** or **updated** (with `notes_text`):

1. The backend calls the embedding service to get a 384-dim vector for the notes.
2. The note and embedding are stored in `therapy_embeddings` (one row per session; updated on session update).

If the embedding service is down, session create/update still succeeds; the RAG sync is logged and skipped.

## Project Structure (AI)

```
backend/src/modules/ai/
  embeddingService.ts    # Calls Python POST /embed
  vectorSearchService.ts # SELECT from therapy_embeddings ORDER BY embedding <-> $2
  ollamaService.ts       # Calls Ollama /api/generate
  ragService.ts          # askChildAssistant(childId, question)
  therapyEmbeddingStorage.ts  # storeSessionNotes(sessionId, childId, noteText)
  aiController.ts        # POST /chat handler
  aiRoutes.ts            # Mounted at /api/ai
```

```
embedding-service/
  main.py                # FastAPI app, POST /embed, model all-MiniLM-L6-v2
  requirements.txt       # sentence-transformers, fastapi, uvicorn
```

## Troubleshooting

- **Empty answer:** Ensure the child has sessions with notes; RAG needs rows in `therapy_embeddings`.
- **502 from /api/ai/chat:** Check that the embedding service (port 8000) and Ollama (port 11434) are running.
- **Embedding dimension error:** Python service must use all-MiniLM-L6-v2 (384). Do not mix with OpenAI embeddings (1536).
