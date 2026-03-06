# Product Requirements Document (PRD)

## 1. Mission
To provide the Belize Senior Courts with a secure, local-first judicial intelligence platform that enhances decision-making speed without compromising data sovereignty.

## 2. User Personas
*   **The Judge**: Needs instant access to case history and semantic search for precedents.
*   **The Clerk**: Needs efficient tools for data entry and document uploading.
*   **The Registrar**: Needs oversight on court performance and file locations.

## 3. Key Requirements
### A. Functional
*   **Unified Search**: Find cases by ID, Name, or "Meaning" (Vector).
*   **Conversational Action**: "Finalize this case" should trigger the correct database procedure.
*   **Dashboard**: Real-time visualization of court metrics.

### B. Non-Functional
*   **Security**: Zero external network traffic for AI.
*   **Latency**: Dashboard load < 500ms.
*   **Uptime**: 99.9% availability during court hours.

## 4. Constraints
*   **Hardware**: Must run on on-premise servers (standard CPUs).
*   **Compliance**: Must adhere to Belizean judicial data protection laws.
