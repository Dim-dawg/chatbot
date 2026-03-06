# Maintenance Guide

## 1. Health Monitoring
### API Health Check
*   **Endpoint**: `GET /api/ai/health`
*   **Response**: Status of MySQL, FAISS, and Ollama.
*   **Action**: If `ollama: offline`, restart the Ollama service.

### Resource Watch
*   **RAM**: High usage (>80%) indicates vector index pressure. Consider archiving old cases.
*   **Disk**: Monitor `/backend/data/vault` growth.

## 2. Vector Index Maintenance
### Re-indexing
If the semantic search becomes out of sync with the database (e.g., after a bulk SQL update), force a re-index.
```bash
# Trigger via API (Admin only)
POST /api/admin/maintenance/reindex
```
This triggers the `ingest_cases.py` script to scan all active cases and regenerate embeddings.

## 3. Database Maintenance
*   **Orphans**: Run the "Orphan Check" tool in the Admin Dashboard to find files in the Vault that have no database record.
*   **Optimize**: Run `OPTIMIZE TABLE data_casefiles;` monthly to reclaim space.
