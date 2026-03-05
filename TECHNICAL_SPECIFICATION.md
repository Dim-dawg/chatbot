# Technical Specification

## 1. Backend Service (Node.js)
- **Runtime**: Node.js v18+
- **Database Driver**: `mysql2/promise` for asynchronous SQL operations.
- **AI Orchestration**: Direct `fetch` calls to the external Mistral AI API (`https://api.mistral.ai/v1/chat/completions`).
- **Development Tool**: `tsx` for running TypeScript server directly.

## 2. Frontend Application (React)
- **Build Tool**: Vite.
- **State Management**: React `useState` and `useEffect` for local state.
- **Data Visualization**: Custom SVG components for high-performance area charts.
- **Icons**: `lucide-react`.
- **Animation**: `motion/react` (Framer Motion) for widget and panel transitions.

## 3. Vector Service (Python)
- **Framework**: FastAPI with Uvicorn.
- **Search Engine**: FAISS (Facebook AI Similarity Search) - `faiss-cpu`.
- **Logic**: Maps FAISS internal IDs to MySQL `claim_number`.
- **Port**: Default 8000.

## 4. AI Models & Services
- **Reasoning**: `mistral-large-latest` (via Mistral AI API).
- **Embeddings**: `mistral:latest` (via local Ollama instance).
- **Logging**: `llama3.1:8b` (via local Ollama instance).
- **PDF Extraction**: Managed via Python `PyPDF2` or similar (in development).

## 5. Performance Targets
- **SQL Generation**: < 2 seconds.
- **Dashboard Load**: < 500ms for metadata views.
- **Search Latency**: < 100ms for 21,000 records using MySQL indexes.
