# Backup & Recovery

## 1. Backup Strategy
LexiVault requires two distinct backup streams to ensure recoverability.

### A. Relational Metadata (MySQL)
*   **Frequency**: Daily (Incremental), Weekly (Full).
*   **Tool**: `mysqldump`.
```bash
mysqldump -u root -p lexivault_db > backup_YYYY_MM_DD.sql
```

### B. Encrypted Vault (Files)
*   **Frequency**: Daily sync (Rsync/Robocopy) to cold storage.
*   **Target**: `/backend/data/vault`.
*   **Note**: These files are encrypted. Backing them up is safe, but the keys (in `.env`) must be backed up separately and securely.

## 2. Disaster Recovery
### Scenario: Total Server Failure
1.  **Provision** new hardware.
2.  **Restore** `.env` file (Critical: contains encryption keys).
3.  **Restore** MySQL dump.
4.  **Restore** Vault files.
5.  **Re-run** FAISS re-indexing (`ingest_cases.py`) to rebuild the search index from the restored data.
