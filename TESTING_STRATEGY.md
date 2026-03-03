# Testing Strategy

## 1. Core Principles
- **Data Privacy**: No real judicial data should be used in automated public tests.
- **Local Consistency**: Tests must pass against a local MySQL and Ollama environment.

## 2. Testing Tiers
### A. Unit Testing
- **Backend**: Test individual API routes with mock database responses.
- **Frontend**: Test React components using Vitest or Jest.

### B. AI/LLM Testing
- **Intent Verification**: Ensure Ollama correctly classifies `QUERY` vs `ACTION` for a variety of judicial prompts.
- **SQL Accuracy**: Verify that generated SQL correctly uses the core schema tables.

### C. Integration Testing
- **End-to-End**: Test the full flow from a chat message to a MySQL stored procedure execution.
- **Vector Search**: Verify that searching for a term in FAISS returns relevant `claim_number`s.

## 3. Manual QA
- Judges or court staff should perform User Acceptance Testing (UAT) to ensure the conversational tone is appropriate.
