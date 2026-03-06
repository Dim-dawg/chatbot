# LexiVault Documentation

**LexiVault** is a local-first judicial intelligence platform designed for the Belize Senior Courts. It strictly adheres to a **Zero-Cloud** security model, ensuring that sensitive judicial data never leaves the local infrastructure.

## Documentation Map

### 🏗️ Architecture
*   [**System Architecture**](architecture/SYSTEM_ARCHITECTURE.md): The "Triple-Link" synchronization (MySQL + Vault + FAISS).
*   [**AI Pipeline**](architecture/AI_ARCHITECTURE.md): Local LLM reasoning, embedding generation, and vector search.

### 💾 Database
*   [**Schema**](database/DATABASE_SCHEMA.md): Definitions of tables, views, and columns.
*   [**Architecture**](database/DATABASE_ARCHITECTURE.md): Entity relationships and data lifecycle.

### 🔌 API
*   [**API Specification**](api/API_SPECIFICATION.md): REST endpoints, authentication, and request/response formats.

### 🔒 Security
*   [**Security Policy**](security/SECURITY.md): Zero-Cloud mandate, encryption standards, and audit trails.
*   [**Access Control**](security/ACCESS_CONTROL.md): RBAC, authentication flows, and permissions matrix.
*   [**Data Retention**](security/DATA_RETENTION_POLICY.md): Legal storage duration and deletion protocols.

### ⚙️ Operations
*   [**Deployment**](operations/DEPLOYMENT_GUIDE.md): Docker orchestration and production setup.
*   [**Environment Setup**](operations/ENVIRONMENT_SETUP.md): Configuration variables and prerequisites.
*   [**Maintenance**](operations/MAINTENANCE_GUIDE.md): Re-indexing, cache clearing, and health checks.
*   [**Logging**](operations/LOGGING_STRATEGY.md): System monitoring and audit logs.
*   [**Backup & Recovery**](operations/BACKUP_AND_RECOVERY.md): Disaster recovery procedures.

### 💻 Development
*   [**Testing**](development/TESTING.md): QA strategies and test suites.
*   [**Error Handling**](development/ERROR_HANDLING.md): Standardized error codes and troubleshooting.
*   [**Changelog**](development/CHANGELOG.md): Version history.

### 📅 Project
*   [**Roadmap**](project/ROADMAP.md): Future features and milestones.
*   [**PRD**](project/PRD.md): Product Requirements Document.
