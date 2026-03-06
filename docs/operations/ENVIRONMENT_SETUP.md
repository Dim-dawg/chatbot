# Environment Setup

## 1. Prerequisites
*   **Node.js**: v20.x or higher.
*   **Python**: v3.10+
*   **MySQL**: v8.0+
*   **Ollama**: Installed and running locally (`ollama serve`).

## 2. Model Installation
LexiVault requires specific models to be pulled into Ollama:
```bash
ollama pull mistral:latest       # For reasoning/embeddings
ollama pull nomic-embed-text     # For optimized embeddings (optional)
ollama pull llama3:8b            # For logging analysis
```

## 3. Configuration (.env)
Create a `.env` file in the project root:

```ini
# --- Database ---
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=lexivault_user
MYSQL_PASSWORD=secure_password
MYSQL_DATABASE=lexivault_db

# --- AI Services ---
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=mistral:latest
OLLAMA_CHAT_MODEL=mistral:latest

# --- Security ---
AUTH_SECRET=super_long_random_string_for_jwt
AUTH_USERNAME=admin_fallback
AUTH_PASSWORD=admin_fallback_password
```

## 4. Initialization
1.  **Dependencies**: `npm install` and `pip install -r requirements.txt`.
2.  **Schema**: Run `npm run db:init` (assumes script exists) or source `sql/schema.sql`.
3.  **Start**: `npm run dev`.
