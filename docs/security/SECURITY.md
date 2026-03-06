# Security Policy

## 1. The Zero-Cloud Constitution
LexiVault is founded on the principle of **Jurisdictional Data Sovereignty**.
*   **Mandate**: Sensitive judicial data MUST NEVER leave the host environment.
*   **Prohibition**: No external APIs (OpenAI, Anthropic, Mistral Cloud) are permitted.
*   **Enforcement**: All AI reasoning is performed by local Ollama instances.

## 2. Encryption Standards
*   **Data at Rest**:
    *   **Database**: Encrypted volumes (LUKS) recommended for MySQL storage.
    *   **The Vault**: AES-256-GCM encryption for all PDF/binary files.
*   **Data in Transit**: TLS 1.3 for all internal and external traffic.

## 3. Vulnerability Management
*   **Reporting**: Report vulnerabilities directly to the System Administrator.
*   **Patching**: Security patches must be applied within 48 hours of release.
