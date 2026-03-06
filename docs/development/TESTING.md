# Testing & QA Strategy

## 1. Testing Tiers

### A. Unit Testing (Backend & Frontend)
*   **Tools**: Vitest (React), Jest (Node.js).
*   **Scope**: API route logic, Component rendering, utility functions.
*   **Privacy**: Use mock data only. Never use real case numbers in test suites.

### B. AI Intent Verification
*   **Goal**: Ensure Ollama correctly classifies `QUERY` vs `ACTION`.
*   **Method**: A suite of 50 standard judicial prompts ("Show me the Jones case", "Finalize case CV-2024-123").
*   **Pass Criteria**: 95% accuracy in intent detection.

### C. Integration Testing
*   **Scope**: Full flow from Chat Bubble -> Node.js -> SQL/Vector -> Response.
*   **Environment**: Local Docker containers mirroring production.

## 2. QA Guidelines

### A. AI Response Quality
*   **Grounding**: The AI must never hallucinate. Answers must cite specific database records.
*   **Tone**: Professional, judicial, and concise.

### B. UI/UX Standards
*   **Accessibility**: High contrast (WCAG AA).
*   **Responsiveness**: Optimized for 1920x1080 judicial workstations.

### C. Data Accuracy
*   **Validation**: Dashboard counts must match `SELECT COUNT(*)` queries on the live database.
