# Security Policy

## Data Sovereignty
"The chatbot" is built on the principle of jurisdictional data sovereignty. **Sensitive judicial data must never leave the local environment.**

## Local-Only Intelligence
- **LLMs**: All reasoning and embeddings are performed using local Ollama instances.
- **External APIs**: No external LLM APIs (OpenAI, Anthropic, etc.) are allowed.
- **Tracking**: No telemetry or usage tracking is implemented.

## Database Security
- **Credentials**: Stored in a local `.env` file. Never commit this file to version control.
- **Views**: Use MySQL views to abstract and protect underlying table structures.
- **Stored Procedures**: Critical updates are handled by stored procedures to ensure data integrity and prevent SQL injection.

## Reporting a Vulnerability
If you discover a security vulnerability, please report it immediately to the system administrator. Do not open a public issue.
