# Deployment Guide

This guide describes how to deploy "The chatbot" to a production-like local network.

## 1. Production Build
```bash
# Build the React frontend
npm run build
```
The compiled files will be in the `/dist` folder. The Node.js server is already configured to serve these files statically when `NODE_ENV=production`.

## 2. Process Management (PM2)
We recommend using PM2 to keep the services running.
```bash
# Start Backend
pm2 start server.ts --name the-chatbot-backend --interpreter tsx

# Start Vector Service
pm2 start vector_service.py --name the-chatbot-vector --interpreter python
```

## 3. Network Configuration
Ensure the host machine is accessible within the secure court network.
- **Port 3000**: Main Web UI and API.
- **Port 8000**: Vector Service (Internal only).
- **Port 11434**: Ollama API (Internal only).

## 4. Scaling Considerations
- **LLM Performance**: If response times are slow, consider a machine with a dedicated GPU for Ollama.
- **Vector Search**: FAISS is high-performance and can handle millions of records on a standard CPU.
