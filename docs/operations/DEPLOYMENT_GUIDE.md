# Deployment Guide

## 1. Containerized Deployment (Recommended)
LexiVault is optimized for Docker Compose.

### Prerequisites
*   Docker & Docker Compose installed.
*   NVIDIA Container Toolkit (if using GPU).

### Orchestration
Create a `docker-compose.yml`:
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - MYSQL_HOST=db
      - OLLAMA_URL=http://host.docker.internal:11434
    depends_on:
      - db
      - vector

  vector:
    image: python:3.9
    command: python vector_service.py
    ports: ["8000:8000"]

  db:
    image: mysql:8.0
    volumes:
      - db_data:/var/lib/mysql
```

### Steps
1.  **Build**: `docker-compose build`
2.  **Run**: `docker-compose up -d`
3.  **Verify**: Check `http://localhost:3000/api/ai/health`.

## 2. Bare Metal Deployment (Legacy)
For environments without Docker, use PM2.

```bash
# Frontend Build
npm run build

# Start Backend
pm2 start server.ts --name lexivault-api --interpreter tsx

# Start Vector Service
pm2 start vector_service.py --name lexivault-vector --interpreter python3
```
