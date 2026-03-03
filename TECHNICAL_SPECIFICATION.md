# Technical Specification

## 1. Backend Service (Node.js)
- **Runtime**: Node.js v18+
- **Database Driver**: `mysql2/promise` for asynchronous SQL operations.
- **AI Orchestration**: Direct fetch calls to local Ollama API (`/api/generate`).
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

## 4. AI Models (Ollama)
- **Reasoning**: `lexivault-deepseek-r1:latest`
- **Embeddings**: `mistral:latest`
- **PDF Extraction**: Managed via Python `PyPDF2` or similar (in development).

## 5. Performance Targets
- **SQL Generation**: < 2 seconds.
- **Dashboard Load**: < 500ms for metadata views.
- **Search Latency**: < 100ms for 21,000 records using MySQL indexes.
