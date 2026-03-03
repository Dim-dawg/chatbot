# Maintenance Guide

## 1. Database Optimization
Weekly: Run `OPTIMIZE TABLE data_casefiles` to ensure high-performance searching.

## 2. Re-indexing FAISS
Every 24 hours: Run `python ingest_cases.py` to ensure the "Smart Librarian" has all the latest case summaries memorized.

## 3. Ollama Updates
Check for model updates regularly:
```bash
ollama pull lexivault-deepseek-r1:latest
```

## 4. Log Management
Periodically clear or rotate server console logs to prevent excessive disk usage.

## 5. View Verification
If dashboard numbers look incorrect, verify the `ai_` prefixed views in MySQL to ensure they are still pulling correctly from the primary tables.
