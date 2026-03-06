# Risk Register

## 1. Local AI Performance
- **Risk**: Ollama may respond slowly on low-end hardware.
- **Impact**: Frustration for judges using the assistant.
- **Mitigation**: Recommend minimum 32GB RAM and dedicated GPU for production hosts.

## 2. LLM Hallucination
- **Risk**: AI might misinterpret a case summary or outcome.
- **Impact**: Incorrect information provided to a judge.
- **Mitigation**: Strictly ground the AI's final response in the SQL query results provided in the prompt.

## 3. Data Integrity
- **Risk**: An incorrect command could accidentally close the wrong case.
- **Impact**: Database corruption or legal errors.
- **Mitigation**: Implement confirmation dialogs for all data-changing actions.

## 4. System Sync
- **Risk**: The FAISS index could become out of sync with the MySQL database.
- **Impact**: Semantic search results may point to non-existent or updated cases.
- **Mitigation**: Implement a daily re-ingestion job to refresh the vector index.
