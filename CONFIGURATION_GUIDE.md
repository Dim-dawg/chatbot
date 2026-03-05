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

## 2. Mistral AI Configuration
The following are required in your `.env` file for reasoning and chat.
```text
MISTRAL_API_KEY="your_mistral_api_key"
MISTRAL_MODEL_NAME="mistral-large-latest"
```

## 3. Ollama Configuration (Local Services)
The following models and endpoints are configured in `server.ts` and `vector_service.py` for local AI tasks.
- **Logger Model**: `OLLAMA_LOGGER_MODEL` (defaults to `llama3.1:8b` in `server.ts`).
- **Embedding Model**: `OLLAMA_EMBED_MODEL` (e.g., `mistral:latest` in `vector_service.py`).
- **Ollama URL**: `OLLAMA_URL` (defaults to `http://localhost:11434` in `server.ts`).

## 4. Vector Service Configuration
Located in `vector_service.py`.
- `INDEX_FILE`: the_chatbot.index
- `DIMENSION`: 4096 (for Mistral) or 1024 (for Gemma).

## 4. UI Customization
Tailand configuration is located in `tailwind.config.ts`. Primary theme color: **Emerald-500**.
