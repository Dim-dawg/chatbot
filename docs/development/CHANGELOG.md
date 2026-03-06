# Changelog

## [1.1.0] - 2026-03-06
### Security Hardening
- **Zero-Cloud Enforcement**: Removed all legacy references to external Mistral APIs. The system now runs exclusively on local Ollama instances.
- **Role-Based Access**: Consolidated permission logic into a single `security_rights` database table.

### Architecture
- **Triple-Link**: Formalized the synchronization protocol between MySQL, Vault, and FAISS.
- **Containerization**: Standardized deployment on Docker Compose.

## [1.0.0] - 2024-10-24
### Added
- **Judicial Command Center**: Unified UI with Dashboard and Chat.
- **Global Search**: Searchable access to 21,000+ records.
- **Vector Search**: FAISS Python service integration.
- **Live Data Sync**: Real-time MySQL synchronization.
