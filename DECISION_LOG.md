# Decision Log

## [2024-10-24] - Naming
**Decision**: Use "The chatbot" as the primary application name.
**Rationale**: Simplicity and clarity for non-technical judicial users.

## [2024-10-24] - UI Layout
**Decision**: Single-page Command Center with Sidebar Chat Widget and Full-screen Dashboard.
**Rationale**: Provides the best combination of data visibility and interactive assistance.

## [2024-10-24] - Vector Search
**Decision**: Use FAISS with a Python FastAPI microservice.
**Rationale**: High-performance semantic search that can be easily integrated with the Node.js backend while remaining entirely local.

## [2024-10-24] - Data Strategy
**Decision**: Eliminate all simulation and mock data.
**Rationale**: To ensure the system is always reliable and trusted by users for real case management.
