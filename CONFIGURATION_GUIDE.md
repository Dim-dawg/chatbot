# Configuration Guide

All configuration is managed via a local `.env` file in the project root.

## 1. MySQL Configuration
```text
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=casemanager
```

## 2. Ollama Configuration
Located in `server.ts` and `vector_service.py`.
- `OLLAMA_API_URL`: http://localhost:11434/api/generate
- `OLLAMA_MODEL`: lexivault-deepseek-r1:latest (Reasoning)
- `OLLAMA_EMBED_URL`: http://localhost:11434/api/embeddings
- `OLLAMA_EMBED_MODEL`: mistral:latest (Embeddings)

## 3. Vector Service Configuration
Located in `vector_service.py`.
- `INDEX_FILE`: the_chatbot.index
- `DIMENSION`: 4096 (for Mistral) or 1024 (for Gemma).

## 4. UI Customization
Tailand configuration is located in `tailwind.config.ts`. Primary theme color: **Emerald-500**.
