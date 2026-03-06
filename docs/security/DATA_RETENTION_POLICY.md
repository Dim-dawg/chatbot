# Data Retention Policy

## 1. Metadata Retention
*   **Active Cases**: Indefinite retention in MySQL.
*   **Closed Cases**: Metadata retained indefinitely for historical search.
*   **Audit Logs**: Retained for 7 years to comply with judicial oversight.

## 2. Binary File Retention
*   **Source Documents**: Encrypted PDFs are retained for the duration of the case + 10 years.
*   **Deletion**: "Hard Delete" performs a cryptographic shred (overwriting the file on disk).

## 3. Vector Index Lifecycle
*   **Active**: Vectors live in RAM/Disk via FAISS.
*   **Purge**: Vectors are removed when a case is Archived or Sealed.
*   **Re-indexing**: The index can be completely rebuilt from source metadata at any time.
