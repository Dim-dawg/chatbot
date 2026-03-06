# AI Architecture

## 1. Local-First Intelligence
LexiVault operates under a strict **Zero-Cloud** policy. All Artificial Intelligence operations—including embedding generation, semantic search, and natural language reasoning—are performed locally using **Ollama**. No data is ever sent to external APIs like OpenAI or Anthropic.

## 2. The AI Pipeline

### A. Ingestion (Vectorization)
1.  **Extraction**: Text is extracted from uploaded PDFs using Python (`PyPDF2` or `OCR`).
2.  **Chunking**: Text is split into overlapping segments (e.g., 1000 characters with 200 overlap).
3.  **Embedding**: Each chunk is sent to the local Ollama instance (model: `mistral:latest` or `nomic-embed-text`).
4.  **Indexing**: The resulting 768-dimensional vector is stored in the FAISS index, linked to the MySQL `chunk_id`.

### B. Retrieval (RAG - Retrieval Augmented Generation)
1.  **Query Analysis**: The user's question is analyzed to determine if it is a specific lookup (SQL) or a conceptual question (Vector).
2.  **Hybrid Search**:
    *   **Keyword**: MySQL `LIKE` or Full-Text search.
    *   **Semantic**: The query is embedded via Ollama, and FAISS finds the nearest neighbor vectors.
3.  **Fusion**: Results are merged using Reciprocal Rank Fusion (RRF).

### C. Reasoning (Generation)
1.  **Context Construction**: Retrieved documents and metadata are formatted into a system prompt.
2.  **Inference**: The prompt is sent to the local Ollama reasoning model (e.g., `mistral:latest` or `llama3`).
3.  **Streaming**: The response is streamed back to the frontend token-by-token.

## 3. Models & Configuration

| Function | Model | Provider | Port |
| :--- | :--- | :--- | :--- |
| **Reasoning** | `mistral:latest` / `llama3` | Local Ollama | 11434 |
| **Embedding** | `nomic-embed-text` | Local Ollama | 11434 |
| **Logging Analysis** | `llama3.1:8b` | Local Ollama | 11434 |

## 4. Privacy Guarantees
*   **Isolation**: The AI service runs in a container with no internet access (outbound traffic blocked via Docker network rules).
*   **Ephemeral Context**: Prompts and contexts are assembled in memory and discarded after the response is generated.
*   **Audit**: All AI interactions are logged in the `ai_chat_events` log (sanitized) for compliance.
