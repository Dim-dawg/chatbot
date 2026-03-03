# Monitoring & Alerting

## 1. Health Checks
- **Backend**: `GET /api/schema` serves as a basic health check for the Node.js server and database connection.
- **AI**: Ollama responsiveness monitored via `fetch` timeout during chat requests.

## 2. Resource Monitoring
System administrators should monitor:
- **RAM Usage**: High usage when Ollama is processing large embeddings.
- **CPU Load**: Spikes during vector search operations in FAISS.
- **Disk Space**: Monitor the size of the MySQL data folder and Ollama model storage.

## 3. Alerts
- **Critical**: Database connection loss triggers a persistent warning banner in the Web UI.
- **Performance**: API request durations exceeding 5 seconds should be flagged for optimization.
